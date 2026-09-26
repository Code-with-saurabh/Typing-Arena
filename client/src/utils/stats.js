export function computeStats(text, typed, startedAt, now) {
  let correct = 0;
  let incorrect = 0;
  for (let i = 0; i < typed.length; i++) {
    if (i < text.length && typed[i] === text[i]) correct++;
    else incorrect++;
  }
  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const minutes = elapsedMs / 60000;
  const accuracy = typed.length ? (correct / typed.length) * 100 : 100;
  const raw = minutes > 0 ? typed.length / 5 / minutes : 0;
  const wpm = minutes > 0 ? correct / 5 / minutes : 0;
  return { elapsedMs, correct, incorrect, accuracy, raw, wpm, typedCount: typed.length };
}

export function consistencyOf(samples) {
  const vals = (samples || []).map((s) => s.wpm).filter((v) => v > 0);
  if (vals.length < 2) return 100;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return 0;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.round((1 - cv) * 1000) / 10);
}

export function statusesFor(text, typed) {
  const len = Math.max(text.length, typed.length);
  const arr = new Array(len);
  for (let i = 0; i < len; i++) {
    if (i >= typed.length) arr[i] = 'pending';
    else if (i >= text.length) arr[i] = 'extra';
    else arr[i] = typed[i] === text[i] ? 'correct' : 'wrong';
  }
  return arr;
}

export function errorMapFor(text, typed) {
  const map = {};
  for (let i = 0; i < typed.length && i < text.length; i++) {
    if (typed[i] !== text[i]) {
      const key = text[i] === ' ' ? typed[i].toLowerCase() : text[i].toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
  }
  return map;
}

export function modeKeyOf(cfg) {
  if (cfg.kind === 'time') return `time-${cfg.limit}`;
  if (cfg.kind === 'words') return `words-${cfg.words}`;
  if (cfg.kind === 'quote') return 'quote';
  return 'custom';
}
