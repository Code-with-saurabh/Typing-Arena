let ctx = null;
let enabled = true;

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

export const sfx = {
  setEnabled(v) { enabled = v; },
  key() { tone({ freq: 1560, dur: 0.03, type: 'square', gain: 0.018 }); },
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
