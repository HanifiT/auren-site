/**
 * The naming convention.
 *
 * `Ulferic of Calderwulf, of Wulfstead` was wrong twice — two `of` clauses, and
 * "wulf" in both halves. These hold the fix in place: one clause, and a warning
 * (never a refusal) when a House name echoes its settlement.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { distinctiveElement, epithet, settlementEcho } from "./naming";

test("a name and a House make one of-clause", () => {
  assert.equal(epithet("Ulferic", "Brackenhow"), "Ulferic of Brackenhow");
});

test("no House means no clause at all", () => {
  assert.equal(epithet("Ulferic", null), "Ulferic");
  assert.equal(epithet("Ulferic", ""), "Ulferic");
  assert.equal(epithet("Ulferic", "   "), "Ulferic");
});

test("the settlement is never in the name", () => {
  // The bug, stated as a test: whatever else it does, the epithet takes two
  // arguments and there is nowhere for a town to enter it.
  assert.equal(epithet.length, 2);
  assert.equal(epithet(" Ulferic ", " Brackenhow "), "Ulferic of Brackenhow");
});

test("the distinctive element strips the place half", () => {
  const cases: [string, string][] = [
    ["Wulfstead", "wulf"],
    ["Ironfell", "iron"],
    ["Blackmoor", "black"],
    ["Wyrdport", "wyrd"],
    ["Ravenglen", "raven"],
    ["Havenreach", "haven"],
    ["Grimreach", "grim"],
    ["Stonebridge", "stone"],
  ];
  for (const [town, stem] of cases) {
    assert.equal(distinctiveElement(town), stem, town);
  }
});

test("a name with no recognised ending is its own element", () => {
  // Rosalais has no place-word on the end. Matching the whole thing is the
  // safe direction: it warns more, and a warning costs nothing.
  assert.equal(distinctiveElement("Rosalais"), "rosalais");
});

test("the echo that started this fires", () => {
  const warning = settlementEcho("Calderwulf", "Wulfstead");
  assert.notEqual(warning, null);
  assert.match(warning!, /wulf/);
});

test("an unrelated House name says nothing", () => {
  assert.equal(settlementEcho("Brackenhow", "Wulfstead"), null);
  assert.equal(settlementEcho("Ashcombe", "Ironfell"), null);
});

test("a House named exactly for its settlement is called out separately", () => {
  const warning = settlementEcho("Wulfstead", "Wulfstead");
  assert.notEqual(warning, null);
  assert.match(warning!, /settlement's own name/);
});

test("the echo is case-insensitive both ways", () => {
  assert.notEqual(settlementEcho("CALDERWULF", "wulfstead"), null);
});

test("a two-letter overlap is a coincidence, not an echo", () => {
  // Nothing should fire on a stem that short — it would warn on almost every
  // name and the warning would stop meaning anything.
  assert.equal(settlementEcho("Ironsmith", "Ravenglen"), null);
});

test("nothing is said when either side is missing", () => {
  assert.equal(settlementEcho("", "Wulfstead"), null);
  assert.equal(settlementEcho("Calderwulf", ""), null);
});
