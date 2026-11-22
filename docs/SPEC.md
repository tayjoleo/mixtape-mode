# Mixtape Mode: v1 build spec

This file is the source of truth for v1. If anything here conflicts with what you find in the code or the Spotify docs, stop and raise it instead of guessing.

## 1. What we are building

Mixtape Mode lets a small group make digital cassette tapes out of Spotify songs and send them to each other as links.

- The **maker** picks songs for Side A and Side B, decorates the cassette (shell, reels, sticker, handwriting, doodles) and the J-card cover, and gets a link to send.
- The **listener** opens the link and sees the cassette. They log in with Spotify and press play. Song names are hidden while it plays, like a real mixtape.
- The **J-card** holds the tracklist and the Spotify credits. The maker can seal it until Side A ends. The listener can always peek, so the song info is never more than a tap away.
- The **shelf** shows the tapes you made and the tapes people sent you, stacked as spines.

The feeling we are after: the surprise and personality of a handmade 90s mixtape. Every decision should protect that.

## 2. Hard constraints (verified, do not work around them)

### Spotify Development Mode
- The app is in Development Mode. Maximum **5 users total**, including the owner. Each user must be added by email in the Spotify developer dashboard (User Management). An unregistered user gets a 403 from the API.
- The app owner and **every listener need full Spotify Premium**. Mobile-only Premium plans (Mini, Lite) do not work with the Web Playback SDK.
- Since February 2026, Development Mode apps have a reduced endpoint set:
  - `GET /search`: max `limit` is 10 (default 5). Paginate with `offset`.
  - Batch `GET /tracks` is **removed**. Use `GET /tracks/{id}` once per track. Keep calls low (cache results).
  - Playlist tracks endpoints are renamed from `/tracks` to `/items`. `GET /playlists/{id}/items` only works for playlists the user owns or collaborates on. Response fields renamed: `tracks` to `items`, nested `track` to `item`.
  - Browse, new releases, categories and artist top tracks are removed. `GET /users/{id}` and `GET /users/{id}/playlists` are removed: use `/me` and `/me/playlists`.
- Endpoints v1 expects to use: `GET /me`, `GET /me/playlists`, `GET /playlists/{id}/items`, `GET /search`, `GET /tracks/{id}`, `PUT /me/player` (transfer), `PUT /me/player/play?device_id=`, `PUT /me/player/shuffle`, `PUT /me/player/repeat`, `GET /me/player/devices`, plus the Web Playback SDK. If any of these returns 403 or 404 in Development Mode, stop and report it.

### Redirect URIs
- Spotify requires HTTPS redirect URIs, except loopback IP literals. **`localhost` is not allowed.**
- Local dev runs on `http://127.0.0.1:5173/` (Vite `server.host = '127.0.0.1'`, `port = 5173`, `strictPort = true`). Never open the app via `localhost`, or the redirect will not match.
- Production runs on GitHub Pages: `https://<github-user>.github.io/mixtape-mode/`.
- Both URIs are registered in the dashboard exactly as written above, trailing slash included. The app must send the matching one based on `window.location.origin`.

### Spotify display rules
- Spotify's design guidelines say metadata (track, artist, album) must be presented as Spotify provides it, must stay legible, and the user must always be able to view it. Do not alter track names.
- Our approach: metadata is hidden during play but **always one tap away** on the J-card (the "Peek" button works even when sealed). The J-card shows track name, artists and album exactly as returned by the API, plus Spotify attribution and an "Open in Spotify" link per track.
- Use the **official Spotify logo files** from Spotify's Design and Branding Guidelines page (https://developer.spotify.com/documentation/design). Do not redraw the logo. Until Taylor drops the official files into `public/brand/`, render a clearly labelled placeholder box.

### Phones
- Spotify's docs say the Web Playback SDK supports Chrome, Firefox, Safari and Edge on desktop and mobile, with limits around autoplay and background play on phones.
- The first play must come from a user tap, and that tap handler must call `player.activateElement()` before starting playback.
- Fallback: if the SDK device is not `ready` within 10 seconds, or emits an `initialization_error`, `account_error` or `playback_error` on a phone, offer **"Play in my Spotify app instead"**. That uses `GET /me/player/devices` and `PUT /me/player/play` against the user's active device, and the tape page acts as the remote. Tell the user plainly that their Spotify app will show the song names in this mode.

## 3. Stack and project setup

