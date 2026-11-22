/**
 * A hardcoded tape for driving the player before the maker exists.
 *
 * Spec section 8 asks for Milestone 3 to be tested from a hardcoded test tape
 * link. Every track id below was checked against Spotify's public oEmbed
 * endpoint on 2026-11-22, so a track that will not play is a real finding
 * rather than a typo in this file.
 *
 * Four on Side A, three on Side B, sealed, with two doodles on the label.
 * Delete this once the maker can produce tapes.
 */
export const TEST_TAPE_PAYLOAD =
  'N4IgbiBcCMA0IEsogCoFEDKKAuBDADgKYjzbIDSC2AxgBaEB2ABACK4PWFMAKuATtgCeJEADNkKXIIA2Aez4jZyQbICuIgM7Jq0wvwC0Acz6FGIhZBD4EDANYj7ljdj4J8IhsiJ8Atu0bY+n58toQK8NTIAEbSuNT28AAmUADaIACyAEwAbJlMAMwADEwAMjkAHEyZxWUA7NlVACylmeXN1S0AnMVFLfVMAKyVZbkFhSLp0Hm1zSW1xdkNJdCNxfMt0At5ZQNrjSAAuvAAjlBwVl42tvoxqsTwPlD58ACCqSCZ3Ph8qgBCAJoAYVkjQAErUAOoAeV+AClagBFTJoADu6REhUIAHENIJDCh8N1sqpoOUSoUoQgfAxCI94I1VLU0DSotgfOQIQAvACqoMa+Xy1FEAwREHgA0BtFs6Qw5Sh2ESnNhhGOgkEUUB1E6ACUBod4L93oUWAgIbJpPkXlDshD8AANABahnwhUMsgAHi8AGoiaA+PT5KIYWwYLF21QASW1YAYgkS0l+AyiIlqanS-1tKNhjUymQAVtrqCwXhgHb9atx9SAUWd6o1oNABtVCi3CgBfIA';

export const TEST_TAPE_HASH = '#/t/' + TEST_TAPE_PAYLOAD;
