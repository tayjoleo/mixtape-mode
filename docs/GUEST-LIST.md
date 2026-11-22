# Letting a tester in

What to do each time you want to add somebody. Takes about two minutes.

## First, settle which quota mode the app is in

This changes the answer to "how many people can I add", so it is worth knowing
before you promise anyone a spot.

Open **<https://tayjoleo.github.io/mixtape-mode/#/check>**, log in, and press
**Check the API**. It reports three things:

| Reading                                           | Means                                            |
| ------------------------------------------------- | ------------------------------------------------ |
| Batch `GET /tracks` returned 2                    | Extended quota. No five-user cap, no guest list. |
| Search with `limit=50` returned more than 10      | Extended quota.                                  |
| `/me` still returns `product`, `email`, `country` | Extended quota.                                  |
| All three refused or capped                       | Development Mode. The rest of this page applies. |

As of 2026-11-22 the live app returns `product`, `email` and `country` from
`/me`, which Spotify's own February 2026 migration guide says should be gone
for Development Mode apps. So this is genuinely unclear and the probe is the
only honest way to settle it. **Run it once and write the answer here.**

> Quota mode as of _(date)_: _(fill in)_

If it turns out to be extended quota, everything below is unnecessary — anyone
with full Premium can play a tape, and you can skip straight to sending links.

## Adding somebody (Development Mode)

1. Ask them for **the email address on their Spotify account**. Not their usual
   email — the one Spotify has. They can read it off
   [spotify.com/account](https://www.spotify.com/account/overview/). Getting
   this wrong is the single most common reason someone cannot get in.

2. Ask them to confirm they have **full Premium**. Not free, not Premium Mini,
   not Premium Lite. The mobile-only plans cannot stream through the Web
   Playback SDK at all, and it fails at the moment they press play rather than
   at login, which is a confusing way to find out.

3. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard),
   open the Mixtape Mode app, then **Settings → User Management**.

4. Add their **name** and their **Spotify account email**. Save.

5. Send them the app link and [the README](../README.md).

### The cap

Development Mode allows **five users in total, including you**. There is no way
to buy more; the only route past it is applying for extended quota, which needs
a real company behind it. So the five slots are:

| Slot | Who            |
| ---- | -------------- |
| 1    | Taylor (owner) |
| 2    |                |
| 3    |                |
| 4    |                |
| 5    |                |

Fill that in as you go. Removing somebody frees their slot immediately.

Your own Premium matters too: Development Mode apps stop working for everybody
if the **owner's** Premium lapses.

## When somebody says it will not work

Work through these in order. The first two cover almost everything.

1. **Are they on the list, with the right email?** A missing or mistyped
   address shows up as "You're not on the guest list yet". Check the spelling
   in User Management against what they sent.

2. **Is it really full Premium?** Shows up as "This one needs full Premium",
   or as a failure the moment they press play. Mini and Lite both look like
   Premium to the person paying for them.

3. **Are they on a supported browser?** Chrome, Firefox, Safari or Edge, with
   protected content allowed. A browser that blocks DRM cannot play anything.

4. **Get the debug log.** Ask them to open the link with `?debug=1` before the
   `#`, press the **Debug** button, then **Copy log**. It records every API
   call and SDK event with timestamps, and has their email and account id
   redacted out. That log has found every real bug in this project so far.

5. **Offer the fallback.** If the in-page deck will not start, the player shows
   **Play in my Spotify app**, which drives whatever Spotify app they already
   have open. Warn them that their own Spotify app shows the song names, so the
   surprise is spoiled in that mode.

## Checklist for a new tester

- [ ] Asked for the email on their Spotify account, not their usual one
- [ ] Confirmed full Premium, not Mini or Lite
- [ ] Added in Settings → User Management and saved
- [ ] Noted which of the five slots they took
- [ ] Sent them the app link and the README
- [ ] Sent them an actual tape, so their first run is the real thing
