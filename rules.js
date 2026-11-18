// Pure cemetery rules – tested in rules.test.js
export const DAY = 864e5;
export const CAUSES = [
  'Scope creep',
  'New idea the next day',
  'API key expired',
  'Context window full',
  '"Works on my machine"',
];

// No commit for HOSPICE_AFTER days: hospice bed. For DEAD_AFTER days: grave.
export const HOSPICE_AFTER = 30;
export const DEAD_AFTER = 90;

// diedAt = time of burial; a commit after that leaves the grave empty
export const status = g =>
  !g.diedAt ? 'hospice' : Date.parse(g.lastCommit) > Date.parse(g.diedAt) ? 'zombie' : 'dead';

// Moves a repo along hospice -> dead -> zombie -> dead. Returns false if it belongs to the living (not in the cemetery).
export function settle(g, now = Date.now()) {
  const idle = now - Date.parse(g.lastCommit);
  if (!g.diedAt && idle < HOSPICE_AFTER * DAY) return false; // recovered (or never sick)
  if (status(g) !== 'dead' && idle >= DEAD_AFTER * DAY) g.diedAt = new Date(now).toISOString();
  return true;
}

export const tomb = (commits, stars) =>
  stars >= 50 ? 'mausoleum' : commits <= 1 ? 'cross' : commits >= 50 ? 'marble' : 'stone';

// A grid of plots. There is always one completely empty row at the back.
export const COLS = 12;
export const rowsFor = plots => Math.max(4, Math.floor(Math.max(-1, ...plots) / COLS) + 2);

// Random free plot, filling the cemetery before it grows into the empty back row
export function randomPlot(plots, rand = Math.random) {
  const taken = new Set(plots), rows = rowsFor(plots);
  for (const cap of [(rows - 1) * COLS, rows * COLS]) {
    const free = [];
    for (let i = 0; i < cap; i++) if (!taken.has(i)) free.push(i);
    if (free.length) return free[Math.floor(rand() * free.length)];
  }
}

// With per_page=1 the last page number = number of commits
export const lastPage = link => +(/[?&]page=(\d+)>; rel="last"/.exec(link || '')?.[1] || 1);

export const lower = s => String(s ?? '').toLowerCase();
