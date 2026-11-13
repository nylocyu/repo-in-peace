# 🪦 Repo in Peace

A 2D pixel cemetery for unfinished vibe-coding projects. Bury your public GitHub repos, walk around the graveyard and pay your respects to others.

```bash
cp .env.example .env   # fill in
npm install
npm start              # http://localhost:3000
npm test
```

**Controls:** WASD/arrows or tap to walk · Enter: speak · B: bury (here on an empty plot, otherwise random plot) · F: pay respects · 1: flower · 2: candle

## Burying
- Walk to an empty plot and choose "Bury a repo here", or use "Bury a repo" in the header to get a random free plot.
- The cemetery fills from the front; there is always one empty row at the back, so it grows as needed.

## Rules
- Sign in with GitHub OAuth; only users with admin rights on a repo may bury it. Public repos only.
- Dead only after 90 days without a commit (`DEAD_AFTER` in `rules.js`). Until then the repo lies in its plot in a **hospice** bed.
- A new commit after the funeral leaves the grave empty (**zombie**). After 90 more quiet days it rests again.
- Whoever buried a repo can remove the grave at any time.

## Tombstones
| Metric | Grave |
|---|---|
| 1 commit | Wooden cross |
| 2–49 commits | Headstone |
| 50+ commits | Marble |
| 50+ stars | Mausoleum |

The language tints the material. Claude writes the obituary from the README (`ANTHROPIC_API_KEY`).

Architecture: `server.js` (Node HTTP, SSE for multiplayer, JSON file in `data/`), `public/index.html` (canvas game), `rules.js` (rules + tests).
