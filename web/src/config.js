// CEYLO backend (Render). Override with VITE_BACKEND_URL; local dev talks to a local server.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : 'https://ceylo.onrender.com');
