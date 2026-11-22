# Mixtape Mode

Make digital cassette tapes out of Spotify songs and send them to your friends as
links. No backend: the whole tape lives in the URL.

- `docs/SPEC.md` is the source of truth for v1.
- `docs/DECISIONS.md` records decisions the spec does not cover.
- `design-reference/` is the approved visual design. Reference, not code to import.

A README for testers lands in Milestone 6.

## Requirements

- Node 24 (or any current LTS) and npm
- The Spotify app is in Development Mode: **5 users maximum**, each added by email
  in the developer dashboard, and every one of them needs full Spotify Premium
  (not Mini, not Lite).

## Local setup (PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local
notepad .env.local   # paste the Client ID from the Spotify dashboard
npm run dev
```

Then open **<http://127.0.0.1:5173/>**.

Do not open the app via `localhost`. Spotify will not accept `localhost` as a
redirect URI, so the login round trip will fail with a redirect mismatch. The
dev server is pinned to `127.0.0.1:5173` with `strictPort`, so if the port is
busy the server refuses to start rather than quietly moving.

## Scripts

| Command              | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run dev`        | Dev server on <http://127.0.0.1:5173/>                     |
| `npm run build`      | Type-check and build to `dist/` with base `/mixtape-mode/` |
| `npm run preview`    | Serve the production build locally                         |
| `npm run lint`       | ESLint                                                     |
| `npm test`           | Vitest, once                                               |
| `npm run test:watch` | Vitest, watching                                           |
| `npm run format`     | Prettier, writing                                          |

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds
and publishes to GitHub Pages at <https://tayjoleo.github.io/mixtape-mode/>.

The build reads the Client ID from a repository **variable** named
`VITE_SPOTIFY_CLIENT_ID` (Settings, Secrets and variables, Actions, Variables).
It is a public value, so it is a variable rather than a secret. There is no
client secret anywhere in this project.
