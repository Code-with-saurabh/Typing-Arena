import { buildText } from '../utils/text.js';

const PALETTE = ['#E53935', '#8E24AA', '#3949AB', '#00897B', '#FDD835', '#FB8C00', '#6D4C41', '#546E7A'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();

function makeCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(code)) return code;
  }
}

function sanitizeSettings(s = {}) {
  const mode = ['time', 'words', 'quote'].includes(s.mode) ? s.mode : 'time';
  const limit = [15, 30, 60, 120].includes(Number(s.limit)) ? Number(s.limit) : 30;
  const words = [25, 50, 100].includes(Number(s.words)) ? Number(s.words) : 50;
  const source = ['basic', 'extended', 'quotes'].includes(s.source) ? s.source : 'basic';
  const maxPlayers = Math.max(2, Math.min(8, Number(s.maxPlayers) || 4));
  return { mode, limit, words, source, punctuation: !!s.punctuation, numbers: !!s.numbers, maxPlayers };
}

function freshProgress() {
  return {
    charIndex: 0, fraction: 0, correct: 0, incorrect: 0,
    wpm: 0, rawWpm: 0, accuracy: 100, finished: false, finishTime: null, rank: null,
  };
}

function makePlayer(id, nickname) {
  return {
    id,
    nickname: String(nickname).replace(/[^\w \-.]/g, '').slice(0, 20) || 'player',
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    ready: false,
    lastProgress: 0,
    progress: freshProgress(),
  };
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    settings: room.settings,
    text: room.state === 'lobby' || room.state === 'countdown' ? '' : room.text,
    startAt: room.startAt,
    endsAt: room.endsAt,
    countdownEndsAt: room.countdownEndsAt,
    players: [...room.players.values()].map((p) => ({
      id: p.id, nickname: p.nickname, color: p.color, ready: p.ready,
      isHost: p.id === room.hostId, progress: p.progress,
    })),
  };
}

function clearTimers(room) {
  Object.values(room.timers).forEach((t) => t && clearInterval(t));
  Object.keys(room.timers).forEach((k) => { room.timers[k] = null; });
}

function safeEmit(io, room, event, payload) {
  io.to(room.code).emit(event, payload);
}

