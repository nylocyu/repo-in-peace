// Pure cemetery rules – tested in rules.test.js
export const DAY = 864e5;
export const CAUSES = [
  'Scope creep',
  'New idea the next day',
  'API key expired',
  'Context window full',
  '"Works on my machine"',
];

// Dead only after DEAD_AFTER days without a commit
export const DEAD_AFTER = 90;
export const isDead = (lastCommit, now = Date.now()) => now - Date.parse(lastCommit) >= DEAD_AFTER * DAY;

// diedAt = time of burial; a commit after that leaves the grave empty
export const status = g =>
  !g.diedAt ? 'hospice' : Date.parse(g.lastCommit) > Date.parse(g.diedAt) ? 'zombie' : 'dead';

export const tomb = (commits, stars) =>
  stars >= 50 ? 'mausoleum' : commits <= 1 ? 'cross' : commits >= 50 ? 'marble' : 'stone';

// One cemetery, a grid of plots. There is always one completely empty row at the back.
export const COLS = 12;
export const rowsFor = plots => Math.max(4, Math.floor(Math.max(-1, ...plots) / COLS) + 2);
export const isValidPlot = (plot, plots) =>
  Number.isInteger(plot) && plot >= 0 && plot < rowsFor(plots) * COLS && !plots.includes(plot);

// Random free plot, filling the cemetery before it grows into the empty back row
export function randomPlot(plots, rand = Math.random) {
  const taken = new Set(plots), rows = rowsFor(plots);
  for (const cap of [(rows - 1) * COLS, rows * COLS]) {
    const free = [];
    for (let i = 0; i < cap; i++) if (!taken.has(i)) free.push(i);
    if (free.length) return free[Math.floor(rand() * free.length)];
  }
}

export function parseRepo(input) {
  const m = /^(?:https?:\/\/(?:www\.)?github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(String(input).trim());
  if (!m || /^\.+$/.test(m[1]) || /^\.+$/.test(m[2])) return null; // no "../" into the GitHub API
  return `${m[1]}/${m[2]}`;
}

// With per_page=1 the last page number = number of commits
export const lastPage = link => +(/[?&]page=(\d+)>; rel="last"/.exec(link || '')?.[1] || 1);
