"use client";

import type { NameMatch } from "@/lib/census";
import type { KinEntry, KinRelation } from "./steps";

/**
 * Your kin, and where the tree starts.
 *
 * TWO RULES ARE VISIBLE HERE AND BOTH ARE THE SCHEMA'S, not this form's.
 *
 * 1. A TIE IS A CLAIM ABOUT SOMEBODY ELSE. What the name matches decides which
 *    kind of thing is being entered, and the player is told which at the moment
 *    the match is found rather than afterwards:
 *
 *      nobody bears it   a forebear. Entered directly, on the tree at once.
 *                        Most of a tree is people who were never players, and a
 *                        tree needing a dead grandmother's consent never gets
 *                        past two generations.
 *      a player bears it a claim. Stored pending, drawn marked as unagreed, and
 *                        the other player answers it.
 *
 * 2. ONLY PARENTAGE AND MARRIAGE ARE STORED (db/007). Siblings, cousins and
 *    grandparents are read off those two rather than written down — store them
 *    and you eventually get a tree where A is B's brother and also B's uncle,
 *    with no way to say which is wrong.
 *
 *    So a sibling is stored as a SHARED PARENT and a grandparent as the parent
 *    of a parent, which means both need a parent to hang off. When there is
 *    none the form asks for the missing parent rather than storing a sibling
 *    edge the schema has no room for.
 */

const RELATIONS: { id: KinRelation; label: string; stored: string }[] = [
  { id: "parent", label: "parent", stored: "stored directly" },
  { id: "child", label: "child", stored: "stored directly" },
  { id: "spouse", label: "spouse", stored: "stored directly" },
  { id: "sibling", label: "sibling", stored: "stored as a shared parent" },
  { id: "grandparent", label: "grandparent", stored: "stored as a parent's parent" },
];

let seq = 0;
const nextKey = () => `k${++seq}`;

export function Kin({
  kin,
  matches,
  onChange,
}: {
  kin: KinEntry[];
  matches: NameMatch[];
  onChange: (kin: KinEntry[]) => void;
}) {
  const parents = kin.filter((k) => k.relation === "parent" && k.name.trim());

  const matchFor = (name: string) =>
    matches.find((m) => m.typed.toLowerCase() === name.trim().toLowerCase()) ?? null;

  const update = (key: string, patch: Partial<KinEntry>) =>
    onChange(kin.map((k) => (k.key === key ? { ...k, ...patch } : k)));

  const add = (relation: KinRelation) =>
    onChange([...kin, { key: nextKey(), relation, name: "", through: "" }]);

  const remove = (key: string) => onChange(kin.filter((k) => k.key !== key));

  return (
    <div className="f-stack">
      <p className="f-hint census-lede">
        Name your parents, and anybody else the record should carry. A name
        nobody bears is a forebear and goes on the tree at once. A name a player
        bears is a claim about them, and waits until they agree — which is the
        rule the whole tree rests on.
      </p>

      {kin.length === 0 && (
        <p className="quiet">
          Nobody named yet. A record with no kin is perfectly valid: plenty of
          people arrived on the island alone.
        </p>
      )}

      <ul className="kin-list">
        {kin.map((k) => {
          const hit = matchFor(k.name);
          const needsParent = k.relation === "sibling" || k.relation === "grandparent";
          const rel = RELATIONS.find((r) => r.id === k.relation)!;
          return (
            <li key={k.key} className="kin-row">
              <div className="f-inline">
                <label className="f-field">
                  <span className="f-label">Relation</span>
                  <select
                    value={k.relation}
                    onChange={(e) =>
                      update(k.key, {
                        relation: e.target.value as KinRelation,
                        through: "",
                      })
                    }
                  >
                    {RELATIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="f-field kin-name">
                  <span className="f-label">Name</span>
                  <input
                    type="text"
                    maxLength={100}
                    value={k.name}
                    onChange={(e) => update(k.key, { name: e.target.value })}
                  />
                </label>

                {needsParent && (
                  <label className="f-field">
                    <span className="f-label">Through</span>
                    <select
                      value={k.through}
                      onChange={(e) => update(k.key, { through: e.target.value })}
                    >
                      <option value="">which parent?</option>
                      {parents.map((p) => (
                        <option key={p.key} value={p.name.trim()}>
                          {p.name.trim()}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => remove(k.key)}
                  aria-label={`Remove ${k.name.trim() || "this entry"}`}
                >
                  Remove
                </button>
              </div>

              {/* Said the moment the match is found, not after the submit. */}
              {k.name.trim() && (
                <p className={hit?.isPlayer ? "census-warn" : "f-hint"}>
                  {hit?.isPlayer ? (
                    <>
                      <b>{hit.name}</b> is another player&rsquo;s character
                      {hit.house ? ` of ${hit.house}` : ""}. This enters as a
                      claim and waits for their agreement — it will show on the
                      tree marked as unagreed, never as fact, until they answer.
                    </>
                  ) : (
                    <>
                      Nobody bears that name, so {k.name.trim()} is entered as a
                      forebear and is on the tree at once. {rel.stored}.
                    </>
                  )}
                </p>
              )}

              {needsParent && parents.length === 0 && k.name.trim() && (
                <p className="census-warn">
                  A {rel.label} is {rel.stored}, so a parent has to be named
                  first. Add one above and this will attach to them.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="f-inline">
        {RELATIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className="btn btn--ghost"
            onClick={() => add(r.id)}
          >
            Add a {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