function createRoom(io, hostSocket, nickname, settings) {
  const code = makeCode();
  const player = makePlayer(hostSocket.id, nickname);
  const room = {
    code,
    hostId: hostSocket.id,
    state: 'lobby',
    settings: sanitizeSettings(settings),
    players: new Map([[hostSocket.id, player]]),
    text: '',
    startAt: null,
    endsAt: null,
    countdownEndsAt: null,
    timers: { tick: null, end: null, countdown: null },
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  hostSocket.join(code);
  hostSocket.data.roomCode = code;
  return room;
}

function leaveRoom(io, socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socket.data.roomCode = null;
  if (!room) return;
  room.players.delete(socket.id);
  if (room.players.size === 0) {
    room.emptyTimer = setTimeout(() => {
      if (room.players.size === 0) {
        clearTimers(room);
        rooms.delete(code);
      }
    }, 5000);
    return;
  }
  if (room.hostId === socket.id) {
    room.hostId = room.players.keys().next().value;
  }
  if (room.state === 'racing' && allFinished(room)) endRace(io, room);
  safeEmit(io, room, 'roomState', roomSnapshot(room));
}

function allFinished(room) {
  return [...room.players.values()].every((p) => p.progress.finished);
}

function computeLive(room, p, at = Date.now()) {
  const elapsedMs = room.endsAt
    ? Math.max(0, Math.min(at, room.endsAt) - room.startAt)
    : Math.max(0, at - room.startAt);
  const minutes = elapsedMs / 60000;
  const prog = p.progress;
  prog.wpm = minutes > 0.0005 ? Math.round(((prog.correct / 5) / minutes) * 10) / 10 : 0;
  prog.rawWpm = minutes > 0.0005 ? Math.round(((prog.charIndex / 5) / minutes) * 10) / 10 : 0;
  prog.fraction = room.text.length ? Math.min(1, prog.charIndex / room.text.length) : 0;
}

function standings(room) {
  return [...room.players.values()].sort((a, b) => {
    if (a.progress.finished !== b.progress.finished) return a.progress.finished ? -1 : 1;
    if (a.progress.finished && b.progress.finished) return a.progress.finishTime - b.progress.finishTime;
    if (b.progress.fraction !== a.progress.fraction) return b.progress.fraction - a.progress.fraction;
    return b.progress.wpm - a.progress.wpm;
  });
}

function broadcastTick(io, room) {
  if (room.state !== 'racing') return;
  safeEmit(io, room, 'raceTick', {
    at: Date.now(),
    players: standings(room).map((p) => ({
      id: p.id, nickname: p.nickname, color: p.color, progress: p.progress,
    })),
  });
}

function startRace(io, room) {
  room.text = buildText({ ...room.settings, kind: room.settings.mode });
  room.state = 'racing';
  room.startAt = Date.now();
  room.endsAt = room.settings.mode === 'time' ? room.startAt + room.settings.limit * 1000 : null;
  room.countdownEndsAt = null;
  room.players.forEach((p) => { p.progress = freshProgress(); });
  safeEmit(io, room, 'raceStart', roomSnapshot(room));
  room.timers.tick = setInterval(() => broadcastTick(io, room), 250);
  if (room.endsAt) {
    room.timers.end = setTimeout(() => endRace(io, room), Math.max(0, room.endsAt - Date.now()) + 400);
  } else {
    const capMs = Math.max(60000, (room.text.length / 5) * 6000);
    room.timers.end = setTimeout(() => endRace(io, room), capMs);
  }
}

function endRace(io, room) {
  if (room.state !== 'racing') return;
  clearTimers(room);
  const now = Date.now();
  const capMs = Math.max(60000, room.settings.words * 6000);
  const rows = [...room.players.values()].map((p) => {
    const prog = p.progress;
    let elapsedMs;
    if (prog.finished) elapsedMs = prog.finishTime - room.startAt;
    else if (room.endsAt) elapsedMs = room.endsAt - room.startAt;
    else elapsedMs = Math.min(now - room.startAt, capMs);
    elapsedMs = Math.max(1000, elapsedMs);
    const wpm = Math.round(((prog.correct / 5) / (elapsedMs / 60000)) * 10) / 10;
    return { id: p.id, nickname: p.nickname, color: p.color, wpm, rawWpm: prog.rawWpm, accuracy: prog.accuracy, finished: prog.finished, elapsedMs };
  });
  rows.sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy || a.elapsedMs - b.elapsedMs);
  rows.forEach((r, i) => { r.rank = i + 1; });
  rows.forEach((r) => {
    const p = room.players.get(r.id);
    if (p) p.progress.rank = r.rank;
  });
  room.state = 'finished';
  safeEmit(io, room, 'raceResults', {
    rankings: rows,
    mode: room.settings.mode,
    textLength: room.text.length,
    startedAt: room.startAt,
    endedAt: now,
  });
}

function beginCountdown(io, room) {
  room.state = 'countdown';
  room.countdownEndsAt = Date.now() + 3200;
  safeEmit(io, room, 'countdown', { endsAt: room.countdownEndsAt, state: roomSnapshot(room) });
  room.timers.countdown = setTimeout(() => {
    room.timers.countdown = null;
    if (room.state === 'countdown' && room.players.size >= 1) startRace(io, room);
    else if (room.state === 'countdown') {
      room.state = 'lobby';
      safeEmit(io, room, 'roomState', roomSnapshot(room));
    }
  }, 3250);
}

