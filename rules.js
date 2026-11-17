import { timingSafeEqual } from 'node:crypto';
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

// Each cemetery is its own grid of plots. There is always one completely empty row at the back.
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

// What everyone sees of a grave. Private repos: never a link, name and last words only if the burier allowed it.
export const publicView = ({ by, ...g }) => !g.private ? g : {
  ...g, url: null,
  ...(!g.showName && { name: 'Unknown project', full: `${g.owner}/🔒 private` }),
  ...(!g.showLastWords && { lastWords: '🔒 sealed' }),
};

// ---------- Cemeteries ----------
// Every user has one at /c/<login>; the Zentralfriedhof at / is cem = null and open to everyone.
// Own cemeteries are entered only via the owner's invite link. loginRequired (default): you sign in with GitHub and
// stay a guest until removed. Without it, the link alone lets you in, for as long as that link isn't reset.
// cem = { owner: lowercase login, loginRequired: bool, inviteToken: string | null, guests: [lowercase logins] }
// token = the invite token this visitor accepted earlier (kept in their session), if any
export const lower = s => String(s ?? '').toLowerCase();
export const defaultCemetery = owner => ({ owner: lower(owner), loginRequired: true, inviteToken: null, guests: [] });
export const isOwner = (cem, login) => !!cem && !!login && lower(login) === cem.owner;
// Constant-time, and a reset link (null token) accepts nothing
export const inviteOk = (cem, token) => !!cem?.inviteToken && typeof token === 'string' && token.length === cem.inviteToken.length &&
  timingSafeEqual(Buffer.from(token), Buffer.from(cem.inviteToken));
export const isMember = (cem, login, token) => isOwner(cem, login) || (!!cem && !!login && cem.guests.includes(lower(login)))
  || (!!cem && !cem.loginRequired && inviteOk(cem, token));
export const canEnter = (cem, login, token) => !cem || isMember(cem, login, token);
export const mayGoCentral = g => !g.private;

// The only way grave data leaves the server: the graves placed on that cemetery that this viewer may see,
// masked, with the plot of that placement. Private repos: never on the Zentralfriedhof, on their own one only for whoever may enter.
// null = no access at all.
export function cemeteryView(graves, cem, login, token) {
  if (!canEnter(cem, login, token)) return null;
  const here = !cem
    ? graves.filter(g => g.centralPlot != null && mayGoCentral(g)).map(g => ({ ...g, plot: g.centralPlot }))
    : graves.filter(g => g.cemetery === cem.owner);
  const shown = here.map(({ cemetery, centralPlot, ...g }) =>
    ({ ...publicView(g), central: centralPlot != null, status: status(g), tomb: tomb(g.commits, g.stars) }));
  return { rows: rowsFor(shown.map(g => g.plot)), graves: shown };
}
