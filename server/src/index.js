import 'dotenv/config';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import api from './routes/api.js';
import { initSockets } from './sockets/rooms.js';
import { connectDb, dbReady } from './config/db.js';
import { rateLimit } from './utils/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 47819;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/typing_arena';
const PROD = process.env.NODE_ENV === 'production';
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

if (!PROD || ORIGINS.length) {
  app.use(cors(PROD ? { origin: ORIGINS } : {}));
}

app.use('/api', rateLimit({ max: 300 }));
app.use(express.json({ limit: '64kb' }));
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send('typing-arena api — run `npm run build` to serve the client');
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: !PROD || ORIGINS.length ? { origin: ORIGINS.length ? ORIGINS : true, methods: ['GET', 'POST'] } : undefined,
  maxHttpBufferSize: 4096,
});

initSockets(io);

connectDb(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.warn('MongoDB unavailable, leaderboard disabled:', err.message));

server.listen(PORT, () => {
  console.log(`typing-arena listening on http://0.0.0.0:${PORT} (${PROD ? 'production' : 'development'}, db: ${dbReady()})`);
});

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down…`);
  const timer = setTimeout(() => process.exit(1), 5000);
  timer.unref();
  io.close();
  server.close(() => {
    import('mongoose').then(({ default: mongoose }) => mongoose.disconnect()).finally(() => process.exit(0));
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
