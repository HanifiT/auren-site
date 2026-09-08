"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { readColour } from "@/lib/colour";
import {
  LIVING_CAP, addForebear, houseByName, livingFor, matchNames, writeEdge,
  type NameMatch,
} from "@/lib/census";
import { foundCynn, petitionCynn, takenColours } from "@/lib/cynn";
import { TOWNS } from "@/lib/towns.generated";
import type { Draft, KinEntry } from "./steps";

const LIMITS = {
  name: 100, house: 60, craft: 80, build: 60, bearing: 60, hair: 80,
  eyes: 60, complexion: 60, voice: 120, marks: 240, born: 120, tongue: 120,
  account: 4000,
};

/**
 * What the flow asks while somebody is still typing.
 *
 * Two questions, one round trip: does that House already stand, and do any of
 * those kin names belong to somebody. Both change what the submit will do, and
 * both have to be answered in the flow — telling a player afterwards that their
 * House was a petition, or that their father is somebody else's character, is
 * telling them after they have committed.
 */
export type Look = {
  house: { id: string; name: string; origin_town: string } | null;
  kin: NameMatch[];
};

export async function look(houseName: string, kinNames: string[]): Promise<Look> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { house: null, kin: [] };
  try {
    const [house, kin] = await Promise.all([
      houseByName(houseName),
      matchNames(kinNames),
    ]);
    return { house, kin };
  } catch {
    // A failed lookup must not block the flow. The submit checks again, and
    // the database has the last word either way.
    return { house: null, kin: [] };
  }
}

export type Capacity = {
  living: { id: string; name: string; house: string | null }[];
  full: boolean;
};

export async function capacity(): Promise<Capacity> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { living: [], full: false };
  const living = await livingFor(session.discordId);
  return { living, full: living.length >= LIVING_CAP };
}

export type EnterResult =
  | { ok: true; petitioned: boolean; house: string; notified: string[] }
  | { ok: false; error: string };

/**
 * Enter the record.
 *
 * Identity comes from the session and never from the draft — a name in a
 * payload would let anybody create as anybody. Standing is not written at all:
 * `ar`, `successions`, the draw columns and `wemm` are absent from the site's
 * INSERT grant, so nothing here can invent a well-regarded House.
 */
export async function enter(draft: Draft): Promise<EnterResult> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { ok: false, error: "You need to sign in first." };
  const me = session.discordId;

  const cut = (v: string, n: number) => v.trim().slice(0, n) || null;
  const name = draft.name.trim().slice(0, LIMITS.name);
  const houseName = draft.house.trim().slice(0, LIMITS.house);

  if (!name) return { ok: false, error: "A given name is required." };
  if (!houseName) return { ok: false, error: "A House name is required." };

  // The settlement is the one closed choice in the flow, so it is the one
  // thing checked against a list. Anything else arrived by editing the request.
  if (!TOWNS.some((t) => t.name === draft.town)) {
    return { ok: false, error: "That is not a settlement on the island." };
  }

  const age = draft.age ? Number(draft.age) : null;
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 200)) {
    return { ok: false, error: "That age is not a number of winters." };
  }
  const heightCm = draft.heightCm ? Number(draft.heightCm) : null;
  if (heightCm !== null && (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 250)) {
    return { ok: false, error: "That height is not a number of centimetres between 100 and 250." };
  }

  // Named before the write so the refusal can say which souls are in the way,
  // which the database's own check cannot. It is not the check: db/018's
  // trigger is, and it holds whatever this does.
  const living = await livingFor(me);
  if (living.length >= LIVING_CAP) {
    return {
      ok: false,
      error:
        `You bear ${living.length} living souls, which is the limit. ` +
        `One of ${living.map((l) => l.name).join(", ")} would have to depart ` +
        `first — that is written in Discord, and the record stays on the roll.`,
    };
  }

  const character = {
    name,
    age,
    short: "",
    bio: draft.account.trim().slice(0, LIMITS.account),
    // FREE TEXT, deliberately. These were pickers checked against a curated
    // list; what somebody does for a living, and how they sound, are things
    // they should be able to say in their own words. Length-capped and
    // trimmed, and React escapes on render.
    bearing: cut(draft.bearing, LIMITS.bearing) ?? "",
    trade: cut(draft.craft, LIMITS.craft) ?? "",
    portraitPath: null as string | null,
    hairColour: cut(draft.hair, LIMITS.hair),
    hairStyle: null,
    eyes: cut(draft.eyes, LIMITS.eyes),
    complexion: cut(draft.complexion, LIMITS.complexion),
    build: cut(draft.build, LIMITS.build),
    heightCm,
    marks: cut(draft.marks, LIMITS.marks),
    voice: cut(draft.voice, LIMITS.voice),
    born: cut(draft.born, LIMITS.born),
    tongue: cut(draft.tongue, LIMITS.tongue),
  };

  const standing = await houseByName(houseName);

  let cynnId: string;
  let characterId: string;
  let petitioned: boolean;

  if (standing) {
    // The House already stands, so this is a petition and they decide. The
    // character is `pending` until they answer.
    const res = await petitionCynn({ discordId: me, cynnId: standing.id, character });
    if (!res.ok) return { ok: false, error: res.reason };
    cynnId = standing.id;
    characterId = res.characterId;
    petitioned = true;
  } else {
    const colour = readColour(draft.colour, await takenColours());
    if (!colour.ok) return { ok: false, error: colour.reason };
    const res = await foundCynn({
      discordId: me,
      houseName,
      motto: "",
      originTown: draft.town,
      crestPath: null,
      colour: colour.value,
      character,
    });
    if (!res.ok) return { ok: false, error: res.reason };
    cynnId = res.cynnId;
    characterId = res.characterId;
    petitioned = false;
  }

  const notified = await writeKin(draft.kin, { cynnId, characterId, actor: me });

  revalidatePath("/hearth");
  revalidatePath("/record");
  revalidatePath("/tree");
  return { ok: true, petitioned, house: houseName, notified };
}

