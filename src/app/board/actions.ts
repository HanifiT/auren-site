"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor } from "@/lib/cynn";
import { claimMission, postMission, settleClaim, submitClaim } from "@/lib/missions";
import { isStaff } from "@/lib/queries";

async function me() {
  const session = await getServerSession(authOptions);
  return session?.discordId ?? null;
}

export async function take(missionId: string): Promise<{ error?: string }> {
  const id = await me();
  if (!id) return { error: "Sign in first." };
  const [house, character] = await Promise.all([cynnFor(id), characterFor(id)]);
  // Work is claimed by a House, not a person — the purse and the standing it
  // moves both belong to the House.
  if (!house) return { error: "You need a House before you can take work." };
  const res = await claimMission({
    missionId, cynnId: house.id, characterId: character?.id ?? null,
  });
  if (!res.ok) return { error: res.reason };
  revalidatePath("/board");
  return {};
}

export async function submit(form: FormData): Promise<{ error?: string }> {
  const id = await me();
  if (!id) return { error: "Sign in first." };
  const house = await cynnFor(id);
  if (!house) return { error: "You have no House." };
  const claimId = String(form.get("claim_id") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  if (!claimId) return { error: "Which work?" };
  await submitClaim(claimId, house.id, note);
  revalidatePath("/board");
  return {};
}

export async function post(form: FormData): Promise<{ error?: string }> {
  const id = await me();
  if (!id) return { error: "Sign in first." };
  // Gated on account.is_staff, which the bot writes from live guild roles and
  // the site has no grant to write.
  if (!(await isStaff(id))) return { error: "Staff only." };

  const title = String(form.get("title") ?? "").trim();
  const brief = String(form.get("brief") ?? "").trim();
  if (!title) return { error: "A title, at least." };
  if (!brief) return { error: "Say what the work is." };

  const reward = Number(form.get("reward") ?? 0);
  if (!Number.isInteger(reward) || reward < 0 || reward > 100_000) {
    return { error: "Reward must be a whole number of pence, under 100000." };
  }
  const slotsRaw = String(form.get("slots") ?? "").trim();
  const slots = slotsRaw ? Number(slotsRaw) : null;
  if (slots !== null && (!Number.isInteger(slots) || slots < 1)) {
    return { error: "Slots must be a whole number, or blank for uncapped." };
  }
  const tier = String(form.get("ar_tier") ?? "");

  const res = await postMission({
    title: title.slice(0, 120),
    brief: brief.slice(0, 4000),
    rewardPence: reward,
    arTier: tier || null,
    slots,
    town: String(form.get("town") ?? "") || null,
    postedBy: id,
  });
  if (!res.ok) return { error: res.reason };
  revalidatePath("/board");
  revalidatePath("/admin");
  return {};
}

export async function settle(
  claimId: string, pay: boolean,
): Promise<{ error?: string; paid?: number; ar?: number }> {
  const id = await me();
  if (!id) return { error: "Sign in first." };
  if (!(await isStaff(id))) return { error: "Staff only." };
  const res = await settleClaim(claimId, id, pay);
  if (!res.ok) return { error: res.reason };
  revalidatePath("/board");
  revalidatePath("/admin");
  revalidatePath("/me");
  return { paid: res.paid, ar: res.ar };
}
