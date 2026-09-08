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

/**
 * What the work pays, in both currencies, side by side and never added up.
 * Coin is gold because it is a quantity; the Ār tier is green because it is a
 * word — the tier's name, not its number, which the board does not promise.
 */
export function Reward({ p, tier }: { p: number; tier: string | null }) {
  return (
    <span className="reward">
      <span className="reward-coin">{pence(p)}</span>
      {tier && <span className="reward-ar">{tier} Ār</span>}
    </span>
  );
}

export function TakeButton({ missionId, taken }: { missionId: string; taken: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (taken) {
    return <span className="stamp">taken</span>;
  }
  return (
    <span className="f-stack">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setError((await take(missionId)).error ?? null))}
        className="btn"
      >
        {pending ? "Taking…" : "Take"}
      </button>
      {error && (
        <span className="f-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function SubmitWork({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <span className="stamp stamp--gold">submitted</span>;
  return (
    <form
      action={(fd) => start(async () => { await submit(fd); setDone(true); })}
      className="f-inline spaced-tight"
    >
      <input type="hidden" name="claim_id" value={claimId} />
      <label className="f-field" style={{ flex: "1 1 14rem" }}>
        <span className="f-label">What did you do?</span>
        <input name="note" type="text" maxLength={2000} />
      </label>
      <button disabled={pending} className="btn btn--ghost">
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

export function Settle({ claimId }: { claimId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  if (result) return <span className="quiet">{result}</span>;
  return (
    <span className="f-inline">
      {([true, false] as const).map((pay) => (
        <button
          key={String(pay)}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await settle(claimId, pay);
              setResult(
                r.error ??
                  (pay
                    ? `paid ${pence(r.paid ?? 0)}${r.ar ? ` · +${r.ar} Ār` : ""}`
                    : "rejected"),
              );
            })
          }
          className={pay ? "btn" : "btn btn--ghost"}
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

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn">
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
      className="note f-stack"
      style={{ flex: "1 1 22rem" }}
    >
      <p className="note-head">Post work</p>
      <label className="f-field">
        <span className="f-label">Title</span>
        <input name="title" type="text" maxLength={120} required />
      </label>
      <label className="f-field">
        <span className="f-label">What is the work?</span>
        <textarea name="brief" rows={3} maxLength={4000} required />
      </label>
      <div className="f-row f-row--tight">
        <label className="f-field">
          <span className="f-label">Pay <span className="opt">pence</span></span>
          <input name="reward" type="number" min={0} defaultValue={120} />
        </label>
        <label className="f-field">
          <span className="f-label">Ār tier</span>
          <select name="ar_tier" defaultValue="">
            <option value="">no Ār</option>
            <option value="minor">minor · 5</option>
            <option value="notable">notable · 10</option>
            <option value="considerable">considerable · 25</option>
            <option value="great">great · 50</option>
          </select>
        </label>
        <label className="f-field">
          <span className="f-label">Slots</span>
          <input name="slots" type="number" min={1} />
        </label>
        <label className="f-field">
          <span className="f-label">Where</span>
          <select name="town" defaultValue="">
            <option value="">anywhere</option>
            {towns.map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="f-error" role="alert">
          {error}
        </p>
      )}
      <div className="f-inline">
        <button disabled={pending} className="btn">
          {pending ? "Posting…" : "Post"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn--ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
