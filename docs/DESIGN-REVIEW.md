# For the design team

Read this first. It says which parts of the app are approved design and which
are an engineer's extrapolation, so you can spend your attention where it is
actually worth something.

**The app:** <https://tayjoleo.github.io/mixtape-mode/>
**The approved design:** `design-reference/` — open the `.dc.html` files in a
browser, or read the inline styles, which are the source of truth for every
size, colour, border and shadow.

You will need a Spotify account with **full Premium**, added to the app's
guest list, before anything will play. See [the README](../README.md). The
visuals are all reachable without that; only playback needs it.

## The short version

Roughly half of what you will see was drawn by a designer and ported
faithfully. The other half I invented, because the brief needed screens that no
mockup covered. **The invented half is where you should look.**

## Approved design, ported faithfully

Treat differences here as bugs in my port, not as design proposals.

| What                             | Source             | Notes                                                                                                                       |
| -------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| The cassette                     | `Cassette.dc.html` | A fixed 360×228 drawing, 372×240 with its shadow. Every coordinate is a direct port. Scaled with transforms, never redrawn. |
| Shelf: rack, spines, detail card | `Shelf.dc.html`    | Spine tilts are seeded from the tape id so they never jump between renders.                                                 |
| Maker: live preview, cards 01–03 | `Main.dc.html`     | Shell, sticker and writing cards, and the doodle pad's pointer logic.                                                       |
| J-card riso cover and spine      | `JCard.dc.html`    | See the caveat below — mine renders at about a quarter the size.                                                            |
| Player, portrait                 | `Player.dc.html`   | The stacked phone layout.                                                                                                   |
| Colour, type, spacing tokens     | `docs/SPEC.md` §7  | All in `src/styles/tokens.css`.                                                                                             |

## Invented, with no mockup to work from

This is the list worth your time. Nothing here was designed; it was extrapolated
from the visual language of the files above.

**The landscape-phone deck.** Turn a phone sideways on a tape and you get a
different layout, not a responsive variant of the portrait one: the cassette
scales to fill the screen and the controls become mechanical transport keys
along the bottom, like a deck. The keys sit on a hard shadow that collapses as
they sink, and PLAY stays latched down while the tape runs. This came from a
one-line brief ("a cassette fits a phone sideways, maybe with boombox buttons")
and has had no design pass at all.

**The song picker.** `Main.dc.html` has a button reading "Add songs from
Spotify" and nothing behind it. The whole search, playlist, add-to-side and
reorder interface is mine.

**The J-card as a side panel.** The reference draws the J-card unfolded at
1100px wide, and separately as a bottom sheet on a phone. The wide-screen side
panel, the per-row "Spotify" pill, and the decision to set track metadata in
the body face rather than the handwriting face are all mine. The last one is
constrained: Spotify's design rules require metadata to stay legible and to be
presented as they supply it.

**The riso cover at small size.** The reference cover is a 1100px-wide print.
Mine renders at roughly 300px inside the J-card panel, and the ink shapes do a
lot of work at that scale. I am least confident about this one.

**Every error and empty screen.** None exist in the reference:

- "This tape got chewed up" (three variants: unreadable, wrong version, no songs)
- "You're not on the guest list yet"
- "This one needs full Premium"
- "No connection"
- "Nothing here" (unknown route)
- The end-of-side prompt and the flip offer
- The "play in my Spotify app" fallback panel
- Both empty shelf states

**Smaller inventions.** Maker cards 04 (J-card inks and misregistration) and 06
(from and to), the "here is the link" block, the doodle pad's ink meter, the
debug panel, and the shelf's derived spine colours.

## Constraints you cannot design around

These are not preferences. They will break the product if ignored.

**The whole tape lives in the URL.** No server, no database. Every decoration
choice costs characters in a link someone has to paste into a chat. A full
tape with ten songs a side and the label inked to its cap is about 1,650
characters against a 2,000 budget. Richer decoration means a longer link, and
uploaded artwork is impossible in this architecture.

**Song names are hidden during playback, everywhere except the J-card.** That
is the product. But Spotify's rules also say metadata must always be available
and legible, so the J-card must stay one tap away at all times — the "Peek
anyway" button works even on a sealed tape, by design.

**The Spotify logo must be the official file, never redrawn or recoloured.**
It currently renders as a labelled placeholder because the real files have not
been dropped into `public/brand/` yet.

**Touch targets are 44px and text contrast is 4.5:1.** Spine lettering already
falls back automatically when a tape's own ink would be unreadable on its own
shell — black ink on a jet black shell is something a user can choose.

## Where things live

| Path                    | What                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| `src/styles/tokens.css` | Every colour, border, radius, shadow and font                      |
| `src/tape/palette.ts`   | What each shell, reel, sticker, font, ink and riso pair looks like |
| `src/components/`       | Cassette, JCard, RisoCover, DoodlePad, SongPicker, DeckKeys        |
| `src/screens/`          | Player, Maker, Shelf, and the error screens                        |
| `docs/DECISIONS.md`     | Every departure from the reference, with the reason                |

CSS is one file per component, co-located and named after it, with
`mm-block__element--modifier` class names throughout. A note like "the spine
band is too wide" maps straight to `src/screens/Shelf.css`.

## Known rough edges

Things I already suspect are weak, so you do not have to spend time telling me:

- The riso cover at J-card size.
- The landscape deck has had no design pass.
- The cassette label truncates with an ellipsis at 226px, so a long title
  becomes "Kitchen Dance Pa…". That is the reference's own behaviour, but it is
  worth deciding whether it should be.
- The maker is a long single column on a phone. It works; it is not elegant.
- Some of the cassette's internal colours (tape brown, screw grey, lined-paper
  blue) are hardcoded in `Cassette.css` rather than tokenised, because they are
  the drawing's own palette rather than brand colours. Say if you want them
  pulled out.