- **Vite + React + TypeScript.** No UI component library. Plain CSS with custom properties (one `tokens.css`, then a CSS file per component). No Tailwind.
- **lz-string** for compressing tape data into the URL. **Vitest** for unit tests. ESLint + Prettier with default-ish settings.
- **No backend.** Everything runs in the browser. Auth is Authorization Code with PKCE. There is no client secret anywhere in this project.
- **Routing:** hash-based, so it works on GitHub Pages without server rewrites.
  - `#/` = shelf
  - `#/make` = maker
  - `#/t/<payload>` = a tape (player)
  - The OAuth redirect comes back to the base URL with `?code=...` in the query. Handle that on app load (see section 4).
- **Config:** the Spotify Client ID comes from `import.meta.env.VITE_SPOTIFY_CLIENT_ID`. Locally from `.env.local` (git-ignored). In CI from a GitHub repository **variable** of the same name. The Client ID is public, but it still does not get hard-coded.
- **Vite `base`:** `/mixtape-mode/` for production builds, `/` for dev.
- **Deploy:** GitHub Actions workflow that builds on push to `main` and deploys to GitHub Pages with the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions.
- **Dev machine:** Windows with PowerShell. Every command you give Taylor must work in PowerShell. Never use bash-only syntax (no `export`, no `rm -rf`, no `&&` chains if PowerShell 5 is in use: check `$PSVersionTable` once and adapt).

## 4. Auth (PKCE in the browser)

- Scopes: `streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative`.
- Before redirecting to Spotify: generate the code verifier and state, store them in `sessionStorage`, and **store the current `location.hash` in `sessionStorage` as `mm.returnTo`**. This matters: a listener who opens a tape link and logs in must land back on that same tape. The fragment does not survive the OAuth round trip by itself.
- On load, if `?code=` and `state` are present: verify state, exchange the code for tokens, then `history.replaceState` to remove the query string and restore `mm.returnTo` as the hash.
- Store access token, refresh token and expiry in `localStorage`. Refresh automatically before expiry and on a 401 (once, then log out).
- After login, call `GET /me`:
  - `product !== 'premium'`: show a friendly screen that explains full Premium is needed.
  - 403 on `/me` (user not added to the app): show "You're not on the guest list yet. Ask Taylor to add the email on your Spotify account." Include the email field from the error context if available. Never show raw error JSON to users. Put details in the debug panel instead.
- "Log out" clears tokens and the SDK player.

## 5. The tape format

A tape lives entirely in the link. There is no database.

```ts
type ShellId = 'clear-green' | 'clear-cyan' | 'crystal' | 'clear-smoke' | 'hot-pink' | 'sunshine' | 'lime' | 'jet-black';
type ReelId = 'white' | 'pink' | 'yellow' | 'grey';
type StickerId = 'strip' | 'lined' | 'tape' | 'retail';
type FontId = 'permanent-marker' | 'caveat' | 'rock-salt' | 'gochi-hand';
type InkId = 'black' | 'red' | 'blue' | 'pink';
type InkPairId = 'pink-blue' | 'red-green' | 'yellow-purple' | 'pink-black';

type Tape = {
  v: 1;                       // format version, for future migrations
  id: string;                 // 8 random base62 chars
  title: string;              // label text, max 28 chars
  from: string;               // maker display name, max 24 chars
  to?: string;                // optional, max 24 chars
  shell: ShellId;
  reels: ReelId;
  sticker: StickerId;
  font: FontId;
  ink: InkId;
  doodles: string[];          // SVG path data in a 300x80 viewBox, integer coords
  sealed: boolean;            // J-card sealed until Side A ends
  cover: { inks: InkPairId; misregister: number }; // misregister 0-8 px
  sides: { a: string[]; b: string[] }; // Spotify track IDs, 1-10 per side (B may be empty)
  createdAt: number;          // ms epoch
};
```

Encoding:
- Map to short keys, `JSON.stringify`, then `LZString.compressToEncodedURIComponent`. The link is `<base>#/t/<payload>`.
- Doodles: simplify each stroke (Ramer-Douglas-Peucker, tolerance about 1.5) and round coordinates. Cap total doodle path data at 1,500 characters. If the cap is hit, the maker UI says "That's all the ink this label holds" and stops accepting strokes.
- Budget: a full tape (10 + 10 tracks, a few doodles) should stay under about 2,000 characters of URL. Write a test that asserts this.

Decoding and safety (the payload is **untrusted input**, since anyone can craft a link):
- Validate every field. Unknown enum values fall back to defaults. Clamp string lengths. Track IDs must match `^[A-Za-z0-9]{22}$` (drop any that do not). Doodle paths must match `^[ML0-9 ,.-]+$` (drop any that do not).
- Render user strings as text only. Never use `dangerouslySetInnerHTML`.
- A link that fails to decode shows a "This tape got chewed up" screen, not a crash.

