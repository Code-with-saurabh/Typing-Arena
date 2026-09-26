let ctx = null;
let enabled = true;
let keySound = 'classic';

let noiseBuf = null;
function noiseSource(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, dur = 0.08, type = 'sine', gain = 0.04, delay = 0 }) {
  if (!enabled) return;
  try {
    const c = ac();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* audio unavailable */
  }
}

function click({ dur = 0.03, gain = 0.05, freq = 3000, type = 'highpass', delay = 0 }) {
  if (!enabled) return;
  try {
    const c = ac();
    const t0 = c.currentTime + delay;
    const src = noiseSource(c);
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch {
    /* audio unavailable */
  }
}

const KEY_SOUNDS = {
  classic: () => tone({ freq: 1560, dur: 0.03, type: 'square', gain: 0.018 }),
  mechanical: () => {
    click({ dur: 0.02, gain: 0.07, freq: 3200 });
    tone({ freq: 460, dur: 0.04, type: 'triangle', gain: 0.025, delay: 0.015 });
  },
  soft: () => {
    click({ dur: 0.05, gain: 0.03, freq: 650, type: 'lowpass' });
    tone({ freq: 210, dur: 0.05, type: 'sine', gain: 0.022 });
  },
  typewriter: () => {
    click({ dur: 0.02, gain: 0.05, freq: 4800 });
    tone({ freq: 2600, dur: 0.05, type: 'square', gain: 0.01 });
    tone({ freq: 140, dur: 0.07, type: 'triangle', gain: 0.02, delay: 0.02 });
  },
  digital: () => tone({ freq: 880, dur: 0.045, type: 'sine', gain: 0.035 }),
};

export const KEY_SOUND_IDS = Object.keys(KEY_SOUNDS);

export const sfx = {
  setEnabled(v) { enabled = v; },
  setKeySound(v) { keySound = KEY_SOUNDS[v] ? v : 'classic'; },
  previewKey(v) {
    const prev = enabled;
    enabled = true;
    (KEY_SOUNDS[v] || KEY_SOUNDS.classic)();
    enabled = prev;
  },
  key() { (KEY_SOUNDS[keySound] || KEY_SOUNDS.classic)(); },
  error() { tone({ freq: 180, dur: 0.09, type: 'sawtooth', gain: 0.03 }); },
  click() { tone({ freq: 880, dur: 0.05, type: 'triangle', gain: 0.03 }); },
  countdown() { tone({ freq: 660, dur: 0.14, type: 'triangle', gain: 0.05 }); },
  go() { tone({ freq: 990, dur: 0.28, type: 'triangle', gain: 0.06 }); },
  finish() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.05, delay: i * 0.09 }));
  },
  podium() {
    [784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'sine', gain: 0.05, delay: i * 0.12 }));
  },
};
