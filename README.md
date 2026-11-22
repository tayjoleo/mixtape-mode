# Mixtape Mode

Somebody made you a tape.

Mixtape Mode turns Spotify songs into a cassette you can hand to someone. The
maker picks the songs, decorates the shell, scribbles on the label, and sends
you a link. You open it, press play, and the songs stay a surprise — the way a
mixtape is supposed to work.

**<https://tayjoleo.github.io/mixtape-mode/>**

---

## Before it will play

Two things, both Spotify's rules rather than ours.

**You need full Spotify Premium.** Not the free tier, and not the mobile-only
plans — Premium Mini and Premium Lite cannot stream through anything but
Spotify's own app. If you are not sure which you have, check
[spotify.com/account](https://www.spotify.com/account/overview/).

**Taylor has to add you by hand.** The app is private, so your Spotify account
has to be on the list before it will let you in. Send him the email address
your _Spotify account_ uses — not always the one you would expect, and it is on
that same account page.

Until you are added, you can still see the tape. You just cannot play it.

## Playing a tape

1. Open the link.
2. You will see the cassette straight away, with whatever the maker drew on it.
3. Press **Log in with Spotify**. It brings you back to the same tape.
4. Press play.

The music comes out of **the browser tab**, not your Spotify app, so check your
volume and that the tab is not muted. If Spotify is already playing somewhere
else on your account, starting a tape here takes playback over.

**Turn your phone sideways.** A cassette is a landscape object, and held that
way the tape fills the screen with the transport keys along the bottom, like a
deck. It works upright too, it is just not as nice.

## The songs are hidden on purpose

You will not see song names while a tape plays. That is the whole point.

They are never more than one tap away, though — press **J-card** and the
tracklist is right there, with every artist and album, and a link to open any
song in Spotify. If the maker sealed the J-card, there is a **Peek anyway**
button that always works. Finishing Side A opens it for good.

## The other keys

- **Rew** goes back a song, or restarts the current one if you are more than
  three seconds in.
- **F.Fwd** skips ahead. At the end of a side it stops, the way a tape does.
- **Flip** turns the tape over to Side B. Some tapes do not have one.
- **Stop** stops.

When a side runs out, playback stops and the tape offers to flip. It never
shuffles — a mixtape is in the order the maker chose.

## Making your own

**Make a tape** in the top bar. Pick songs by searching Spotify or pulling from
one of your own playlists, decorate the shell, draw on the label, and you get a
link to send. Tapes you make and tapes people send you both live on **My
tapes**.

One catch on playlists: Spotify only opens up playlists you own or collaborate
on. A playlist you merely follow will come back empty. Search for the songs
instead.

## If it will not play

Most of the time it is one of these:

| What you see                           | What it usually means                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| "You're not on the guest list yet"     | Your Spotify account has not been added. Send Taylor the email on your Spotify account.                                          |
| "This one needs full Premium"          | The account is free, Mini or Lite. Spotify will not let outside apps stream on those.                                            |
| "The deck on this page will not start" | The in-page player did not come up. Use **Play in my Spotify app** — your own Spotify app will show the song names in that mode. |
| "This tape got chewed up"              | The link is damaged, usually from losing its tail when pasted into a chat. Ask for the whole link again.                         |
| Nothing happens when you press play    | Press it once more. Browsers only let audio start from a real tap, and the first one sometimes gets eaten.                       |

### Sending a useful bug report

Add `?debug=1` to the link, just before the `#`:

```
https://tayjoleo.github.io/mixtape-mode/?debug=1#/t/...
```

A **Debug** button appears in the bottom right. Open it, press **Copy log**, and
paste that. It has every step the app took with timestamps, which is far more
use than "it did not work".

The log has your email and account id stripped out of it before you ever see
it, so it is safe to paste.

## What this is not

It is five people's worth of private, held together with a link. There is no
account, no server and no database — the entire tape, songs and doodles and
all, is encoded into the URL you were sent. Lose the link and the tape is gone.
Keep it and it works forever.
