/**
 * Picker options.
 *
 * Client-safe: no database import, so a client component can use these without
 * dragging `pg` into the browser bundle.
 *
 * The settlements are re-exported from the generated file. BEARING and TRADES
 * are still hand-written here and are now only used by the Discord-side forms
 * and the old census — the rebuilt census takes both as free text, because what
 * somebody does for a living is a thing they should be able to say in their own
 * words.
 */

/**
 * The settlements.
 *
 * Re-exported from `towns.generated.ts`, which `tools/gen_site_config.py`
 * writes from `config/standing.yml`. This file used to carry a hand-pasted copy
 * with a comment admitting it was one; the copy is gone and the drift test in
 * `tests/test_site_ladder.py` now guards it.
 */
export { TOWNS, type Town } from "./towns.generated";

export const BEARING = ["Grim", "Open", "Sharp", "Quiet", "Warm", "Wry", "Cold", "Restless"] as const;

export const TRADES = ["Trader", "Smith", "Fisher", "Farmhand", "Sellsword", "Sailor", "Hunter", "Healer", "Scribe", "Priest"] as const;

/**
 * Appearance.
 *
 * Curated rather than free text because a blank box gets a blank answer, and
 * because a census taken by a clerk would have used the clerk's own words for
 * a colour rather than the subject's. Every one of these is still stored as
 * TEXT (see db/012), so staff and the bot are not boxed in by this list.
 *
 * Hair *style* and marks stay free text: they are the two places where a
 * player says something nobody could have anticipated, and they are the two
 * that make a description sound like a person.
 */
export const HAIR_COLOURS = [
  "Black", "Raven", "Dark brown", "Chestnut", "Auburn", "Copper", "Red",
  "Sandy", "Fair", "Flaxen", "Ash", "Grey", "White", "Salt and pepper",
] as const;

export const EYE_COLOURS = [
  "Black", "Dark brown", "Brown", "Hazel", "Amber", "Green", "Grey",
  "Blue", "Pale blue", "One of each",
] as const;

export const COMPLEXIONS = [
  "Pale", "Fair", "Freckled", "Ruddy", "Weathered", "Olive", "Tan",
  "Brown", "Dark", "Sallow",
] as const;

export const BUILDS = [
  "Slight", "Lean", "Wiry", "Trim", "Sturdy", "Broad", "Heavy",
  "Stooped", "Rangy",
] as const;

/** Centimetres, for the height field's helper text. */
export function inchesToWords(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″`;
}
