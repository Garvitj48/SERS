// dispatch.js — SERS API Communication Layer

const SERSDispatch = (() => {
  const API_BASE = 'http://localhost:8080';

  async function fetchMap() {
    const res = await fetch(`${API_BASE}/api/map`);
    if (!res.ok) throw new Error(`Map API returned ${res.status}`);
    return res.json();
  }

  async function fetchHubs() {
    const res = await fetch(`${API_BASE}/api/hubs`);
    if (!res.ok) throw new Error(`Hubs API returned ${res.status}`);
    return res.json();
  }

  async function login(username, password) {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Login API returned ${res.status}`);
    return data;
  }

  async function dispatch(nodeId, type, severity, note = '') {
    const res = await fetch(`${API_BASE}/api/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, type, severity, note }),
    });
    if (!res.ok) throw new Error(`Dispatch API returned ${res.status}`);
    return res.json();
  }

  async function checkConnection() {
    try {
      await fetchMap();
      return true;
    } catch {
      return false;
    }
  }

  return { fetchMap, fetchHubs, dispatch, login, checkConnection };
})();

window.SERSDispatch = SERSDispatch;
