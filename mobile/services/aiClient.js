/**
 * aiClient.js
 * Talks to the CEYLO backend, which runs the trained CEYLO models (concierge intent
 * classifier, recommender, eco scorer). No external AI service or API key is involved.
 */
import { auth } from '../firebaseConfig';
import { API_BASE_URL } from '../config';

async function authHeaders() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJSON(path, body, timeoutMs = 25000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Backend ${path} HTTP ${res.status}: ${text.slice(0, 120)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * One concierge chatbot turn.
 * @param {string} message - what the traveller typed
 * @param {object} state - trip profile so far ({ destination, days, budget, mood, awaiting })
 * @returns {Promise<{resp: string, extractedState: object, isReady: boolean, ui_options: string[], recommendations?: object[]}>}
 */
export async function chatTurn(message, state) {
  // Long timeout: the Render free tier can take up to a minute to wake from sleep
  const data = await postJSON('/api/chat', { message, state }, 60000);
  return data.result;
}

/** Facts, nearby places and the eco model's sustainability breakdown for a destination. */
export async function destinationInsights({ id, name, lat, lon, category, province }) {
  return postJSON('/api/insights', { id, name, lat, lon, category, province }, 15000);
}

/**
 * Ranked destinations from the trained recommender (5-10 items, one per trip day), using the
 * weather forecast, the traveller's position and the RQ3 recommendation strategy.
 * @returns {Promise<{top_matches: object[], modelVersion: string, strategy: string, weather: object|null}>}
 */
export async function recommendDestinations(params) {
  return postJSON('/api/recommend', params, 30000);
}

/** Asks the backend to text the emergency desk about an SOS (FR-041). Fire and forget. */
export function sendSosSms(alertId) {
  if (!alertId || !auth.currentUser) return;
  postJSON('/api/sos-sms', { alertId }, 20000)
    .catch(e => console.log('SOS SMS not sent by the server:', e.message));
}

/** Pushes a booking update to the other party (Sprint 3). Fire and forget. */
export function notifyBooking(bookingId) {
  if (!bookingId || !auth.currentUser) return;
  postJSON('/api/notify-booking', { bookingId }, 20000)
    .catch(e => console.log('Booking notification not sent:', e.message));
}

/** Wake the backend early (Render free tier sleeps when idle) so the first chat is fast. */
export function warmUpBackend() {
  fetch(`${API_BASE_URL}/api/health`).catch(() => {});
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Same WMO code groups as backend/ai/weather.js
function describeCode(code) {
  if (code === 0) return { label: 'Clear', icon: 'weather-sunny' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'weather-partly-cloudy' };
  if (code === 3) return { label: 'Cloudy', icon: 'weather-cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'weather-fog' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'weather-rainy' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'weather-pouring' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'weather-rainy' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'weather-lightning-rainy' };
  return { label: 'Cloudy', icon: 'weather-cloudy' };
}

/** Open-Meteo straight from the phone: used when the backend cannot get weather. */
async function weatherFromPhone(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${Number(lat).toFixed(3)}&longitude=${Number(lon).toFixed(3)}` +
    '&current=temperature_2m,precipitation,weather_code,wind_speed_10m' +
    '&daily=weather_code,precipitation_probability_max,temperature_2m_max,temperature_2m_min' +
    '&timezone=Asia%2FColombo&forecast_days=7';
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current || {};
  const d = data.daily || {};
  const rainy = (code, p) => code >= 51 || (p ?? 0) >= 60;
  return {
    current: { temperatureC: c.temperature_2m, precipitationMm: c.precipitation, windKmh: c.wind_speed_10m, code: c.weather_code, ...describeCode(c.weather_code), rainy: rainy(c.weather_code, 0) },
    daily: (d.time || []).map((date, i) => ({
      date, code: d.weather_code[i], ...describeCode(d.weather_code[i]),
      maxC: d.temperature_2m_max[i], minC: d.temperature_2m_min[i],
      rainProbability: d.precipitation_probability_max[i],
      rainy: rainy(d.weather_code[i], d.precipitation_probability_max[i]),
    })),
    source: 'open-meteo (phone)',
  };
}

/** Current weather and a 7-day forecast: through the backend, else directly from the phone. */
export async function getWeather({ lat, lon, place }) {
  const qs = lat != null && lon != null
    ? `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    : `place=${encodeURIComponent(place || '')}`;
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/weather?${qs}`, 10000);
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (lat == null || lon == null) throw e;
    return weatherFromPhone(lat, lon);
  }
}