export function initSockets(io) {
  io.on('connection', (socket) => {
    const ack = (cb, payload) => { if (typeof cb === 'function') cb(payload); };

    socket.on('createRoom', ({ nickname, settings } = {}, cb) => {
      if (!nickname) return ack(cb, { ok: false, error: 'nickname_required' });
      leaveRoom(io, socket);
      const room = createRoom(io, socket, nickname, settings);
      ack(cb, { ok: true, state: roomSnapshot(room) });
    });

    socket.on('quickMatch', ({ nickname } = {}, cb) => {
      if (!nickname) return ack(cb, { ok: false, error: 'nickname_required' });
      const open = [...rooms.values()].find(
        (r) => r.state === 'lobby' && r.players.size < r.settings.maxPlayers,
      );
      if (open) {
        leaveRoom(io, socket);
        return joinInternal(io, socket, open, nickname, cb);
      }
      leaveRoom(io, socket);
      const room = createRoom(io, socket, nickname, {});
      return ack(cb, { ok: true, state: roomSnapshot(room) });
    });

    socket.on('joinRoom', ({ code, nickname } = {}, cb) => {
      const target = String(code || '').toUpperCase().trim();
      const room = rooms.get(target);
      if (!room) return ack(cb, { ok: false, error: 'room_not_found' });
      if (socket.data.roomCode === target) return ack(cb, { ok: true, state: roomSnapshot(room) });
      if (room.state !== 'lobby') return ack(cb, { ok: false, error: 'race_in_progress' });
      if (room.players.size >= room.settings.maxPlayers) return ack(cb, { ok: false, error: 'room_full' });
      if (!nickname) return ack(cb, { ok: false, error: 'nickname_required' });
      leaveRoom(io, socket);
      joinInternal(io, socket, room, nickname, cb);
    });

    socket.on('listRooms', (cb) => {
      const list = [...rooms.values()]
        .filter((r) => r.state === 'lobby' && r.players.size > 0)
        .map((r) => ({
          code: r.code,
          host: r.players.get(r.hostId)?.nickname || '?',
          players: r.players.size,
          maxPlayers: r.settings.maxPlayers,
          mode: r.settings.mode,
          limit: r.settings.limit,
          words: r.settings.words,
        }));
      ack(cb, { ok: true, rooms: list });
    });

    socket.on('leaveRoom', () => leaveRoom(io, socket));

    socket.on('setReady', ({ ready } = {}) => {
      const room = rooms.get(socket.data.roomCode);
      const p = room?.players.get(socket.id);
      if (!room || !p || room.state !== 'lobby') return;
      p.ready = !!ready;
      safeEmit(io, room, 'roomState', roomSnapshot(room));
    });

    socket.on('updateSettings', (settings = {}) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || room.hostId !== socket.id || room.state !== 'lobby') return;
      room.settings = sanitizeSettings({ ...room.settings, ...settings });
      safeEmit(io, room, 'roomState', roomSnapshot(room));
    });

    socket.on('startRace', () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || room.hostId !== socket.id || room.state !== 'lobby') return;
      beginCountdown(io, room);
    });

    socket.on('rematch', () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || room.hostId !== socket.id || room.state !== 'finished') return;
      clearTimers(room);
      room.state = 'lobby';
      room.text = '';
      room.startAt = null;
      room.endsAt = null;
      room.players.forEach((p) => { p.ready = false; p.progress = freshProgress(); });
      safeEmit(io, room, 'roomState', roomSnapshot(room));
    });

    socket.on('progress', (payload = {}) => {
      const room = rooms.get(socket.data.roomCode);
      const p = room?.players.get(socket.id);
      if (!room || room.state !== 'racing' || !p || p.progress.finished) return;
      const nowMs = Date.now();
      const requestedIdx = Math.floor(Number(payload.charIndex));
      const isFinish = room.text.length > 0 && requestedIdx >= room.text.length;
      if (!isFinish && nowMs - p.lastProgress < 40) return;
      p.lastProgress = nowMs;

      const prev = p.progress.charIndex;
      const requested = Math.floor(Number(payload.charIndex));
      const charIndex = Number.isFinite(requested)
        ? Math.max(prev, Math.min(room.text.length, requested))
        : prev;
      const correct = Math.max(0, Math.min(charIndex, Math.floor(Number(payload.correct) || 0)));
      const incorrect = Math.max(0, Math.floor(Number(payload.incorrect) || 0));

      p.progress.charIndex = charIndex;
      p.progress.correct = correct;
      p.progress.incorrect = incorrect;
      computeLive(room, p);

      if (charIndex >= room.text.length && room.text.length > 0) {
        p.progress.finished = true;
        p.progress.finishTime = Date.now();
        computeLive(room, p, p.progress.finishTime);
        safeEmit(io, room, 'playerFinished', {
          id: p.id, nickname: p.nickname, wpm: p.progress.wpm, standings: standings(room).map((x) => ({ id: x.id, fraction: x.progress.fraction, finished: x.progress.finished })),
        });
        if (allFinished(room)) {
          endRace(io, room);
          return;
        }
      }
      broadcastTick(io, room);
    });

    socket.on('disconnect', () => leaveRoom(io, socket));
  });
}

function joinInternal(io, socket, room, nickname, cb) {
  if (room.players.size >= room.settings.maxPlayers) return ackJoin(cb, { ok: false, error: 'room_full' });
  if (room.emptyTimer) {
    clearTimeout(room.emptyTimer);
    room.emptyTimer = null;
  }
  const player = makePlayer(socket.id, nickname);
  room.players.set(socket.id, player);
  socket.join(room.code);
  socket.data.roomCode = room.code;
  safeEmit(io, room, 'roomState', roomSnapshot(room));
  return ackJoin(cb, { ok: true, state: roomSnapshot(room) });
}

function ackJoin(cb, payload) {
  if (typeof cb === 'function') cb(payload);
}
