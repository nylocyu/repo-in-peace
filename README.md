# 🪦 Repo in Peace

Your own private pixel cemetery for unfinished GitHub repos. Host it yourself, sign in with GitHub, and every repo you stopped committing to gets a hospice bed and, eventually, a tombstone.

```bash
git clone https://github.com/nylocyu/repo-in-peace && cd repo-in-peace
cp .env.example .env   # fill in, see below
npm install
npm start              # http://localhost:3000
npm test
```

**Controls:** WASD/arrows or tap to walk · F: pay respects · 1: flower · 2: candle

## How it works
- Sign in with GitHub. Your repos sync on every visit (or via 🔄 Sync).
- **30 days** without a commit: the repo is admitted to a **hospice** bed.
- **90 days** without a commit: it gets a **grave** (`HOSPICE_AFTER` / `DEAD_AFTER` in `rules.js`).
- A commit in hospice sends the repo home again. A commit after the funeral leaves the grave empty (**zombie**); after 90 more quiet days it rests again.
- Forks are skipped. Repos you delete on GitHub (or revoke access to) disappear from the cemetery.
- Every signed-in user gets their own cemetery; nobody sees anyone else's. Limit who may sign in with `ALLOWED_USERS`.

## AI epitaphs (bring your own key)
On your first visit you can enter your own Anthropic API key. Claude then reads the README and recent commit messages of each repo in your cemetery and writes its obituary and cause of death. Without a key you get the repo description and a random cause. Add, change or remove the key later in ⚙️ Settings; graves without an AI epitaph get one as soon as a key is there.

The key is checked against the Anthropic API, encrypted with `SESSION_SECRET` (AES-GCM) and stored in the `users` table; the browser only ever sees its last four characters. README and commits are sent to the Anthropic API with your key; only the resulting text is stored.

## Setup
**GitHub:** create an app at https://github.com/settings/developers with the callback URL `<BASE_URL>/auth/callback` and put its Client ID/secret in `.env`.
- **OAuth App:** simplest, public repos only.
- **GitHub App:** also private repos. Permissions: Repository > Metadata: read, Contents: read, nothing else. Set `GITHUB_APP_SLUG` so Settings shows an install link; install it on "All repositories" so every repo shows up.

**Supabase** (the free tier is enough): run [`supabase/schema.sql`](supabase/schema.sql) once in the SQL editor, then copy the URL and secret key into `.env`. For local development, `supabase start` (Docker) works too.

**Upgrading** from the version with the Central Cemetery: run [`supabase/migrate-private-cemeteries.sql`](supabase/migrate-private-cemeteries.sql) once. Graves stay in their owner's cemetery and are re-checked at the next sync. (Coming from the single shared cemetery? Run [`migrate-own-cemeteries.sql`](supabase/migrate-own-cemeteries.sql) first.)

## Hosting on Vercel
1. Create a Supabase project and run `supabase/schema.sql`.
2. Import the repo in Vercel (no framework, no build step; `vercel.json` does the rest).
3. Set the env vars from `.env.example`. Set `BASE_URL` to the production URL, leave out `DEV_LOGIN`.

Vercel runs `server.js` as one function, `public/` is static. The GitHub token lives only in your encrypted, HttpOnly session cookie, never in the database, so syncing happens while you visit; there is no background job. Only numbers, dates, the description and commit messages are stored, never code.

## Tombstones
| Metric | Grave |
|---|---|
| 1 commit | Wooden cross |
| 2–49 commits | Headstone |
| 50+ commits | Marble |
| 50+ stars | Mausoleum |

The language tints the material.

Architecture: `server.js` (Node HTTP handler, also the Vercel function), `public/index.html` (canvas game), `rules.js` (rules + tests), `supabase/schema.sql` (tables).

## License
[MIT](LICENSE)