/**
 * Turn what the player said about their family into stored edges.
 *
 * ONLY PARENTAGE AND MARRIAGE ARE STORED (db/007). Siblings, cousins and
 * grandparents are traversal — store them and you eventually get a tree where A
 * is B's brother and also B's uncle, with no way to say which is wrong. So:
 *
 *   parent       parent_of(them, me)
 *   child        parent_of(me, them)
 *   spouse       married_to(me, them)
 *   sibling      parent_of(the shared parent, them) — the parent is the tie
 *   grandparent  parent_of(them, the named parent)
 *
 * A sibling and a grandparent both need a parent to hang off, which the flow
 * has already insisted on (`problemWith("kin", …)`). If one arrives here
 * without a resolvable parent it is skipped rather than stored as something
 * else: a sibling edge is exactly what the schema refuses to hold.
 *
 * Returns the names whose other player now has something to answer.
 */
async function writeKin(
  kin: KinEntry[],
  ctx: { cynnId: string; characterId: string; actor: string },
): Promise<string[]> {
  const named = kin.filter((k) => k.name.trim());
  if (named.length === 0) return [];

  const matches = await matchNames(named.map((k) => k.name));
  const byLower = new Map(matches.map((m) => [m.typed.toLowerCase(), m]));
  const notified: string[] = [];

  // Resolve every name to a character id once — a forebear entered for one tie
  // is the same person when a second tie names them.
  const resolved = new Map<string, { id: string; isPlayer: boolean }>();
  const resolve = async (raw: string): Promise<{ id: string; isPlayer: boolean } | null> => {
    const key = raw.trim().toLowerCase();
    if (!key) return null;
    const already = resolved.get(key);
    if (already) return already;
    const hit = byLower.get(key);
    if (hit) {
      const entry = { id: hit.id, isPlayer: hit.isPlayer };
      resolved.set(key, entry);
      return entry;
    }
    try {
      const id = await addForebear(ctx.cynnId, raw.trim(), ctx.actor);
      const entry = { id, isPlayer: false };
      resolved.set(key, entry);
      return entry;
    } catch (err) {
      console.error("addForebear failed", err);
      return null;
    }
  };

  // Parents first: a sibling or a grandparent resolves through one.
  const ordered = [...named].sort(
    (a, b) => Number(b.relation === "parent") - Number(a.relation === "parent"),
  );

  /**
   * Somebody with an opinion about this edge, who is not me.
   *
   * NOT simply "the person they named is a player". A sibling resolves to an
   * edge between the shared PARENT and the sibling, and my own character is at
   * neither end of it — so a forebear sibling hanging off somebody else's
   * character is still a claim about that somebody, and reading agreement off
   * the named person alone would have confirmed it on sight. Agreement is a
   * property of the edge's two ends, so it is computed from them.
   */
  const otherPlayerAt = (id: string) =>
    id !== ctx.characterId &&
    Array.from(resolved.values()).some((r) => r.id === id && r.isPlayer);

  for (const k of ordered) {
    const them = await resolve(k.name);
    if (!them) continue;

    let spec: { kind: "parent_of" | "married_to"; fromId: string; toId: string } | null = null;

    if (k.relation === "parent") {
      spec = { kind: "parent_of", fromId: them.id, toId: ctx.characterId };
    } else if (k.relation === "child") {
      spec = { kind: "parent_of", fromId: ctx.characterId, toId: them.id };
    } else if (k.relation === "spouse") {
      spec = { kind: "married_to", fromId: ctx.characterId, toId: them.id };
    } else {
      // Sibling and grandparent both hang off a named parent.
      const parent = await resolve(k.through);
      if (!parent) continue;
      spec =
        k.relation === "sibling"
          ? { kind: "parent_of", fromId: parent.id, toId: them.id }
          : { kind: "parent_of", fromId: them.id, toId: parent.id };
    }

    const contested = otherPlayerAt(spec.fromId) || otherPlayerAt(spec.toId);
    const res = await writeEdge({
      ...spec, agreed: !contested, claimedBy: ctx.characterId,
    });
    if (res.ok && contested) notified.push(k.name.trim());
  }

  return notified;
}
