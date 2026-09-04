/**
 * The ladder's arithmetic.
 *
 * Run with `npm test`, which compiles this and its imports with the TypeScript
 * already in node_modules and hands the result to node's built-in test runner.
 * No test framework is installed for it: one assertion module is not worth a
 * dependency tree, and `node --test` has shipped since Node 18.
 *
 * These mirror `tests/test_standing.py`, which asserts the same facts against
 * the Python loader. Both must hold, because the bot and the site show players
 * the same ladder and a disagreement between them is invisible until someone
 * screenshots one next to the other.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { LADDER, climb, shortfall, standingFor } from "./standing";

// ------------------------------------------------------------------- index 0

test("a House at 0 Ār resolves to Cuma, not to nothing", () => {
  const s = standingFor(0, 0);
  // The bug this exists for: Cuma is index 0, threshold 0, and rank 1 in the
  // YAML. A truthiness guard anywhere in the resolution drops it and the
  // caller renders an empty rung for every House on its founding day.
  assert.notEqual(s.rung, null);
  assert.notEqual(s.rung, undefined);
  assert.equal(s.rung.name, "Cuma");
  assert.equal(s.index, 0);
  assert.equal(s.rung.threshold, 0);
});

test("Cuma is the first rung of the generated ladder", () => {
  assert.equal(LADDER[0].name, "Cuma");
  assert.equal(LADDER[0].threshold, 0);
});

test("the whole founding draw range is still Cuma", () => {
  // card.ar is 1..10 and the first band starts at 25. A 10 on the draw is the
  // best-named new arrival on the island and nothing more.
  for (let ar = 0; ar <= 10; ar++) {
    assert.equal(standingFor(ar, 0).rung.name, "Cuma", `ar=${ar}`);
  }
});

// -------------------------------------------------------- generational gates

test("no quantity of Ār reaches Hold without a succession", () => {
  assert.equal(standingFor(1_000_000, 0).rung.name, "Þegn");
});

test("one succession unlocks the upper half", () => {
  assert.equal(standingFor(400, 1).rung.name, "Hold");
  assert.equal(standingFor(600, 1).rung.name, "Ealdormann");
});

test("Hlāford wants two successions, not one", () => {
  assert.equal(standingFor(1100, 1).rung.name, "Hersir");
  assert.equal(standingFor(1100, 2).rung.name, "Hlāford");
});

test("four rungs gate on successions, not two", () => {
  const gated = LADDER.filter((r) => r.requiresSuccessions > 0).map((r) => r.name);
  assert.deepEqual(gated, ["Hold", "Ealdormann", "Hersir", "Hlāford"]);
});

test("Hold glosses as a landholder", () => {
  const hold = LADDER.find((r) => r.name === "Hold");
  assert.notEqual(hold, undefined);
  assert.match(hold!.sense, /landholder/i);
});

// -------------------------------------------------------------- the shortfall

test("every rung is rendered, held or not", () => {
  assert.equal(climb(0, 0).length, LADDER.length);
});

test("an unreached rung says what it is short by in both currencies", () => {
  const steps = climb(342, 0);
  const hold = steps.find((s) => s.rung.name === "Hold")!;
  assert.equal(hold.held, false);
  assert.equal(shortfall(hold), "58 Ār short · wants 1 completed succession");
});

test("a rung over its Ār threshold still names the succession it wants", () => {
  const hold = climb(500, 0).find((s) => s.rung.name === "Hold")!;
  assert.equal(hold.arShort, 0);
  assert.equal(shortfall(hold), "Ār enough · wants 1 completed succession");
});

test("a held rung has no shortfall", () => {
  const cuma = climb(0, 0).find((s) => s.rung.name === "Cuma")!;
  assert.equal(cuma.held, true);
  assert.equal(cuma.current, true);
  assert.equal(shortfall(cuma), null);
});

test("exactly one rung is current", () => {
  for (const [ar, succ] of [[0, 0], [25, 0], [1_000_000, 0], [1100, 2]]) {
    assert.equal(climb(ar, succ).filter((s) => s.current).length, 1);
  }
});
