const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: res.status, data });
  return data;
}

export function fetchText(cfg) {
  return request('/api/text', {
    method: 'POST',
    body: JSON.stringify({
      source: cfg.source,
      kind: cfg.kind,
      limit: cfg.limit,
      words: cfg.words,
      punctuation: cfg.punctuation,
      numbers: cfg.numbers,
      custom: cfg.custom,
    }),
  }).then((d) => d.text);
}

export function fetchLeaderboard(mode, limit = 50) {
  const q = new URLSearchParams({ mode: mode || 'all', limit: String(limit) });
  return request(`/api/leaderboard?${q}`);
}

export function submitScore(payload) {
  return request('/api/scores', { method: 'POST', body: JSON.stringify(payload) });
}

export function fetchStats(nickname) {
  return request(`/api/stats?nickname=${encodeURIComponent(nickname)}`);
}
