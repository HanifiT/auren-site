/**
 * How a person is named.
 *
 * ONE `of` CLAUSE. `Ulferic of Calderwulf, of Wulfstead` stacked two of them
 * and put the same element — wulf — in both halves, so it read as a stutter
 * rather than as a name. The settlement is a field on the record, not part of
 * what somebody is called.
 *
 *     Ulferic of Brackenhow
 *
 * Every view reads from here: the Hearth card, the Record header, the Tree and
 * the Praesidium roll. It was assembled inline in four places before, which is
 * why fixing it meant fixing it four times.
 */

/** `Name of House`, or just the name when there is no House to be of. */
export function epithet(
  characterName: string,
  houseName?: string | null,
): string {
  const name = characterName.trim();
  const house = houseName?.trim();
  return house ? `${name} of ${house}` : name;
}

/**
 * What follows the name when a view has room for a second line.
 *
 * Deliberately NOT part of `epithet`. A House with no name to be of still has a
 * seat, and a character still stands somewhere; both are facts about the
 * record and neither is part of the name.
 */
export function ofNoHouse(): string {
  return "of no House";
}

/**
 * Endings that are the *place* half of a settlement name rather than the part
 * that identifies it. Longest first, because -reach must win over -each and
 * -bridge over -edge.
 *
 * Drawn from the nine towns in config/standing.yml: Wulfstead, Ravenglen,
 * Havenreach, Grimreach, Ironfell, Wyrdport, Blackmoor, Rosalais, Stonebridge.
 */
const PLACE_ENDINGS = [
  "bridge", "stead", "reach", "port", "moor", "glen", "fell", "burgh",
  "borough", "thorpe", "wick", "holm", "hithe", "ford", "haven", "combe",
  "dale", "gate", "how", "ness", "ton", "ham",
];

/**
 * The part of a settlement name that identifies it.
 *
 * Wulfstead -> wulf. Ironfell -> iron. Blackmoor -> black. A name with no
 * recognised ending is its own distinctive element (Rosalais), which is the
 * safe direction: it matches more, and this only ever produces a warning.
 */
export function distinctiveElement(town: string): string {
  const t = town.trim().toLowerCase();
  for (const ending of PLACE_ENDINGS) {
    if (t.length > ending.length + 2 && t.endsWith(ending)) {
      return t.slice(0, -ending.length);
    }
  }
  return t;
}

/**
 * Does this House name echo the settlement it is seated in?
 *
 * A WARNING, NEVER A REFUSAL. `Calderwulf of Wulfstead` is a legitimate thing
 * to want — a House named for the place it came from is how half of England is
 * named. It just reads badly next to the settlement, and a player should have
 * seen that before they commit to a name they cannot change. So this returns a
 * sentence, and the caller shows it and carries on.
 *
 * Returns null when there is nothing to say.
 */
export function settlementEcho(
  houseName: string,
  town: string,
): string | null {
  const house = houseName.trim().toLowerCase();
  const place = town.trim().toLowerCase();
  if (!house || !place) return null;

  if (house === place) {
    return `${houseName.trim()} is the settlement's own name. That is allowed, and it will read as the place rather than as a House.`;
  }

  const stem = distinctiveElement(place);
  // Two characters is not an echo, it is a coincidence of spelling.
  if (stem.length < 3) return null;
  if (!house.includes(stem)) return null;

  return `${houseName.trim()} and ${town.trim()} share “${stem}”. Nothing stops you — a House often is named for where it came from — but the two will sit next to each other on every record.`;
}
