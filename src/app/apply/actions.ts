"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { drawFor, foundCynn, petitionCynn } from "@/lib/cynn";
import { storeImage } from "@/lib/upload";

export type ApplyState = { error?: string; ok?: boolean };

const LIMITS: Record<string, number> = {
  houseName: 60, motto: 120, name: 100, short: 300, bio: 4000,
};

/**
 * Create a character, founding a House or petitioning to join one.
 *
 * Identity comes from the session, never from the form — a hidden field would
 * let anyone create as anyone. Standing is not written here at all: `ar`, the
 * draw columns and `wemm` are absent from the site's INSERT grant, so a bug in
 * this file cannot invent a well-regarded House.
 */
export async function create(
  _prev: ApplyState,
  form: FormData,
): Promise<ApplyState> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "You need to sign in first." };

  const get = (k: string) => String(form.get(k) ?? "").trim();
  const mode = get("mode");

  const character = {
    name: get("name"),
    age: get("age") ? Number(get("age")) : null,
    short: get("short"),
    bio: get("bio"),
    bearing: get("bearing"),
    trade: get("trade"),
    portraitPath: null as string | null,
  };

  if (!character.name) return { error: "A name is required." };
  if (character.name.length > LIMITS.name) return { error: "That name is too long." };
  if (!character.short) return { error: "Tell us who they are, in a sentence." };
  if (character.short.length > LIMITS.short) return { error: "That is too long for a glance." };
  if (character.bio.length > LIMITS.bio) return { error: "That bio is very long." };
  if (character.age !== null && (!Number.isInteger(character.age) ||
      character.age < 0 || character.age > 200)) {
    return { error: "That age is not a number of years." };
  }

  // Uploads are re-encoded, never stored as given — see lib/upload.
  const portrait = form.get("portrait");
  if (portrait instanceof File && portrait.size > 0) {
    const stored = await storeImage(portrait, "portrait");
    if (!stored.ok) return { error: stored.reason };
    character.portraitPath = stored.path;
  }

  if (mode === "join") {
    const cynnId = get("cynn_id");
    if (!cynnId) return { error: "Choose a House to petition." };
    const res = await petitionCynn({
      discordId: session.discordId, cynnId, character,
    });
    if (!res.ok) return { error: res.reason };
    revalidatePath("/me");
    return { ok: true };
  }

  const houseName = get("house_name");
  if (!houseName) return { error: "Your House needs a name." };
  if (houseName.length > LIMITS.houseName) return { error: "That House name is too long." };
  const originTown = get("origin_town");
  if (!originTown) return { error: "Choose where the line is from." };

  let crestPath: string | null = null;
  const crest = form.get("crest");
  if (crest instanceof File && crest.size > 0) {
    const stored = await storeImage(crest, "crest");
    if (!stored.ok) return { error: stored.reason };
    crestPath = stored.path;
  }

  const res = await foundCynn({
    discordId: session.discordId,
    houseName,
    motto: get("motto").slice(0, LIMITS.motto),
    originTown,
    crestPath,
    character,
  });
  if (!res.ok) return { error: res.reason };

  revalidatePath("/apply");
  revalidatePath("/me");
  return { ok: true };
}

/**
 * Draw the House's history.
 *
 * Runs through `cynn_draw()`, a SECURITY DEFINER function. The site may
 * execute it and cannot write the columns it writes, so the result is handed
 * back already committed — the animation moves toward a value it was given.
 */
export async function draw(cynnId: string): Promise<
  { error?: string; card?: { ar: number; line: string; text: string; hook: string | null } }
> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  const res = await drawFor(cynnId);
  if (!res.ok) return { error: res.reason };
  revalidatePath("/apply");
  revalidatePath("/me");
  return { card: res.card };
}
