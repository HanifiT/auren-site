"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { readColour } from "@/lib/colour";
import { drawFor, foundCynn, petitionCynn, takenColours } from "@/lib/cynn";
import { storeImage } from "@/lib/upload";
import {
  BEARING, BUILDS, COMPLEXIONS, EYE_COLOURS, HAIR_COLOURS, TRADES,
} from "@/lib/options";

export type ApplyState = { error?: string; ok?: boolean };

const LIMITS: Record<string, number> = {
  houseName: 60, motto: 120, name: 100, short: 300, bio: 4000,
  hairStyle: 80, marks: 200,
};

/**
 * A value the form offered, or nothing.
 *
 * The appearance columns are TEXT with no CHECK (db/012) so that staff and the
 * bot stay free to write anything a correction needs — which means the site is
 * the only thing standing between a crafted POST and "Hair: <script>". Every
 * picker is therefore checked against the list it was rendered from, and an
 * unrecognised value is dropped rather than argued with: it can only come from
 * someone editing the request, and they do not need an error message.
 */
function fromList(value: string, allowed: readonly string[]): string | null {
  if (!value) return null;
  return allowed.includes(value) ? value : null;
}

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

  const heightRaw = get("height_cm");
  const height = heightRaw ? Number(heightRaw) : null;

  const character = {
    name: get("name"),
    age: get("age") ? Number(get("age")) : null,
    short: get("short"),
    bio: get("bio"),
    bearing: fromList(get("bearing"), BEARING) ?? "",
    trade: fromList(get("trade"), TRADES) ?? "",
    portraitPath: null as string | null,

    // Description, not statistics. None of it is required: a census that
    // refuses to record someone because they did not say what colour their
    // eyes are is not a census.
    hairColour: fromList(get("hair_colour"), HAIR_COLOURS),
    hairStyle: get("hair_style").slice(0, LIMITS.hairStyle) || null,
    eyes: fromList(get("eyes"), EYE_COLOURS),
    complexion: fromList(get("complexion"), COMPLEXIONS),
    build: fromList(get("build"), BUILDS),
    heightCm: height,
    marks: get("marks").slice(0, LIMITS.marks) || null,
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
  // The same bound the database carries, so the refusal is a sentence rather
  // than a constraint violation.
  if (height !== null && (!Number.isInteger(height) || height < 100 || height > 250)) {
    return { error: "That height is not a number of centimetres between 100 and 250." };
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

  // The colour the House will wear in Discord. Checked here rather than only
  // at the column because "too dark to read" and "too near another House" are
  // judgements a CHECK constraint cannot make, and because a refusal after the
  // crest has been uploaded is a worse refusal.
  const colour = readColour(get("colour"), await takenColours());
  if (!colour.ok) return { error: colour.reason };

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
    colour: colour.value,
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
