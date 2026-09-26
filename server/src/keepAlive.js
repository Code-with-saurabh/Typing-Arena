import mongoose from 'mongoose';

export function startKeepAlive({ intervalMs, port, logger = console.log }) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1000) return () => {};
  const tick = setInterval(async () => {
    const started = Date.now();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(15_000),
      });
      let mongo = 'not_connected';
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        mongo = 'ping_ok';
      }
      logger(`keep-alive: http=${res.status} mongo=${mongo} in ${Date.now() - started}ms`);
    } catch (err) {
      logger(`keep-alive: tick failed — ${err.message}`);
    }
  }, intervalMs);
  tick.unref();
  return () => clearInterval(tick);
}
