"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor } from "@/lib/cynn";
import { draw, moveTo } from "@/lib/aedre";

export async function drawWylm(amount: number): Promise<{ error?: string; took?: number; line?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  const me = await characterFor(session.discordId);
  if (!me) return { error: "You have no character." };
  const res = await draw(me.id, amount);
  if (!res.ok) return { error: res.reason };
  revalidatePath("/aedre");
  return { took: res.took, line: res.line };
}

export async function travel(form: FormData): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) return { error: "Sign in first." };
  const me = await characterFor(session.discordId);
  if (!me) return { error: "You have no character." };
  const town = String(form.get("town") ?? "");
  if (!town) return { error: "Where to?" };
  await moveTo(me.id, town);
  revalidatePath("/aedre");
  revalidatePath("/me");
  return {};
}
