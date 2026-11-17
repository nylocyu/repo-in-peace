# 🪦 Repo in Peace

A 2D pixel cemetery for unfinished vibe-coding projects. Bury your GitHub repos (public, or private via a read-only GitHub App), walk around the graveyard and pay your respects to others.

```bash
cp .env.example .env   # fill in (Supabase project + SESSION_SECRET at minimum)
npm install
npm start              # http://localhost:3000
npm test
```

Needs a Supabase project (the free tier is enough): run [`supabase/schema.sql`](supabase/schema.sql) once in its SQL editor, then copy the URL and keys into `.env`. For local development, `supabase start` (Docker) works too: point `SUPABASE_*` at the local stack and run the schema there.

**Upgrading an existing install** (from the single shared cemetery): run [`supabase/migrate-own-cemeteries.sql`](supabase/migrate-own-cemeteries.sql) once. It first copies `graves` and `tributes` into `*_backup_own_cemeteries` tables, then moves every grave to its burier's own cemetery (packed from the front). Public graves also stay on the Central Cemetery at their old plot; private graves leave it.

## Hosting (Vercel + Supabase)
1. Create a Supabase project and run `supabase/schema.sql`.
2. Import the repo in Vercel (no framework, no build step; `vercel.json` does the rest).
3. Set the env vars from `.env.example` in Vercel. Set `BASE_URL` to the production URL, leave out `DEV_LOGIN`, and set the GitHub callback URL to `<BASE_URL>/auth/callback`.

How it maps: Vercel runs `server.js` as one function, `public/` is static. Graves live in Postgres. Multiplayer runs on Supabase Realtime, separately per cemetery: the browser receives chat, tributes and "graves changed" pings on a private topic that only the server may send to, and movement and presence go directly between browsers. Grave data itself never travels over Realtime; on a ping the browser refetches `/api/graves`, which runs the access check. A Vercel Cron job runs the GitHub check once a day.

**Controls:** WASD/arrows or tap to walk · Enter: speak · B: bury (here on an empty plot, otherwise random plot) · F: pay respects · 1: flower · 2: candle

## Cemeteries
| Route | What |
|---|---|
| `/` | **Central Cemetery**: open to everyone, the shared meeting place |
| `/c/<github-user>` | That user's **own cemetery**: every repo they bury lands here. Only the owner and people with the invite link get in |
| `/c/<github-user>?invite=<token>` | Invite link |

- **Invite link** (owner, ⚙️ Settings): the only way in. The owner creates it and can reset it (the old link stops working).
- **"Guests must sign in with GitHub"** (checkbox, on by default): guests sign in, open the link once and stay guests until the owner removes them one by one. Turned off, the link alone lets anyone in, no sign-in needed: the browser's session remembers the link, and resetting it (or turning sign-in back on) locks those visitors out again. Signed-in guests stay either way.
- **Central Cemetery:** when burying, or later at the grave, the owner can choose "Also show on the Central Cemetery". One repo is one grave with up to two placements; hospice, zombie, flowers and candles are shared.
- **Private repos** live only on their owner's cemetery, so only the owner and people with the invite link ever see them. They can never go on the Central Cemetery (enforced by a database constraint too). A public repo that turns private leaves the Central Cemetery at the next daily check.
- **Multiplayer per cemetery:** you only see players, chat and tributes on the cemetery you're on. A signpost at the gate leads between your own cemetery and the central one; the header has the same switch.
- **All access checks are server-side** (`cemeteryView` and friends in `rules.js`, tested in `rules.test.js`): the grave list, tributes, chat and the Realtime topic names. A private grave you may not see returns the same 404 as a missing one. Each own cemetery has a secret topic that the server hands out only after the check, and replaces when a guest is removed, the link is reset or sign-in is turned back on.

### API
| Method + path | Who | Body / query |
|---|---|---|
| `GET /api/graves?c=<user>` | anyone allowed in (no `c` = Central) | graves, rows, Realtime topics; settings for the owner |
| `POST /api/graves` | signed in | `repo, cause, plot, plotIn: 'own' \| 'central', central, allowAi` |
| `PATCH /api/graves/<id>` | burier | `{ central: true \| false }` |
| `DELETE /api/graves/<id>` | burier | |
| `POST /api/graves/<id>/respect` | anyone who can see it there | `{ kind: 'f' \| 'flower' \| 'candle', c }` |
| `POST /api/chat` | anyone allowed in | `{ text, c }` |
| `PATCH /api/cemetery` | owner | `{ loginRequired: true \| false }` |
| `POST /api/cemetery/invite` | owner | creates or resets the link, returns `{ token }` |
| `DELETE /api/cemetery/guests/<login>` | owner | |
| `POST /api/cemetery/<owner>/join` | anyone with the link (signed in if the owner requires it) | `{ token }` |

## Burying
- Walk to an empty plot (on your own cemetery or the Central Cemetery) and choose "Bury a repo here", or use "Bury a repo" in the header to get a random free plot.
- Every cemetery fills from the front; there is always one empty row at the back, so it grows as needed.

## Rules
- Sign in with GitHub OAuth; only users with admin rights on a repo may bury it.
- Dead only after 90 days without a commit (`DEAD_AFTER` in `rules.js`). Until then the repo lies in its plot in a **hospice** bed.
- A new commit after the funeral leaves the grave empty (**zombie**). After 90 more quiet days it rests again.
- Whoever buried a repo can remove the grave, or take it off the Central Cemetery, at any time.

## Private repos
Needs a GitHub App instead of the OAuth App (see `.env.example`). It only has read access to metadata and contents, and only on the repos the user picks when installing it.
- **No stored tokens.** The user's sign-in token lives only in their encrypted, HttpOnly session cookie, never in the database. For the hourly check the server signs a JWT with the app key and gets a token for exactly that one repo, valid for 1 h.
- **Only numbers are stored:** commit count, dates, language, stars. Code and README are never stored.
- **Only for you and the people you invite:** private graves never appear on the Central Cemetery. Inside your cemetery they show their name and last commit message, but never a link to GitHub.
- **The AI obituary is opt-in:** only with consent are the README and recent commits read and sent to the Anthropic API. Without it there is a default epitaph.
- **Revoking access removes the grave:** uninstall the app or deselect the repo, and the grave disappears at the next daily check.

## Tombstones
| Metric | Grave |
|---|---|
| 1 commit | Wooden cross |
| 2–49 commits | Headstone |
| 50+ commits | Marble |
| 50+ stars | Mausoleum |

The language tints the material. Claude writes the obituary from the README (`ANTHROPIC_API_KEY`).

Architecture: `server.js` (Node HTTP handler, also the Vercel function), `public/index.html` (canvas game), `rules.js` (rules, visibility and invites + tests), `supabase/schema.sql` (tables + Realtime policy), `supabase/migrate-own-cemeteries.sql` (upgrade from the shared cemetery).

## License
[MIT](LICENSE)
