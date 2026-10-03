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
  const data = await postJSON('/api/chat', { message, state }, 15000);
  return data.result;
}

/** Facts, nearby places and the eco model's sustainability breakdown for a destination. */
export async function destinationInsights({ id, name, lat, lon, category, province }) {
  return postJSON('/api/insights', { id, name, lat, lon, category, province }, 15000);
}

/** Top destinations for a mood: 5-10 items, one per trip day. */
export async function recommendDestinations({ mood, days, destination }) {
  const data = await postJSON('/api/recommend', { mood, days, destination }, 15000);
  return data.top_matches || [];
}
