export function rateLimit({ windowMs = 60_000, max = 300, keyFn = (req) => req.ip }) {
  const hits = new Map();
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  sweeper.unref();
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ error: 'rate_limited' });
    next();
  };
}
