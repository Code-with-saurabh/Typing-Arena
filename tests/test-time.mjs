import { io } from 'socket.io-client';

const URL = 'http://localhost:47819';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ack = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));

function client(name) {
  const s = io(URL, { transports: ['websocket'] });
  const st = { s, name, room: null, results: null, started: false };
  s.on('roomState', (r) => { st.room = r; });
  s.on('countdown', (r) => { st.room = r.state; });
  s.on('raceStart', (r) => { st.room = r; st.started = true; });
  s.on('raceResults', (r) => { st.results = r; });
  return st;
}

const A = client('A');
await sleep(300);
const ra = await ack(A.s, 'createRoom', { nickname: 'Timer1', settings: { mode: 'time', limit: 15 } });
const code = ra.state.code;
const B = client('B');
await sleep(300);
const rb = await ack(B.s, 'joinRoom', { code, nickname: 'Timer2' });
console.log('created/joined:', ra.ok, rb.ok, 'code', code);

A.s.emit('setReady', { ready: true });
B.s.emit('setReady', { ready: true });
await sleep(200);
A.s.emit('startRace');
await sleep(3800);

if (!A.started || !B.started) { console.log('FAIL: not started'); process.exit(1); }
console.log('started, endsAt set:', Boolean(A.room.endsAt), 'in', A.room.endsAt - Date.now(), 'ms');

const len = A.room.text.length;
let i = 0;
const slow = setInterval(() => {
  i = Math.min(len - 1, i + 3);
  A.s.emit('progress', { charIndex: i, correct: i, incorrect: 0 });
  B.s.emit('progress', { charIndex: Math.floor(i / 2), correct: Math.floor(i / 2), incorrect: 0 });
}, 100);

for (let k = 0; k < 70 && !(A.results && B.results); k++) await sleep(250);
clearInterval(slow);

if (!A.results) { console.log('FAIL: time mode never ended'); process.exit(1); }
console.log('rankings:', A.results.rankings.map((r) => `${r.rank}. ${r.nickname} ${r.wpm}wpm finished=${r.finished}`).join(' | '));
const ok = A.results.rankings.length === 2 && A.results.rankings[0].nickname === 'Timer1';
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
