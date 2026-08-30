"use client";

import { useState, useTransition } from "react";

import { post, settle, submit, take } from "./actions";

function pence(n: number): string {
  const parts: string[] = [];
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return parts.join(" ");
}

export function Reward({ p, tier }: { p: number; tier: string | null }) {
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-rubric">{pence(p)}</span>
      {tier && <span className="ml-2 text-[#4d6b3f]">· {tier} Ār</span>}
    </span>
  );
}

export function TakeButton({ missionId, taken }: { missionId: string; taken: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (taken) {
    return <span className="text-xs uppercase tracking-wider text-[#4d6b3f]">taken</span>;
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        disabled={pending}
        onClick={() => start(async () => setError((await take(missionId)).error ?? null))}
        className="act act--rubric act--small"
      >
        {pending ? "…" : "Take"}
      </button>
      {error && <span className="text-xs text-rubric">{error}</span>}
    </span>
  );
}

export function SubmitWork({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) {
    return <span className="text-xs uppercase tracking-wider text-rubric">submitted</span>;
  }
  return (
    <form
      action={(fd) => start(async () => { await submit(fd); setDone(true); })}
      className="mt-3 flex gap-2"
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <input
        name="note"
        placeholder="What did you do?"
        maxLength={2000}
        className="flex-1 border border-vellum-deep bg-[rgba(255,250,236,.5)] px-3 py-2 text-sm outline-none focus:border-rubric"
      />
      <button
        disabled={pending}
        className="act act--ink act--small"
      >
        {pending ? "…" : "Submit"}
      </button>
    </form>
  );
}

export function Settle({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  if (result) return <span className="text-xs text-[#4d6b3f]">{result}</span>;
  return (
    <span className="flex gap-2">
      {([true, false] as const).map((pay) => (
        <button
          key={String(pay)}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await settle(claimId, pay);
              setResult(
                r.error ??
                  (pay ? `paid ${pence(r.paid ?? 0)}${r.ar ? ` · +${r.ar} Ār` : ""}`
                       : "rejected"),
              );
            })
          }
          className={`border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors disabled:opacity-40 ${
            pay
              ? "border-[#4d6b3f] text-[#4d6b3f] hover:bg-[rgba(77,107,63,.1)]"
              : "border-vellum-deep text-ink-faint hover:bg-[rgba(255,250,236,.5)]"
          }`}
        >
          {pay ? "Pay" : "Reject"}
        </button>
      ))}
    </span>
  );
}

export function PostMission({ towns }: { towns: readonly { name: string }[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const field =
    "w-full border border-vellum-deep bg-[rgba(255,250,236,.5)] px-3 py-2 text-sm outline-none focus:border-rubric";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="act act--rubric act--small"
      >
        Post work
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        start(async () => {
          const r = await post(fd);
          setError(r.error ?? null);
          if (!r.error) setOpen(false);
        })
      }
      className="space-y-3 border border-vellum-deep p-5"
    >
      <input name="title" placeholder="Title" maxLength={120} required className={field} />
      <textarea name="brief" placeholder="What is the work?" rows={3} maxLength={4000} required className={field} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="reward" type="number" min={0} defaultValue={120} placeholder="Pence" className={field} />
        <select name="ar_tier" defaultValue="" className={field}>
          <option value="">no Ār</option>
          <option value="minor">minor · 5</option>
          <option value="notable">notable · 10</option>
          <option value="considerable">considerable · 25</option>
          <option value="great">great · 50</option>
        </select>
        <input name="slots" type="number" min={1} placeholder="Slots" className={field} />
        <select name="town" defaultValue="" className={field}>
          <option value="">anywhere</option>
          {towns.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-rubric">{error}</p>}
      <div className="flex gap-2">
        <button disabled={pending}
          className="act act--rubric act--small">
          {pending ? "Posting…" : "Post"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="act act--ink act--small">
          Cancel
        </button>
      </div>
    </form>
  );
}
