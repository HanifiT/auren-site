/**
 * GENERATED FROM config/standing.yml — DO NOT EDIT BY HAND.
 *
 * Regenerate with `python tools/gen_site_config.py`.
 * `tests/test_site_ladder.py` fails if this file and the YAML disagree.
 *
 * THE SETTLEMENTS ARE THE LIVE LIST, and this is as live as it gets: there is
 * no settlement table in the database. The nine towns reach Postgres as bare
 * strings in `cynn.origin_town`, `character.at_town`, `aedre.town` and
 * `mission.town`, with no foreign key and nothing to join to. The YAML is the
 * only authority, so it is generated from rather than copied.
 *
 * `forsaken` is a FLAG, not a third region. Blackmoor genuinely is southern —
 * that is what makes it read down in the north like any other southern name. It
 * just also reads down at home, which no other town does, so a name seated
 * there is worth its rank nowhere on the map. A third region value would have
 * meant special-casing "forsaken counts as south when compared against north"
 * everywhere, which is the kind of thing that becomes a bug.
 */

export type Town = {
  name: string;
  /** north | south | neither. */
  region: string;
  forsaken: boolean;
  /** One line of what the place is. Shown when a player picks where to stand. */
  note: string;
};

export const TOWNS: Town[] = [
  { name: "Wulfstead", region: "north", forsaken: false, note: "Hard ground, deep bonds. Amana by default." },
  { name: "Ravenglen", region: "north", forsaken: false, note: "Trade heart of the north. Only Amana is worshipped." },
  { name: "Havenreach", region: "north", forsaken: false, note: "The last resort. Ports, walls, and everyone passing through." },
  { name: "Grimreach", region: "north", forsaken: false, note: "Past the end of the north. Shingle, salvage, and oaths enforced by the people they were sworn to. A Grimreach name carries the way a scar carries." },
  { name: "Ironfell", region: "north", forsaken: false, note: "The ore that armed the north, and everyone the north has fought. Lives to a bell. Good at something and complicit in something." },
  { name: "Wyrdport", region: "neither", forsaken: false, note: "Neither north nor south. Where the Ǣdre surfaces." },
  { name: "Blackmoor", region: "south", forsaken: true, note: "Where the good ground gives out. The south says the gods withdrew, and says it kindly. Reads down everywhere, including at home." },
  { name: "Rosalais", region: "south", forsaken: false, note: "Four gods, all of them demanding." },
  { name: "Stonebridge", region: "south", forsaken: false, note: "Wealth as proof of favour, and ruin as proof of the reverse." },
];
