// Default to backend on 3000 unless explicitly overridden
let resolvedBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const BASE = resolvedBase.replace(/\/$/, '');

async function handleResponse(res) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (contentType.includes('text/html') || /Cannot GET/i.test(text)) {
      throw new Error('Backend endpoint not found. Restart backend from this project and reload UI.');
    }
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchActiveExecutions() {
  const res = await fetch(`${BASE}/system/executions/active`);
  return handleResponse(res);
}

export async function fetchExecutions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/system/executions${qs ? `?${qs}` : ''}`);
  return handleResponse(res);
}

export async function fetchFlowSummaries() {
  const res = await fetch(`${BASE}/system/flows/summary`);
  return handleResponse(res);
}

export async function fetchInsights() {
  const res = await fetch(`${BASE}/system/insights`);
  return handleResponse(res);
}

export async function fetchActions() {
  const res = await fetch(`${BASE}/system/actions`);
  return handleResponse(res);
}

export async function createProject(payload) {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
