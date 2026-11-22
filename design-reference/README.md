# Design reference

These files are the approved visual design for Mixtape Mode. They are **reference, not code to run or import.** Port the look into React components.

## How to read a `.dc.html` file

Each file is one screen or component, written in a small template format:

- **Inline `style="..."` attributes are the source of truth** for layout, sizes, colours, borders and shadows. Copy the values.
- `{{name}}` is a value filled in from `renderVals()` in the `<script type="text/x-dc">` block at the bottom of the file. Read that script to see where each value comes from and what the interactive state is.
- `<sc-if value="{{x}}">` is a conditional block. `<sc-for list="{{items}}" as="item">` is a loop.
- `<dc-import name="Cassette" ...>` mounts another file (here `Cassette.dc.html`) as a child component. Its attributes become props (kebab-case to camelCase).
- `<helmet>` holds the Google Fonts link and a few global styles, such as the `mm-spin` keyframes for the reels.
- `data-props` on the script tag lists the component's tweakable props and their defaults.

## Files

- `Cassette.dc.html`: the cassette component. Fixed 360 x 228 drawing (372 x 240 with its shadow). Clear shells show the tape packs, rollers and tape path. Four sticker styles. Reels spin through `animation-play-state`. The label can take doodles (SVG paths in a 300 x 80 viewBox) and, later, uploaded art.
- `Main.dc.html`: the maker. Live preview plus numbered decoration cards. Includes the working doodle pad logic (pointer events to SVG path data).
- `Player.dc.html`: the listener on a 390 x 844 phone. Cassette, "Side A · Track 2 of 4", progress, rewind/play/fast forward, flip, and the J-card bottom sheet with SEALED and "Peek anyway".
- `JCard.dc.html`: the J-card unfolded. The inside panel holds the handwritten-style tracklist and Spotify credits. The spine and front are a two-ink riso print (ink pairs and misregistration are in its script).
- `Shelf.dc.html`: "My tapes", spines stacked with tilts, selected spine slides out, detail card with the cassette.
- `later/`: Templates, Gallery and the Cover component. Out of scope for v1.

## Notes

- Song titles and the sample tapes in these files are placeholders.
- The Spotify logo is shown as a labelled placeholder on purpose. Use the official files from https://developer.spotify.com/documentation/design.
- Where the spec and these files disagree on behaviour, the spec wins. Where they disagree on looks, these files win.
