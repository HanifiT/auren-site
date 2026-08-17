"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { submitApplication } from "@/lib/queries";
import { assignSheet, getRoll, rollFor, STATS, type StatKey } from "@/lib/sheet";

export type ApplyState = { error?: string; ok?: boolean };

/**
 * Roll. Explicit action, server-side, committed before it renders.
 *
 * Returns nothing — the page re-reads the roll from the database, so what the
 * player sees is what was persisted rather than what was generated.
 */
export async function rollStats(): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  try {
    await rollFor(session.discordId);
  } catch (err) {
    console.error("rollStats failed", err);
    return { error: "The dice could not be recorded. Nothing was rolled." };
  }
  revalidatePath("/apply");
  return {};
}

export async function apply(
  _prev: ApplyState,
  form: FormData,
): Promise<ApplyState> {
  const session = await getServerSession(authOptions);
  // Identity comes from the session, never from the form. A hidden field
  // would let anyone apply as anyone.
  if (!session?.discordId) return { error: "You need to sign in first." };

  const get = (k: string) => String(form.get(k) ?? "").trim();
  const name = get("name");
  const answers = {
    concept: get("concept"),
    origin: get("origin"),
    history: get("history"),
    hook: get("hook") || "—",
  };

  // Limits match the Discord modal's, so neither door accepts what the other
  // would reject.
  const limits: Record<string, number> = {
    name: 100, concept: 300, origin: 700, history: 1500, hook: 700,
  };
  if (!name) return { error: "A name is required." };
  if (name.length > limits.name) return { error: "That name is too long." };
  for (const [key, value] of Object.entries(answers)) {
    if (value.length > limits[key]) return { error: `Your ${key} is too long.` };
  }
  if (!answers.concept) return { error: "Tell us who they are, in a sentence." };
  if (!answers.history) return { error: "A history is required." };

  const roll = await getRoll(session.discordId);
  if (!roll) return { error: "Roll your numbers before presenting." };

  // Read the assignment off the form and check it here for a clear message.
  // The database checks it again as a permutation of the roll, which is the
  // check that actually holds if this one is ever bypassed.
  const assignment = {} as Record<StatKey, number>;
  for (const stat of STATS) {
    const raw = Number(form.get(`stat_${stat.key}`));
    if (!Number.isInteger(raw)) {
      return { error: `Assign a value to ${stat.name}.` };
    }
    assignment[stat.key] = raw;
  }
  const used = Object.values(assignment).slice().sort((a, b) => a - b);
  const rolled = roll.values.slice().sort((a, b) => a - b);
  if (JSON.stringify(used) !== JSON.stringify(rolled)) {
    return { error: "Use each rolled number once — no more, no fewer." };
  }

  const sheet = await assignSheet(session.discordId, roll.id, assignment);
  if (!sheet.ok) return { error: sheet.reason };

  const result = await submitApplication({
    discordId: session.discordId,
    characterName: name,
    answers,
  });
  if (!result.ok) return { error: result.reason };

  revalidatePath("/me");
  return { ok: true };
}
