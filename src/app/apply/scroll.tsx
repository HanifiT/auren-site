"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The census unrolls.
 *
 * The sheet animates from height 0 to its measured height, then is released to
 * `auto` — without that release, switching between founding and petitioning
 * would change the content height under a frozen container and clip the form.
 * Reduced motion skips straight to `auto`.
 */
export function Scroll({ children }: { children: React.ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string>("0px");

  useEffect(() => {
    const el = inner.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHeight("auto");
      return;
    }

    const frame = requestAnimationFrame(() =>
      setHeight(`${el.getBoundingClientRect().height}px`),
    );
    // Belt and braces: transitionend is the real signal, the timer covers the
    // case where the transition never fires (tab backgrounded on mount).
    const release = () => setHeight("auto");
    const node = sheet.current;
    node?.addEventListener("transitionend", release, { once: true });
    const timer = setTimeout(release, 2400);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      node?.removeEventListener("transitionend", release);
    };
  }, []);

  return (
    <div className="scrollcase mx-auto max-w-[44rem]">
      {/* Without JS nothing ever unrolls the sheet, and the census would be a
          closed scroll. Server actions still work without it, so the form has
          to be reachable. */}
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: ".sheet{height:auto!important}" }} />
      </noscript>
      <div className="roller roller--top" />
      <div ref={sheet} className="sheet" style={{ height }}>
        <div ref={inner} className="sheet-in px-[clamp(1.6rem,4vw,3.4rem)] pb-14 pt-11">
          {children}
        </div>
      </div>
      <div className="roller roller--bottom" />
    </div>
  );
}

/**
 * One numbered line of the register. The numerals are rubricated because the
 * census really is an ordered list — the numbering is true, not decoration.
 */
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function Entry({
  n,
  label,
  htmlFor,
  children,
}: {
  n: number;
  label?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);

  return (
    <div
      className={`entry ${shown ? "shown" : ""}`}
      style={{ transitionDelay: `${320 + n * 190}ms` }}
    >
      <div className="numeral">{NUMERALS[n] ?? n + 1}</div>
      <div>
        {label &&
          (htmlFor ? (
            <label className="field-label" htmlFor={htmlFor}>
              {label}
            </label>
          ) : (
            <span className="field-label">{label}</span>
          ))}
        {children}
      </div>
    </div>
  );
}

/** The same staggered reveal, for rows that are not numbered register lines. */
export function Reveal({
  n,
  className = "",
  children,
}: {
  n: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  return (
    <div
      className={`fade ${shown ? "shown" : ""} ${className}`}
      style={{ transitionDelay: `${320 + n * 190}ms` }}
    >
      {children}
    </div>
  );
}
