import { Router } from 'express';
import Score from '../models/Score.js';
import { buildText } from '../utils/text.js';
import { dbReady } from '../config/db.js';
import { rateLimit } from '../utils/rateLimit.js';

const router = Router();
const scoreLimit = rateLimit({ windowMs: 60_000, max: 30 });

const MODE_KEY = /^[a-z]+(-\d{1,3})?$/;
const NICK = /^[\w \-.]{2,20}$/;

function withDb(res, next, fn) {
  if (!dbReady()) return res.status(503).json({ error: 'database_unavailable' });
  Promise.resolve(fn()).catch(next);
}

router.get('/health', (req, res) => {
  res.json({ ok: true, db: dbReady(), uptime: process.uptime() });
});

router.post('/text', (req, res) => {
  const { source, kind, limit, words, punctuation, numbers, custom } = req.body || {};
  res.json({ text: buildText({ source, kind, limit, words, punctuation, numbers, custom }) });
});

router.get('/leaderboard', (req, res, next) => {
  const { mode, limit } = req.query;
  const q = {};
  if (mode && mode !== 'all') q.mode = String(mode);
  const lim = Math.max(1, Math.min(100, Number(limit) || 50));
  withDb(res, next, async () => {
    const rows = await Score.find(q).sort({ wpm: -1, accuracy: -1, createdAt: 1 }).limit(lim).lean();
    res.json({ rows });
  });
});

router.post('/scores', scoreLimit, (req, res, next) => {
  const b = req.body || {};
  const nickname = String(b.nickname || '').trim();
  if (!NICK.test(nickname)) return res.status(400).json({ error: 'invalid_nickname' });
  const mode = String(b.mode || '');
  if (!MODE_KEY.test(mode)) return res.status(400).json({ error: 'invalid_mode' });
  const wpm = Number(b.wpm);
  if (!Number.isFinite(wpm) || wpm < 0 || wpm > 400) return res.status(400).json({ error: 'invalid_wpm' });

  withDb(res, next, async () => {
    const doc = await Score.create({
      nickname,
      wpm: Math.round(wpm * 10) / 10,
      rawWpm: Math.round(Number(b.rawWpm) || 0),
      accuracy: Math.round(Math.max(0, Math.min(100, Number(b.accuracy) || 0)) * 10) / 10,
      mode,
      correctChars: Number(b.correctChars) || 0,
      incorrectChars: Number(b.incorrectChars) || 0,
      durationMs: Number(b.durationMs) || 0,
      multiplayer: Boolean(b.multiplayer),
    });
    const better = await Score.countDocuments({
      mode,
      $or: [{ wpm: { $gt: doc.wpm } }, { wpm: doc.wpm, accuracy: { $gt: doc.accuracy } }],
    });
    res.status(201).json({ id: doc._id, rank: better + 1 });
  });
});

router.get('/stats', (req, res, next) => {
  const nickname = String(req.query.nickname || '').trim();
  if (!NICK.test(nickname)) return res.status(400).json({ error: 'invalid_nickname' });
  withDb(res, next, async () => {
    const [best, count, avg] = await Promise.all([
      Score.findOne({ nickname }).sort({ wpm: -1 }).lean(),
      Score.countDocuments({ nickname }),
      Score.aggregate([
        { $match: { nickname } },
        { $group: { _id: null, wpm: { $avg: '$wpm' }, accuracy: { $avg: '$accuracy' } } },
      ]),
    ]);
    res.json({
      best: best ? { wpm: best.wpm, mode: best.mode, createdAt: best.createdAt } : null,
      runs: count,
      avg: avg[0] ? { wpm: Math.round(avg[0].wpm * 10) / 10, accuracy: Math.round(avg[0].accuracy * 10) / 10 } : null,
    });
  });
});

export default router;