Unit tests (Vitest): round trip, every enum fallback, malicious strings and paths, oversized input, the URL length budget, and decoding a hand-written v1 payload fixture so future changes do not break old links.

## 6. Screens and behaviour

The visual design is in `design-reference/`. Read `design-reference/README.md` first. Match the look closely: it is the product.

### Shelf (`#/`)
- Two tabs: "Made by me" and "Sent to me". Tapes are saved in `localStorage` (`mm.shelf`) as `{ payload, role: 'made' | 'received', savedAt }`.
- Spines stacked with slight random tilts (seeded by tape id, so they do not jump around). Selecting one slides it out and shows the cassette plus Play, Edit (made only, opens the maker prefilled), and Copy link.
- Empty state: "Your shelf is empty. Make a tape." with a link to the maker.
- Opening any tape link adds it to "Sent to me" automatically (unless it is already there as "made").

### Maker (`#/make`)
Two parts: songs and looks.

**Songs**
- Search (`GET /search?type=track&limit=10`, "More results" uses `offset`). Debounce typing by 300 ms.
- "From my playlists": `GET /me/playlists`, then `GET /playlists/{id}/items` for the chosen one. Only the user's own or collaborative playlists will return items. Handle the empty case with a short explanation.
- Add a song to Side A or Side B. Reorder with up and down buttons (keyboard friendly). Remove. Maximum 10 per side, Side A needs at least 1.
- In the maker, the maker sees full song info. Hiding only applies to the listener.

**Looks** (live preview of the cassette at the top, same as the design reference)
- Shell (8 options, 4 of them clear), reels (4), sticker (4), label text, handwriting font (4), ink (4), doodle pad (pointer events, works with mouse, finger and pen; "Clear doodles" button).
- J-card cover: ink pair (4) and misregistration slider (0-8 px), with a live preview of the riso cover.
- Seal toggle: "Seal the J-card until Side A ends" (default on).
- From (prefilled from `/me` `display_name`, editable) and optional To.

**Make the tape**
- Encodes the tape, saves it to the shelf as "made", and shows the link with "Copy link" and, where `navigator.share` exists, "Share".
- Reminder text under the link: "Only people on the guest list can play it." (the 5-user limit).

### Player (`#/t/<payload>`)
- Decode first. Show the cassette, title, "from <name>" and the controls **before** login. The tape is visible to anyone. Playing needs login.
- Logged out: big "Log in with Spotify to play" button.
- Logged in:
  1. Load the SDK script once. Create the player (name: "Mixtape Mode"). Show "Warming up the deck..." until `ready`.
  2. On the first play tap: `player.activateElement()`, then `PUT /me/player/shuffle?state=false` and `PUT /me/player/repeat?state=off` (a mixtape must never shuffle), then `PUT /me/player/play?device_id=<id>` with `uris` = the current side's tracks and `offset.position` = the current index.
  3. Track position is derived from `player_state_changed`: match the current track id to the side's list. Show "Side A · Track 2 of 5". **Never render the track name, artist, album or cover art anywhere outside the J-card.**
  4. Reels spin while playing, stop when paused (respect `prefers-reduced-motion`: no spin, show a small "playing" indicator instead).
  5. Progress bar from `getCurrentState()` polled every 500 ms while playing.
  6. Rewind = previous track in this side (or restart the current one if more than 3 seconds in). Fast forward = next track in this side.
  7. **End of a side:** playback stops after the side's last track (repeat is off). Show a "Flip the tape" prompt. Flipping loads the other side from track 1. Ending Side A also unseals the J-card.
  8. "Flip to Side B/A" is always available.
- **J-card** (bottom sheet on phones, side panel on wide screens):
  - Sealed and not peeked: SEALED stamp, "<from> sealed this until Side A ends.", and a "Peek anyway" button.
  - Otherwise: the tracklist for both sides, current track highlighted, each row showing name, artists and album from `GET /tracks/{id}` (fetched lazily the first time the J-card opens, cached in memory and `sessionStorage`), an "Open in Spotify" link (`external_urls.spotify`), and the Spotify attribution block.
  - The riso cover and spine are shown on the J-card too.
- Media Session: the browser or OS may show the current song on the lock screen through the SDK. We cannot fully control that, and it is acceptable. Do not add our own Media Session metadata.
- Phone fallback as described in section 2.

