/**
 * aiClient.js
 * Talks to the CEYLO backend, which holds the LLM provider keys and the destination dataset.
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
 * Ask the LLM for a JSON response.
 * @param {string} system - system prompt
 * @param {{role: 'user'|'assistant', content: string}[]} messages - conversation so far
 * @returns {Promise<object>} parsed JSON from the model
 */
export async function chatJSON(system, messages) {
  const data = await postJSON('/api/chat', { system, messages });
  return data.result;
}

/** Top destinations for a mood: 5-10 items, one per trip day. */
export async function recommendDestinations({ mood, days, destination }) {
  const data = await postJSON('/api/recommend', { mood, days, destination }, 15000);
  return data.top_matches || [];
}
