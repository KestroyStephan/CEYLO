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

/** Wake the backend early (Render free tier sleeps when idle) so the first chat is fast. */
export function warmUpBackend() {
  fetch(`${API_BASE_URL}/api/health`).catch(() => {});
}

/** Current weather and a 7-day forecast (Open-Meteo through the backend). */
export async function getWeather({ lat, lon, place }) {
  const qs = lat != null && lon != null
    ? `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    : `place=${encodeURIComponent(place || '')}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/weather?${qs}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