### Error and edge screens (all in the same visual language)
Not Premium. Not on the guest list. SDK failed to initialise (with the fallback offer). Track unavailable in the listener's country (skip it, mark it on the J-card as unavailable). Chewed-up link. Offline.

### Debug panel
A small toggle (only visible when `?debug=1` is in the URL, or always in dev) that lists every SDK event, API call status and error with timestamps. This is what we use to diagnose Milestone 1.

## 7. Visual design tokens

Pop-art, punk-leaning, tactile. Thick black outlines, flat saturated colour, halftone dots, offset hard shadows.

- Ink black `#111111`. Paper `#FFF4DC` with a halftone dot background (`radial-gradient(#EFCB9E 1.3px, transparent 1.5px)` at `14px`). Card white `#FFFDF5`.
- Accents: hot pink `#FF3D7F`, sunshine `#FFD23F`, electric blue `#2EC4F1`, lime `#9BE564`, red `#E63946`, deep pink `#D6246E`, blue ink `#1D4ED8`.
- Riso inks: pink `#FF48B0`, blue `#0078BF`, red `#FF665E`, green `#00A95C`, yellow `#FFE800`, purple `#765BA7`, black `#1A1A1A`. Riso layers use `mix-blend-mode: multiply` on a paper base `#F3ECDD`.
- Borders 3 to 4 px `#111111`. Radii: cards 20 px, pills 999 px. Shadows: hard offset `8px 8px 0 #111111` (cards), `4px 4px 0` (buttons).
- Fonts (Google Fonts): Bungee (display), Space Grotesk 400/500/700 (body), and the handwriting set: Permanent Marker, Caveat 600, Rock Salt, Gochi Hand.
- The cassette is a fixed 360 x 228 drawing. Port its exact geometry from `design-reference/Cassette.dc.html` into a `<Cassette>` React component, then scale it with CSS transforms where needed.
- Accessibility: real `<button>`, `<a>`, `<input>` and `<label>` elements. Visible focus styles (4 px offset outline). Text contrast at least 4.5:1. Touch targets at least 44 px. Icon-only buttons get `aria-label`. Decorative SVG gets `aria-hidden="true"`.

## 8. Milestones

Work through these in order. **At the end of each milestone, stop, summarise what you did and how to check it, and wait for Taylor.** Do not start the next milestone on your own.

- **M0 Scaffold.** Vite + React + TS, lint, test setup, `.gitignore` (including `.env.local`), Pages workflow, and a placeholder page deployed to GitHub Pages. Checkpoint: give Taylor the live URL so he can confirm it matches the redirect URI in the dashboard.
- **M1 Go / no-go.** PKCE login, `/me` check, SDK device `ready`, and playing one hardcoded track, both on `http://127.0.0.1:5173/` and on the Pages URL, with the debug panel on. There are reports of `player.connect()` hanging for some Development Mode apps in 2026. If `ready` never fires: **stop**. Collect diagnostics (browser and version, console output, the network requests to Spotify's player and license endpoints, the debug panel log) and report. Do not build further until Taylor decides.
- **M2 Tape format.** Types, encode and decode, validation, and the full unit test list from section 5.
- **M3 Player.** The complete listener experience, driven by a hardcoded test tape link. Includes the J-card, seal and peek, flip, end-of-side behaviour, and error screens.
- **M4 Maker.** Song picker, decoration, live previews, doodle pad, link generation.
- **M5 Shelf and polish.** Shelf, empty states, the phone pass (including the Spotify app fallback), reduced motion, final accessibility pass.
- **M6 Friends test.** A short `README.md` for testers: what it is, that they need full Premium, how to open a tape, what to do if it will not play. Plus a checklist for Taylor to add each tester in the dashboard.

## 9. Out of scope for v1

Uploaded art, the public gallery, downloadable templates, accounts or any backend, analytics, more than 5 users. The design reference has mockups for some of these under `design-reference/later/`. Do not build them, but do not paint the code into a corner either: keep the cover and label rendering behind components that could later take an image.

## 10. Working rules

- Read this spec and `design-reference/README.md` fully before writing code. Raise questions or conflicts first.
- Do not guess Spotify API behaviour. When unsure, check https://developer.spotify.com/documentation and say what you checked.
- Small, focused commits with plain descriptive messages. **No tool attribution or co-author lines in commit messages.**
- No secrets in the repo. There is no client secret in this design. If you ever think you need one, stop and ask.
- Record decisions that are not in this spec in `docs/DECISIONS.md` (one line each: date, decision, why).
- Keep dependencies minimal. Ask before adding anything beyond React, React DOM, lz-string, and dev tooling.
