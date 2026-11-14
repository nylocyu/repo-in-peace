# 🪦 Repo in Peace

A 2D pixel cemetery for unfinished vibe-coding projects. Bury your GitHub repos (public, or private via a read-only GitHub App), walk around the graveyard and pay your respects to others.

```bash
cp .env.example .env   # fill in (Supabase project + SESSION_SECRET at minimum)
npm install
npm start              # http://localhost:3000
npm test
```

Needs a Supabase project (the free tier is enough): run [`supabase/schema.sql`](supabase/schema.sql) once in its SQL editor, then copy the URL and keys into `.env`.

## Hosting (Vercel + Supabase)
1. Create a Supabase project and run `supabase/schema.sql`.
2. Import the repo in Vercel (no framework, no build step; `vercel.json` does the rest).
3. Set the env vars from `.env.example` in Vercel. Set `BASE_URL` to the production URL, leave out `DEV_LOGIN`, and set the GitHub callback URL to `<BASE_URL>/auth/callback`.

How it maps: Vercel runs `server.js` as one function, `public/` is static. Graves live in Postgres. Multiplayer runs on Supabase Realtime: the browser receives chat, tributes and grave updates on a private topic that only the server may send to, and movement and presence go directly between browsers. A Vercel Cron job runs the GitHub check once a day.

**Controls:** WASD/arrows or tap to walk · Enter: speak · B: bury (here on an empty plot, otherwise random plot) · F: pay respects · 1: flower · 2: candle

## Burying
- Walk to an empty plot and choose "Bury a repo here", or use "Bury a repo" in the header to get a random free plot.
- The cemetery fills from the front; there is always one empty row at the back, so it grows as needed.

## Rules
- Sign in with GitHub OAuth; only users with admin rights on a repo may bury it.
- Dead only after 90 days without a commit (`DEAD_AFTER` in `rules.js`). Until then the repo lies in its plot in a **hospice** bed.
- A new commit after the funeral leaves the grave empty (**zombie**). After 90 more quiet days it rests again.
- Whoever buried a repo can remove the grave at any time.

## Private repos
Needs a GitHub App instead of the OAuth App (see `.env.example`). It only has read access to metadata and contents, and only on the repos the user picks when installing it.
- **No stored tokens.** The user's sign-in token lives only in their encrypted, HttpOnly session cookie, never in the database. For the hourly check the server signs a JWT with the app key and gets a token for exactly that one repo, valid for 1 h.
- **Only numbers are stored:** commit count, dates, language, stars. Code and README are never stored.
- **The burier decides what is public:** the name ("Unknown project" otherwise), the last commit message ("sealed" otherwise). There is never a link.
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

Architecture: `server.js` (Node HTTP handler, also the Vercel function), `public/index.html` (canvas game), `rules.js` (rules + tests), `supabase/schema.sql` (tables + Realtime policy).

## License
[MIT](LICENSE)
