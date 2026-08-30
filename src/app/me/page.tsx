import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { characterFor, cynnFor, deedsFor, type Deed } from "@/lib/cynn";
import { isStaff, ticketsFor } from "@/lib/queries";
import { SignOut } from "@/components/auth-buttons";
import { Back, Leaf } from "@/components/leaf";
import { TOWNS, inchesToWords } from "@/lib/options";
import { standingFor } from "@/lib/standing";

export const dynamic = "force-dynamic";

/** Pence -> `£1 2s 10d`. Mirrors core/money.py. */
function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const n = Math.abs(Math.trunc(pence));
  const parts: string[] = [];
  const pounds = Math.floor(n / 240);
  const shillings = Math.floor((n % 240) / 12);
  const d = n % 12;
  if (pounds) parts.push(`£${pounds}`);
  if (shillings) parts.push(`${shillings}s`);
  if (d || parts.length === 0) parts.push(`${d}d`);
  return sign + parts.join(" ");
}

/** Status reads as a marginal annotation, so it is set in the clerk's colours. */
const STATUS_COLOUR: Record<string, string> = {
  admitted: "border-[#4d6b3f] text-[#4d6b3f]",
  pending: "border-gilt text-gilt",
  disowned: "border-ink-faint text-ink-faint",
  open: "border-gilt text-gilt",
  claimed: "border-rubric text-rubric",
  closed: "border-ink-faint text-ink-faint",
};

