"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor } from "@/lib/cynn";
import { claimEdge, confirmEdge } from "@/lib/tree";

export async function claim(form: FormData): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  const me = await characterFor(session.discordId);
  if (!me) return { error: "You have no character." };

  const other = String(form.get("other") ?? "");
  const relation = String(form.get("relation") ?? "");
  if (!other) return { error: "Choose who." };

  // The claim is always expressed from the claimant's side, so the edge
  // direction is derived here rather than trusted from the form.
  const spec =
    relation === "parent"
      ? { kind: "parent_of" as const, fromId: other, toId: me.id }
      : relation === "child"
      ? { kind: "parent_of" as const, fromId: me.id, toId: other }
      : { kind: "married_to" as const, fromId: me.id, toId: other };

  const res = await claimEdge({ ...spec, claimedBy: me.id });
  if (!res.ok) return { error: res.reason };
  revalidatePath("/tree");
  return {};
}

export async function confirm(edgeId: string): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  const me = await characterFor(session.discordId);
  if (!me) return { error: "You have no character." };
  await confirmEdge(edgeId, me.id);
  revalidatePath("/tree");
  return {};
}
