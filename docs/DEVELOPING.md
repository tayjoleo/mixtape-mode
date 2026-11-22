# Developing Mixtape Mode

For working on the app. Testers want [the README](../README.md) instead.

- `docs/SPEC.md` is the source of truth for v1.
- `docs/DECISIONS.md` records decisions the spec does not cover, including
  several places where the live Spotify API did not match the documentation.
- `docs/GUEST-LIST.md` is the checklist for letting a new tester in.
- `design-reference/` is the approved visual design. Reference, not code to import.

## Routes

| Hash               | Screen                                                     |
| ------------------ | ---------------------------------------------------------- |
| `#/`               | The shelf                                                  |
| `#/make`           | The maker                                                  |
| `#/make/<payload>` | The maker, prefilled, for editing a tape                   |
| `#/t/<payload>`    | A tape                                                     |
| `#/check`          | Login, SDK and API diagnostics, left over from Milestone 1 |

Add `?debug=1` before the hash to keep the debug panel open in a production
build. It is always on in dev.

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

## Where the awkward parts are

- `src/tape/` is the format: types, validation, encoding. The payload is
  untrusted input, so `validate.ts` never throws and never trusts a field.
- `src/player/playback.ts` holds the position and end-of-side logic as pure
  functions, so the fiddly parts are testable without a browser or an account.
- `src/lib/spotify.ts` is the only place that talks to the Web API, so the
  401-refresh-once rule and the debug logging live in one spot.
- `src/hooks/usePlayer.ts` owns the Web Playback SDK: script load, connect, the
  ten second `ready` deadline, and the Spotify app fallback.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, builds
and publishes to GitHub Pages at <https://tayjoleo.github.io/mixtape-mode/>.

The build reads the Client ID from a repository **variable** named
`VITE_SPOTIFY_CLIENT_ID` (Settings, Secrets and variables, Actions, Variables).
It is a public value, so it is a variable rather than a secret. There is no
client secret anywhere in this project.
