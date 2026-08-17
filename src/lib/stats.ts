/**
 * Stat names and money formatting — pure, no database.
 *
 * Split out of lib/sheet.ts because client components need the stat list, and
 * importing it from a module that touches `pg` drags Postgres into the browser
 * bundle. Nothing here may import anything server-only.
 *
 * Old English. The Crown speaks Latin at you; your own body and mind are
 * described in the folk tongue.
 */

export const STATS = [
  { key: "maegen", name: "Mægen", gloss: "strength, main force" },
  { key: "searu", name: "Searu", gloss: "skill, cunning, device" },
  { key: "haelu", name: "Hǣlu", gloss: "health, wholeness" },
  { key: "frod", name: "Frōd", gloss: "learning, experience" },
  { key: "hyge", name: "Hyge", gloss: "mind, thought, wits" },
  { key: "mod", name: "Mōd", gloss: "spirit, heart, bearing" },
] as const;

export type StatKey = (typeof STATS)[number]["key"];

/** Pence -> `£1 2s 10d`. Mirrors core/money.py exactly. */
export function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const n = Math.abs(Math.trunc(pence));
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  const parts: string[] = [];
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return sign + parts.join(" ");
}
