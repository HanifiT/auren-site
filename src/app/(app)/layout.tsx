import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { isStaff } from "@/lib/queries";
import { slotsFor, type Slots } from "@/lib/roll";
import { Fell } from "@/components/fell";
import { Rail, type RailView } from "@/components/rail";

export const dynamic = "force-dynamic";

/**
 * The shell every authenticated route renders inside.
 *
 * It owns the viewport: a fixed rail on the left, a scrolling content area to
 * its right, and the fell behind both. It is not a max-width column on a
 * background — the page has no scroll of its own, only the content area does,
 * so the rail is present at every scroll position without being sticky.
 *
 * Next does not remount a layout when navigating between routes inside it, so
 * the rail keeps its scroll position and its focus across a view change and the
 * only thing that swaps is the content area.
 *
 * The Praesidium link is added from `account.is_staff`, which the bot writes
 * from live guild roles and the site's Postgres role cannot UPDATE. Hiding the
 * link is presentation; the page checks again for itself.
 */

const VIEWS: RailView[] = [
  { href: "/hearth", label: "The Hearth", sub: "where you stand" },
  { href: "/record", label: "The Record", sub: "your character" },
  { href: "/house", label: "The House", sub: "name and standing" },
  { href: "/tree", label: "The Tree", sub: "kin and claims" },
];

const ELSEWHERE: RailView[] = [
  { href: "/board", label: "The Board", sub: "work for hire" },
  { href: "/aedre", label: "The Ǣdre", sub: "the lines" },
];

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.discordId) redirect("/");

  // The rail must render even with the database down — a shell that vanishes
  // on a failed query takes the navigation with it, and then there is no way
  // back to a page that would have worked.
  let staff = false;
  let slots: Slots = {
    living: 0, livingAllowed: 1, departed: 0, dead: 0, pending: 0,
  };
  try {
    [staff, slots] = await Promise.all([
      isStaff(session.discordId),
      slotsFor(session.discordId),
    ]);
  } catch {
    /* counts unknown; the rail still navigates */
  }

  const views = staff
    ? [...VIEWS, { href: "/praesidium", label: "Praesidium", sub: "staff only" },
       ...ELSEWHERE]
    : [...VIEWS, ...ELSEWHERE];

  return (
    <div className="app">
      <Fell />
      <Rail
        views={views}
        who={session.user?.name ?? "Unnamed"}
        ofTheIsland={Boolean(session.inGuild)}
        slots={slots}
      />
      <main className="quire" id="quire">
        <div className="quire-inner">{children}</div>
      </main>
    </div>
  );
}
