import { io } from 'socket.io-client';

const URL = 'http://localhost:47819';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(name) {
  const s = io(URL, { transports: ['websocket'] });
  const state = { s, name, room: null, results: null, ticks: 0, started: false };
  s.on('roomState', (r) => { state.room = r; });
  s.on('countdown', (r) => { state.room = r.state; });
  s.on('raceStart', (r) => { state.room = r; state.started = true; });
  s.on('raceTick', () => { state.ticks += 1; });
  s.on('raceResults', (r) => { state.results = r; });
  s.on('connect_error', (e) => { console.log(name, 'connect_error', e.message); });
  return state;
}

const ack = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));

const A = client('A');
await sleep(300);
const ra = await ack(A.s, 'createRoom', { nickname: 'Alice', settings: { mode: 'words', words: 25, maxPlayers: 4 } });
if (!ra.ok) { console.log('FAIL create', ra); process.exit(1); }
const code = ra.state.code;
console.log('room created:', code);

const B = client('B');
await sleep(300);
const rb = await ack(B.s, 'joinRoom', { code, nickname: 'Bob' });
if (!rb.ok) { console.log('FAIL join', rb); process.exit(1); }
console.log('B joined, players:', rb.state.players.length);

A.s.emit('setReady', { ready: true });
B.s.emit('setReady', { ready: true });
await sleep(200);
A.s.emit('startRace');

await sleep(3800);
if (!A.started || !B.started) { console.log('FAIL: race did not start', A.started, B.started); process.exit(1); }
console.log('race started, text length:', A.room.text.length);

async function typeIt(c, delayMs) {
  const text = c.room.text;
  for (let i = 1; i <= text.length; i++) {
    c.s.emit('progress', { charIndex: i, correct: i, incorrect: i % 7 === 0 ? 1 : 0 });
    if (i % 5 === 0) await sleep(delayMs);
    if (c.results) return;
  }
  c.s.emit('progress', { charIndex: text.length, correct: text.length, incorrect: 0 });
}

await Promise.all([typeIt(A, 10), typeIt(B, 26)]);

for (let i = 0; i < 40 && !(A.results && B.results); i++) await sleep(250);

console.log('ticks A:', A.ticks, 'B:', B.ticks);
if (!A.results || !B.results) { console.log('FAIL: no results', !!A.results, !!B.results); process.exit(1); }
console.log('rankings:', A.results.rankings.map((r) => `${r.rank}. ${r.nickname} ${r.wpm}wpm acc=${r.accuracy}`).join(' | '));
const ok = A.results.rankings.length === 2 && A.results.rankings[0].nickname === 'Alice' && A.ticks > 3 && B.ticks > 3;
console.log(ok ? 'PASS' : 'FAIL: unexpected ranking');
process.exit(ok ? 0 : 1);