function Tag({ status }: { status: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider ${
        STATUS_COLOUR[status] ?? "border-vellum-deep text-ink-soft"
      }`}
    >
      {status}
    </span>
  );
}

/**
 * One boxed field of the sheet.
 *
 * An unanswered box still prints. A sheet with gaps in it reads as a sheet
 * somebody has not finished filling in, which is true and useful; a sheet with
 * the empty fields quietly removed reads as a shorter sheet, which is a lie.
 */
function Box({
  label,
  value,
  note,
  figure = false,
}: {
  label: string;
  value?: string | number | null;
  note?: string | null;
  figure?: boolean;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={`box ${figure ? "box--figure" : ""}`}>
      <span className="box-label">{label}</span>
      <span className={`box-value ${empty ? "box-value--empty" : ""}`}>
        {empty ? "not said" : value}
      </span>
      {note && !empty && (
        <span className="mt-1 block text-[0.78rem] leading-snug text-ink-soft">
          {note}
        </span>
      )}
    </div>
  );
}

/** The name, opened with a rubricated initial the way the roll would open it. */
function Rubricated({ name }: { name: string }) {
  return (
    <>
      <span className="drop">{name.slice(0, 1)}</span>
      {name.slice(1)}
    </>
  );
}

export default async function Me() {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  let character = null,
    cynn = null;
  let deeds: Deed[] = [];
  let tickets: Awaited<ReturnType<typeof ticketsFor>> = [];
  let staff = false,
    unavailable = false;
  try {
    [character, cynn, tickets, staff] = await Promise.all([
      characterFor(session.discordId),
      cynnFor(session.discordId),
      ticketsFor(session.discordId),
      isStaff(session.discordId),
    ]);
    if (cynn) deeds = await deedsFor(cynn.id);
  } catch {
    unavailable = true;
  }

  const town = cynn ? TOWNS.find((t) => t.name === cynn!.origin_town) : null;
  const standing = cynn ? standingFor(cynn.ar, cynn.successions) : null;
  const name = session.user?.name ?? "Unnamed";

  // ── nothing entered yet ────────────────────────────────────────────────
  if (!character) {
    return (
      <Leaf full width="max-w-3xl">
        <Back href="/">← Auren</Back>
        <div className="record mt-10 max-w-[40rem] p-[clamp(2rem,4vw,3rem)]">
          <p className="eyebrow">Roll of souls</p>
          <h1 className="display mt-3 text-[2.6rem]">
            <Rubricated name={name} />
          </h1>
          <p className="mt-1 italic text-ink-soft">
            of the island —{" "}
            {session.inGuild
              ? "no House, no charter, no entry."
              : "not yet of the island."}
          </p>

          {unavailable ? (
            <p className="mt-8 border border-vellum-deep px-4 py-3 text-sm text-ink-soft">
              The records are unreachable just now. Nothing is lost.
            </p>
          ) : (
            <>
              <p className="mt-8 text-ink-soft">
                Nothing is written against this name yet. The census sits open
                at the next blank line.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/apply" className="act act--rubric">
                  Present yourself
                </Link>
                <SignOut variant="ink" />
              </div>
            </>
          )}
        </div>
      </Leaf>
    );
  }

  // ── the sheet ──────────────────────────────────────────────────────────
  const height = character.height_cm
    ? `${character.height_cm} cm`
    : null;

  return (
    <Leaf full width="max-w-4xl">
      <Back href="/">← Auren</Back>

      <header className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Roll of souls · entered</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.6rem)]">
            {character.name}
          </h1>
          <p className="mt-1 italic text-ink-soft">
            {cynn
              ? `of ${cynn.name}, of ${cynn.origin_town}`
              : "of no House"}
          </p>
        </div>
        <Tag status={character.membership} />
      </header>

      <div className="hair mt-6 max-w-none" />

      <div className="mt-8 grid gap-8 md:grid-cols-[15rem_1fr]">
        {/* The likeness, plated. */}
        <div>
          {character.portrait_path ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className="plate plate--still w-full"
              style={{ aspectRatio: "4 / 5" }}
              src={`/api/media/${character.portrait_path}`}
              alt={`${character.name}, as entered in the census`}
            />
          ) : (
            <div
              className="plate plate--still grid w-full place-items-center"
              style={{ aspectRatio: "4 / 5" }}
            >
              <span className="px-4 text-center text-sm italic text-ink-soft">
                No likeness taken.
              </span>
            </div>
          )}

          {cynn?.crest_path && (
            <div className="mt-5 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="plate plate--still h-16 w-16"
                src={`/api/media/${cynn.crest_path}`}
                alt={`The crest of ${cynn.name}`}
              />
              <div className="text-sm">
                <span className="box-label">Borne</span>
                <span className="display text-lg">{cynn.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* The boxes. */}
        <div>
          <div className="sheet-grid">
            <Box label="Age" value={character.age ? `${character.age}` : null} figure />
            <Box label="Bearing" value={character.bearing} />
            <Box label="Trade" value={character.trade} />
            <Box
              label="Height"
              value={height}
              note={character.height_cm ? inchesToWords(character.height_cm) : null}
            />
            <Box label="Build" value={character.build} />
            <Box label="Hair" value={character.hair_colour} note={character.hair_style} />
            <Box label="Eyes" value={character.eyes} />
            <Box label="Complexion" value={character.complexion} />
          </div>

          <div className="panel mt-6">
            <span className="box-label">Marks</span>
            {character.marks ? (
              <p className="mt-1">{character.marks}</p>
            ) : (
              <p className="mt-1 italic text-ink-faint">
                Nothing the assessor thought worth noting.
              </p>
            )}
          </div>

          {character.short && (
            <div className="panel mt-4">
              <span className="box-label">In the margin</span>
              <p className="mt-1 text-[1.05rem]">{character.short}</p>
            </div>
          )}
        </div>
      </div>

      {character.bio && (
        <section className="mt-10">
          <p className="eyebrow">The long account</p>
          <div className="panel mt-3">
            <p className="max-w-[var(--measure)] whitespace-pre-wrap leading-relaxed">
              {character.bio}
            </p>
          </div>
        </section>
      )}

      {cynn && standing && (
        <section className="mt-14">
          <p className="eyebrow">The House</p>

          <div className="record mt-4 p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="display text-[2rem]">{cynn.name}</span>
              {/* The rung, not the raw figure. `ar` alone tells a player
                  nothing: the number is meaningless without the band it sits
                  on, and every House starts at Cuma however the draw fell. */}
              <span className="text-right">
                <span className="display block text-[2rem] text-rubric">
                  {standing.rung.name}
                </span>
                <span className="field-label">
                  {cynn.ar} Ār · {standing.rung.sense}
                </span>
              </span>
            </div>
            {cynn.motto && (
              <p className="mt-1 italic text-ink-soft">
                &ldquo;{cynn.motto}&rdquo;
              </p>
            )}
            <p className="field-label mt-4">
              of {cynn.origin_town}
              {town && town.standing !== "neither" && ` · ${town.standing}`}
              {town?.forsaken && " · the name carries nowhere"}
            </p>
            {cynn.draw_text && (
              <p className="mt-4 border-t border-vellum-deep pt-4 text-sm leading-relaxed">
                {cynn.draw_text}
              </p>
            )}
            {cynn.draw_hook && (
              <p className="mt-2 text-sm italic text-ink-soft">{cynn.draw_hook}</p>
            )}

            {/* Successions are gated separately from Ār, so a House can be
                over the threshold and still held. Say which it is. */}
            {standing.blocked ? (
              <p className="mt-3 text-sm text-ink-soft">
                {standing.blocked.name} is within reach on Ār, but wants{" "}
                {standing.blocked.requiresSuccessions} completed succession
                {standing.blocked.requiresSuccessions > 1 ? "s" : ""}.
              </p>
            ) : standing.next ? (
              <p className="mt-3 text-sm text-ink-soft">
                {standing.next.threshold - cynn.ar} Ār to {standing.next.name}.
              </p>
            ) : null}

            <div className="mt-5 flex items-baseline justify-between border-t border-vellum-deep pt-4">
              <span className="field-label mb-0">Purse</span>
              <span className="display text-xl text-rubric">{formatPence(0)}</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">
              Held by the House. Crown scrip — good on the island.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/tree" className="act act--ink act--small">
                The tree →
              </Link>
              <Link href="/board" className="act act--ink act--small">
                The board →
              </Link>
            </div>
          </div>

          {deeds.length > 0 && (
            <ul className="mt-6 space-y-2">
              {deeds.map((d, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-4 border-b border-vellum-deep pb-2 text-sm"
                >
                  <span className="text-ink-soft">{d.reason}</span>
                  <span className="whitespace-nowrap text-rubric">+{d.ar} Ār</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tickets.length > 0 && (
        <section className="mt-14">
          <p className="eyebrow">Petitions</p>
          <ul className="mt-4 space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 border border-vellum-deep bg-[rgba(255,250,236,.35)] px-4 py-3"
              >
                <span className="truncate text-sm">{t.topic}</span>
                <Tag status={t.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-16 flex flex-wrap items-center gap-4">
        <SignOut variant="ink" />
        {staff && (
          <Link href="/admin" className="act act--rubric">
            Praesidium
          </Link>
        )}
      </div>
    </Leaf>
  );
}
