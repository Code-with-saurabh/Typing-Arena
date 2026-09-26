import { WORD_LISTS } from './words.js';

const QUOTES = [
  'The only way to do great work is to love what you do.',
  'In the middle of difficulty lies opportunity.',
  'Simplicity is the ultimate sophistication.',
  'Well done is better than well said.',
  'It always seems impossible until it is done.',
  'What we think, we become.',
  'The best time to plant a tree was twenty years ago. The second best time is now.',
  'Success is not final, failure is not fatal: it is the courage to continue that counts.',
  'Whether you think you can or you think you cannot, you are right.',
  'Life is what happens when you are busy making other plans.',
  'The journey of a thousand miles begins with a single step.',
  'Quality is not an act, it is a habit.',
  'Dream big and dare to fail.',
  'What you do today can improve all your tomorrows.',
  'The harder I work, the luckier I get.',
  'Do not wait to strike till the iron is hot; but make it hot by striking.',
  'Everything youve ever wanted is on the other side of fear.',
  'Believe you can and youre halfway there.',
  'Act as if what you do makes a difference. It does.',
  'It does not matter how slowly you go as long as you do not stop.',
  'A journey is not measured in miles but in moments of wonder.',
  'Discipline is choosing between what you want now and what you want most.',
  'The secret of getting ahead is getting started.',
  'Small deeds done are better than great deeds planned.',
  'Perfection is not attainable, but if we chase perfection we can catch excellence.',
];

const PUNCT_PAIRS = [
  [',', ' and'], ['.', ' The'], ['!', ' Wow'], ['?', ' why'], [';', ' then'], [':', ' next'],
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function decorateWord(word, opts) {
  let w = word;
  if (opts.numbers && Math.random() < 0.08) {
    return String(Math.floor(Math.random() * 9000) + 10);
  }
  if (opts.punctuation) {
    const r = Math.random();
    if (r < 0.06) w = `"${w}"`;
    else if (r < 0.1) w = `'${w}'`;
    else if (r < 0.14) w = `(${w})`;
    else if (r < 0.18) w = `${w};`;
    else if (r < 0.22) w = `${w}:`;
    else if (r < 0.26) w = `${w},`;
    else if (r < 0.3) w = `${w}.`;
  }
  return w;
}

function buildWords(count, source, opts) {
  const list = WORD_LISTS[source] || WORD_LISTS.basic;
  const out = [];
  for (let i = 0; i < count; i++) {
    let w = pick(list);
    if (opts.punctuation && i === 0 && Math.random() < 0.4) {
      w = w[0].toUpperCase() + w.slice(1);
    }
    out.push(decorateWord(w, opts));
  }
  return out.join(' ');
}

export function buildText({ source = 'basic', kind = 'time', limit = 30, words = 50, punctuation = false, numbers = false, custom = '' } = {}) {
  const opts = { punctuation, numbers };
  if (kind === 'custom') {
    const trimmed = String(custom || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (trimmed) return trimmed;
    return buildWords(30, source, opts);
  }
  if (kind === 'quote' || source === 'quotes') {
    return pick(QUOTES);
  }
  if (kind === 'words') {
    return buildWords(Math.max(5, Math.min(300, words)), source, opts);
  }
  const count = Math.max(40, Math.min(800, Math.round(limit * 4)));
  return buildWords(count, source, opts);
}
