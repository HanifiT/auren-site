import type { ReactNode } from "react";

/**
 * The register's small pieces.
 *
 * Everything the views are built from, so that "a filled-in registry" is one
 * decision made once rather than a look each page approximates. No colours
 * here: these carry class names and the palette lives in globals.css.
 */

export function PageHead({
  eyebrow,
  title,
  epithet,
  aside,
  lede,
}: {
  eyebrow: string;
  title: string;
  epithet?: ReactNode;
  aside?: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <header className={`page-head${aside ? " page-head--split" : ""}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {epithet && <p className="epithet">{epithet}</p>}
        {lede && <p className="lede">{lede}</p>}
      </div>
      {aside}
    </header>
  );
}

/**
 * One boxed field.
 *
 * An unanswered field still prints, marked as unanswered. A sheet with the
 * empty fields quietly removed reads as a shorter sheet, which is a lie about
 * what the census actually holds — and on this app most of them are empty on
 * the day a character is entered.
 *
 * `absent` is the stronger case: not "nobody answered" but "the register has no
 * column for this". Those say so in their own words rather than pretending
 * somebody merely left it blank.
 */
export function Field({
  name,
  value,
  under,
  absent,
}: {
  name: string;
  value?: string | number | null;
  under?: string | null;
  absent?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="field">
      <p className="field-name">{name}</p>
      <p className={`field-value${empty ? " field-value--empty" : ""}`}>
        {empty ? absent ?? "not said" : value}
      </p>
      {under && !empty && <p className="field-under">{under}</p>}
    </div>
  );
}

export function Ledger({ children }: { children: ReactNode }) {
  return <div className="ledger">{children}</div>;
}

export function LedgerBlock({
  head,
  children,
}: {
  head: string;
  children: ReactNode;
}) {
  return (
    <>
      <p className="ledger-head">{head}</p>
      <div className="ledger-grid">{children}</div>
    </>
  );
}

export function Note({
  head,
  children,
  className = "",
}: {
  head: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`note ${className}`}>
      <p className="note-head">{head}</p>
      {children}
    </section>
  );
}

export function Stamp({
  word,
  tone = "leaf",
}: {
  word: string;
  tone?: "leaf" | "gold" | "quiet";
}) {
  const cls = tone === "leaf" ? "" : ` stamp--${tone}`;
  return <span className={`stamp${cls}`}>{word}</span>;
}

export function Empty({ title, line }: { title: string; line: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {line}
    </div>
  );
}

/**
 * The counts strip.
 *
 * Ār and coin both appear here and they are separate cells with separate
 * labels. Nothing sums them, nothing puts them on one bar, and there is no
 * cell that mixes them: the moment there is a rate between the two, Ār is a
 * second money and stops meaning anything.
 */
export function Strip({
  cells,
}: {
  cells: { n: ReactNode; label: string }[];
}) {
  return (
    <section className="strip">
      {cells.map((c) => (
        <div key={c.label} className="strip-cell">
          <p className="strip-num">{c.n}</p>
          <p className="strip-label">{c.label}</p>
        </div>
      ))}
    </section>
  );
}

/** A day, written the way the register writes one. */
export function onDay(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}
