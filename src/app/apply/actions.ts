"use server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { submitApplication } from "@/lib/queries";

export type ApplyState = { error?: string; ok?: boolean };

/**
 * Server action for the application form.
 *
 * The five fields mirror the Discord modal exactly, so both intake paths
 * produce identical `answers` JSON and the review embed does not need to know
 * which door was used.
 */
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

  const result = await submitApplication({
    discordId: session.discordId,
    characterName: name,
    answers,
  });
  return result.ok ? { ok: true } : { error: result.reason };
}
