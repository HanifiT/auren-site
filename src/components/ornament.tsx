/**
 * The fairy register.
 *
 * Four hand-drawn marks in gold, one per view at most, at the section head.
 * They are the one place the app admits it is about an island where something
 * is going on — the rest of it is a clerk's handwriting, and the marks are what
 * the clerk drew in the margin when nobody was looking.
 *
 * Rules that keep them ornament rather than decoration:
 *
 *   - One per view. If a view reads busy, the ornament is the first thing cut.
 *   - `--gold`, never `--gold-lit` and never a text weight. They carry no
 *     meaning, so they carry no contrast requirement — and they must not look
 *     like something to click.
 *   - `aria-hidden`, always. A screen reader gains nothing from "toadstool".
 *   - No animation, no hover state, no fill. Line only.
 */

type Mark = "toadstool" | "crozier" | "lantern" | "hawthorn";

const PATHS: Record<Mark, React.ReactNode> = {
  /* A cap, a stalk, and the ring where it pushed through the leaf litter. */
  toadstool: (
    <>
      <path d="M4 12.5c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5c0 .9-.7 1.5-1.6 1.5H5.6C4.7 14 4 13.4 4 12.5Z" />
      <path d="M10.2 14v5.2c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8V14" />
      <path d="M8.4 18.8H6.1M17.9 18.8h-2.3" />
      <path d="M8.6 10.6h.02M12 8.6h.02M15.4 10.9h.02" />
    </>
  ),
  /* A fern still curled. The crozier is the tightest spiral in a hedge. */
  crozier: (
    <>
      <path d="M12 21.5V11.2c0-3.4 2.4-5.9 5.2-5.9 2.3 0 3.9 1.7 3.9 3.7 0 1.7-1.3 3-2.9 3-1.3 0-2.3-1-2.3-2.2 0-1 .8-1.8 1.7-1.8" />
      <path d="M12 17.6 8.2 14.2M12 13.4 8.8 10.7M12 9.6 9.4 7.6" />
    </>
  ),
  /* A lantern with the flame drawn as one stroke, because it is one stroke. */
  lantern: (
    <>
      <path d="M12 2.6c0 1.6-1.4 2-1.4 3.2 0 .8.6 1.4 1.4 1.4" />
      <path d="M7.4 8.2h9.2l-1 11.2a1.4 1.4 0 0 1-1.4 1.3H9.8a1.4 1.4 0 0 1-1.4-1.3Z" />
      <path d="M6.3 8.2h11.4M9.6 11.4l-.5 6.4M14.4 11.4l.5 6.4" />
    </>
  ),
  /* Hawthorn: three leaves, two haws, one thorn. The hedge's whole argument. */
  hawthorn: (
    <>
      <path d="M12 21.5V9.8" />
      <path d="M12 14.6c-2.6 0-4.6-1.7-4.6-4 2.6 0 4.6 1.7 4.6 4Z" />
      <path d="M12 11.4c2.6 0 4.6-1.7 4.6-4-2.6 0-4.6 1.7-4.6 4Z" />
      <path d="M12 18.4c-2.4 0-4.2-1.5-4.2-3.5 2.4 0 4.2 1.5 4.2 3.5Z" />
      <circle cx="15.6" cy="13.2" r="1.5" />
      <circle cx="17.4" cy="16.6" r="1.2" />
      <path d="M12 6.4V3.6" />
    </>
  ),
};

export function Ornament({ mark, size = 26 }: { mark: Mark; size?: number }) {
  return (
    <svg
      className="ornament"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[mark]}
    </svg>
  );
}
