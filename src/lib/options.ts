/**
 * Picker options, mirrored from config/standing.yml.
 *
 * Client-safe: no database import, so a client component can use these without
 * dragging `pg` into the browser bundle. The YAML remains the source of truth
 * and the bot reads it directly; this is a copy for the form.
 */

export const TOWNS = [
  {
    "name": "Wulfstead",
    "standing": "north",
    "note": "Hard ground, deep bonds. Amana by default.",
    "forsaken": false
  },
  {
    "name": "Ravenglen",
    "standing": "north",
    "note": "Trade heart of the north. Only Amana is worshipped.",
    "forsaken": false
  },
  {
    "name": "Havenreach",
    "standing": "north",
    "note": "The last resort. Ports, walls, and everyone passing through.",
    "forsaken": false
  },
  {
    "name": "Grimreach",
    "standing": "north",
    "note": "Past the end of the north. Shingle, salvage, and oaths enforced by the people they were sworn to. A Grimreach name carries the way a scar carries.",
    "forsaken": false
  },
  {
    "name": "Ironfell",
    "standing": "north",
    "note": "The ore that armed the north, and everyone the north has fought. Lives to a bell. Good at something and complicit in something.",
    "forsaken": false
  },
  {
    "name": "Wyrdport",
    "standing": "neither",
    "note": "Neither north nor south. Where the Ǣdre surfaces.",
    "forsaken": false
  },
  {
    "name": "Blackmoor",
    "standing": "south",
    "note": "Where the good ground gives out. The south says the gods withdrew, and says it kindly. Reads down everywhere, including at home.",
    "forsaken": true
  },
  {
    "name": "Rosalais",
    "standing": "south",
    "note": "Four gods, all of them demanding.",
    "forsaken": false
  },
  {
    "name": "Stonebridge",
    "standing": "south",
    "note": "Wealth as proof of favour, and ruin as proof of the reverse.",
    "forsaken": false
  }
] as const;

export const BEARING = ["Grim", "Open", "Sharp", "Quiet", "Warm", "Wry", "Cold", "Restless"] as const;

export const TRADES = ["Trader", "Smith", "Fisher", "Farmhand", "Sellsword", "Sailor", "Hunter", "Healer", "Scribe", "Priest"] as const;
