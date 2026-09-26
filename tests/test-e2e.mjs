import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173';
const errors = [];

function watch(page, tag) {
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ERR_|Failed to load resource/.test(m.text())) errors.push(`[${tag}] console: ${m.text()}`);
  });
}

async function readText(page) {
  const spans = await page.$$eval('.typing-words [data-i]', (els) =>
    els.map((e) => ({ i: Number(e.dataset.i), t: e.textContent })),
  );
  if (!spans.length) throw new Error('no text spans found');
  const max = Math.max(...spans.map((s) => s.i));
  const arr = new Array(max + 1).fill(' ');
  spans.forEach((s) => { arr[s.i] = s.t; });
  return arr.join('').replace(/\u00A0/g, ' ');
}

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});

const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
const A = await ctxA.newPage();
const B = await ctxB.newPage();
watch(A, 'A');
watch(B, 'B');

try {
  // ---------- solo ----------
  await A.goto(`${BASE}/solo`, { waitUntil: 'networkidle' });
  await A.getByRole('button', { name: 'words', exact: true }).click();
  await A.getByRole('button', { name: '25', exact: true }).click();
  await A.getByRole('button', { name: 'start test' }).click();
  await A.waitForSelector('.typing-box', { timeout: 8000 });
  await A.waitForTimeout(300);
  const soloText = await readText(A);
  console.log('solo text length:', soloText.length);
  await A.keyboard.type(soloText, { delay: 34 });
  await A.waitForSelector('.result-wpm', { timeout: 8000 });
  const wpm = await A.$eval('.result-wpm b', (e) => e.textContent);
  console.log('solo results rendered, wpm =', wpm);
  await A.fill('.nick-input', 'SoloKid');
  await A.click('.score-submit .btn-yellow');
  await A.waitForSelector('.score-submit.done, .score-submit .form-error', { timeout: 8000 });
  const submitState = await A.$eval('.score-submit', (e) => e.textContent);
  if (!/ranked/.test(submitState)) throw new Error('score not saved: ' + submitState);
  console.log('solo score saved:', submitState.trim());

  // ---------- solo time mode (timer expiry) ----------
  await A.getByRole('button', { name: 'change settings' }).click();
  await A.getByRole('button', { name: 'time', exact: true }).click();
  await A.getByRole('button', { name: '15', exact: true }).click();
  await A.getByRole('button', { name: 'start test' }).click();
  await A.waitForSelector('.typing-box', { timeout: 8000 });
  await A.waitForTimeout(300);
  const timeText = await readText(A);
  await A.keyboard.type(timeText.slice(0, 60), { delay: 90 });
  await A.waitForSelector('.result-wpm', { timeout: 16000 });
  const hudTimeGone = await A.$('.hud-time');
  console.log('time-mode run ended on timer expiry, results shown:', !hudTimeGone);
  await A.getByRole('button', { name: 'change settings' }).click();

  // ---------- multiplayer ----------
  await A.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await A.fill('#multi-nick', 'Alice');
  await A.getByRole('button', { name: 'words', exact: true }).click();
  await A.getByRole('button', { name: '25', exact: true }).click();
  await A.getByRole('button', { name: 'create room', exact: true }).click();
  await A.waitForURL('**/room/**', { timeout: 8000 });
  const code = A.url().split('/room/')[1];
  console.log('room created:', code);
  await A.waitForSelector('.room-meta-chips');
  console.log('room settings:', (await A.$eval('.room-meta-chips', (e) => e.textContent)).trim());

  await B.goto(`${BASE}/multiplayer`, { waitUntil: 'networkidle' });
  await B.fill('#multi-nick', 'Bob');
  await B.fill('.code-input', code);
  await B.getByRole('button', { name: 'join', exact: true }).click();
  await B.waitForURL('**/room/**', { timeout: 8000 });
  await B.waitForSelector('.player-grid .player-card', { timeout: 8000 });
  const players = await B.$$eval('.player-card b', (els) => els.map((e) => e.textContent));
  console.log('lobby players:', players.join(', '));

  await A.getByRole('button', { name: 'start race' }).click();
  await A.waitForSelector('.countdown-overlay', { timeout: 5000 });
  console.log('countdown shown');
  await A.waitForSelector('.race-layout .typing-box', { timeout: 8000 });
  await B.waitForSelector('.race-layout .typing-box', { timeout: 8000 });
  await A.waitForTimeout(200);

  const raceText = await readText(A);
  const wordCount = await A.$$eval('.typing-words .word', (els) => els.length);
  console.log('race text length:', raceText.length, 'visible words:', wordCount);
  await Promise.all([
    A.keyboard.type(raceText, { delay: 3 }),
    B.keyboard.type(raceText, { delay: 14 }),
  ]);

  await A.waitForSelector('.podium', { timeout: 20000 });
  await B.waitForSelector('.podium', { timeout: 20000 });
  const ranks = await A.$$eval('.result-table tbody tr', (rows) =>
    rows.map((r) => ({
      name: r.querySelector('td:nth-child(2)')?.textContent.trim(),
      wpm: Number(r.querySelector('td:nth-child(3)')?.textContent),
    })),
  );
  console.log('final order:', ranks.map((r) => `${r.name} ${r.wpm}wpm`).join(' > '));
  if (ranks[0].name !== 'Alice') throw new Error(`expected Alice first, got ${ranks[0].name}`);
  if (ranks[0].wpm <= 0) throw new Error('winner wpm is 0 — typing never registered');

  // ---------- leaderboard ----------
  await B.goto(`${BASE}/leaderboard`, { waitUntil: 'networkidle' });
  await B.getByRole('button', { name: '25w', exact: true }).click();
  await B.waitForSelector('.result-table tbody tr', { timeout: 8000 });
  const rows = await B.$$eval('.result-table tbody tr td:nth-child(2)', (els) => els.map((e) => e.textContent.trim()));
  console.log('leaderboard rows:', rows.join(', '));
  if (!rows.includes('SoloKid')) throw new Error('leaderboard missing saved score for SoloKid');

  // ---------- settings / theme ----------
  await B.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await B.getByRole('button', { name: 'dark', exact: true }).click();
  const theme = await B.getAttribute('html', 'data-theme');
  if (theme !== 'dark') throw new Error('dark theme not applied');
  console.log('dark theme toggled OK');

  if (errors.length) {
    console.log('CONSOLE/PAGE ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('\nALL E2E TESTS PASSED');
  process.exit(0);
} catch (err) {
  console.error('E2E FAILED:', err.message);
  if (errors.length) console.error('errors:\n' + errors.join('\n'));
  process.exit(1);
} finally {
  await browser.close();
}
