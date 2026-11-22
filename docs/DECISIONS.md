# Decisions

One line each: date, decision, why. Only things the spec does not already settle.

- 2026-11-21: Shell and reel enums stay semantic (`ShellId`, `ReelId`) and the `<Cassette>` component looks up the colour and the `clear` flag internally. Why: the design reference passes raw colours as props, but the tape format in the spec stores ids, and ids are what survive in the URL.
- 2026-11-21: Shell colours are the eight values from `Main.dc.html`'s script, in the spec's enum order (`clear-green`, `clear-cyan`, `crystal`, `clear-smoke`, `hot-pink`, `sunshine`, `lime`, `jet-black`); reels are the four from the same file. Why: the reference wins on looks, and the orders already match.
- 2026-11-21: Doodle paths are `M`/`L` only, per the spec's `^[ML0-9 ,.-]+$` validator. Why: the sample doodles in `Player.dc.html` use `C` and `Q` curves, but the doodle pad only ever emits `M`/`L`, and the spec wins on behaviour.
- 2026-11-21: Header nav is "My tapes" and "Make a tape" only. Why: Templates and Gallery are out of scope for v1 (spec section 9), so linking to them would be a dead end.
- 2026-11-21: J-card ink pair and misregistration live inside the maker rather than on a separate "Design the J-card" page. Why: spec section 6 puts those controls in the maker's Looks part.
- 2026-11-21: "C-60" on the spine and the retail sticker, and "Side A + B" on the riso cover, stay as decorative static text. Why: the tape format has no length field and adding one would cost URL characters for no gain.
- 2026-11-21: The shelf's detail line shows song counts and the seal state instead of the reference's "Sent to 2 people". Why: there is no backend, so send counts are unknowable.
- 2026-11-21: Unavailable tracks are detected with `GET /tracks/{id}?market=from_token` and its `is_playable` field. Why: the spec requires marking them on the J-card but does not say how to find them.
- 2026-11-21: Commit messages carry no tool attribution or co-author lines. Why: spec section 10.
- 2026-11-21: The redirect URI is built as `window.location.origin + import.meta.env.BASE_URL` and checked against a hardcoded registered list, throwing on anything else. Why: the two URIs in the dashboard are exactly the dev origin plus `/` and the Pages origin plus `/mixtape-mode/`, so one rule covers both and a mismatch fails loudly here instead of silently on Spotify's authorize page.
