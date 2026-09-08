/**
 * The census, as data.
 *
 * The shape of a draft and the steps it is filled in through, kept apart from
 * the component so the review screen, the preview and the server action all
 * agree about what a draft is.
 */

export type KinRelation = "parent" | "spouse" | "child" | "sibling" | "grandparent";

export type KinEntry = {
  /** Stable within the session, so React keys survive a reorder. */
  key: string;
  relation: KinRelation;
  name: string;
  /**
   * For a sibling or a grandparent: which named parent the tie hangs off.
   *
   * Neither is stored — only parentage and marriage are (db/007) — so both have
   * to be resolved to a shared parent before they can be written, and that
   * needs to know WHICH parent. Empty until the player has named one.
   */
  through: string;
};

export type Draft = {
  town: string;
  name: string;
  house: string;
  colour: string;
  craft: string;
  age: string;
  heightCm: string;
  build: string;
  bearing: string;
  hair: string;
  eyes: string;
  complexion: string;
  voice: string;
  marks: string;
  born: string;
  tongue: string;
  kin: KinEntry[];
  account: string;
};

export const EMPTY: Draft = {
  town: "", name: "", house: "", colour: "#4C9A2A", craft: "",
  age: "", heightCm: "", build: "", bearing: "", hair: "", eyes: "",
  complexion: "", voice: "", marks: "", born: "", tongue: "",
  kin: [], account: "",
};

export type StepId =
  | "where" | "name" | "craft" | "body" | "kin" | "account" | "review";

export const STEPS: { id: StepId; n: number; title: string; sub: string }[] = [
  { id: "where",   n: 1, title: "Where you stand",  sub: "the one closed choice" },
  { id: "name",    n: 2, title: "The name",         sub: "yours, and your House's" },
  { id: "craft",   n: 3, title: "The craft",        sub: "what you do" },
  { id: "body",    n: 4, title: "Of the body",      sub: "what the assessor sees" },
  { id: "kin",     n: 5, title: "Your kin",         sub: "who you came from" },
  { id: "account", n: 6, title: "The long account", sub: "what staff read" },
  { id: "review",  n: 7, title: "Read it back",     sub: "before it is entered" },
];

/** Centimetres, read back the way almost everybody actually thinks about height. */
export function imperial(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

/**
 * What stops a step being finished.
 *
 * Deliberately thin. The census asks a lot and refuses almost nothing: a
 * register that will not record somebody because they did not say what colour
 * their eyes are is not a register. Only the settlement, the two names, and the
 * two numeric fields are checked at all.
 */
export function problemWith(step: StepId, d: Draft): string | null {
  switch (step) {
    case "where":
      return d.town ? null : "Choose where you stand.";
    case "name":
      if (!d.name.trim()) return "A given name is required.";
      if (d.name.trim().length > 100) return "That name is too long.";
      if (!d.house.trim()) return "A House name is required — found one, or name one that stands.";
      if (d.house.trim().length > 60) return "That House name is too long.";
      return null;
    case "body": {
      if (d.age) {
        const n = Number(d.age);
        if (!Number.isInteger(n) || n < 0 || n > 200) {
          return "Age is a number of winters, between 0 and 200.";
        }
      }
      if (d.heightCm) {
        const n = Number(d.heightCm);
        // The same bound the database carries (db/012), so the refusal is a
        // sentence rather than a constraint violation after the fact.
        if (!Number.isInteger(n) || n < 100 || n > 250) {
          return "Height is a number of centimetres, between 100 and 250.";
        }
      }
      return null;
    }
    case "kin": {
      // A sibling and a grandparent are both stored as parentage, so both need
      // a parent to hang off. Ask for the missing parent rather than inventing
      // an edge the schema has no room for.
      const parents = d.kin.filter((k) => k.relation === "parent" && k.name.trim());
      const needsParent = d.kin.filter(
        (k) => (k.relation === "sibling" || k.relation === "grandparent") && k.name.trim(),
      );
      if (needsParent.length > 0 && parents.length === 0) {
        const what = needsParent[0].relation === "sibling" ? "A sibling" : "A grandparent";
        return `${what} is recorded as a shared parent, so name a parent first.`;
      }
      for (const k of needsParent) {
        if (!k.through) {
          return `Say which parent ${k.name.trim() || "they"} connects through.`;
        }
      }
      return null;
    }
    default:
      return null;
  }
}
