"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Choose an image, frame it, and hand the form the framed version.
 *
 * Three things this is doing, in order of how much they matter:
 *
 * 1. **It decides the crop here rather than on the server.** A portrait plate
 *    is 4:5 and a crest is square; letting the server centre-crop whatever
 *    arrived is how you get a picture of someone's chin.
 * 2. **It re-encodes before upload, so the request is small.** Server actions
 *    cap the request body, and a modern phone photo is several megabytes —
 *    that cap is what produced the client-side exception on submit. The canvas
 *    output is a few hundred KB whatever came in.
 * 3. **It never replaces `storeImage`.** The browser is not a trust boundary,
 *    so the server still re-encodes what it receives and still enforces its own
 *    limits. This is a convenience and a payload optimisation, nothing more.
 *
 * Without JavaScript the plain file input is what renders, and the raw file is
 * posted as chosen — which the server handles, just less kindly.
 */
export function ImageCrop({
  name,
  frameWidth = 300,
  aspect,
  output,
  hint,
  empty,
}: {
  name: string;
  /** Width of the framing box in CSS pixels; height follows from `aspect`. */
  frameWidth?: number;
  /** width / height of both the frame and the exported image. */
  aspect: number;
  output: { width: number; height: number };
  hint?: string;
  empty: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const frame = { w: frameWidth, h: Math.round(frameWidth / aspect) };

  useEffect(() => setMounted(true), []);
  // Object URLs are a leak if the component unmounts mid-edit.
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  /** Cover-fit: the frame is always fully painted, at zoom 1 exactly so. */
  const scaleOf = useCallback(
    (nat: { w: number; h: number }, z: number) =>
      Math.max(frame.w / nat.w, frame.h / nat.h) * z,
    [frame.w, frame.h],
  );

  const clamp = useCallback(
    (o: { x: number; y: number }, nat: { w: number; h: number }, z: number) => {
      const s = scaleOf(nat, z);
      const dw = nat.w * s, dh = nat.h * s;
      return {
        x: Math.min(0, Math.max(frame.w - dw, o.x)),
        y: Math.min(0, Math.max(frame.h - dh, o.y)),
      };
    },
    [frame.w, frame.h, scaleOf],
  );

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) { reset(); return; }
    if (!file.type.startsWith("image/")) {
      setError("That is not an image.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      image.current = img;
      const nat = { w: img.naturalWidth, h: img.naturalHeight };
      setNatural(nat);
      setZoom(1);
      const s = scaleOf(nat, 1);
      setOffset({ x: (frame.w - nat.w * s) / 2, y: (frame.h - nat.h * s) / 2 });
      setSrc(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That file could not be read as an image.");
    };
    img.src = url;
  }

  function reset() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setNatural(null);
    image.current = null;
    if (input.current) input.current.value = "";
  }

  // ── dragging ──────────────────────────────────────────────────────────
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function down(e: React.PointerEvent) {
    if (!natural) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function move(e: React.PointerEvent) {
    if (!drag.current || !natural) return;
    setOffset(
      clamp(
        {
          x: drag.current.ox + (e.clientX - drag.current.x),
          y: drag.current.oy + (e.clientY - drag.current.y),
        },
        natural,
        zoom,
      ),
    );
  }
  function up(e: React.PointerEvent) {
    drag.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  function nudge(e: React.KeyboardEvent) {
    if (!natural) return;
    const step = e.shiftKey ? 20 : 5;
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const d = by[e.key];
    if (!d) return;
    e.preventDefault();
    setOffset(clamp({ x: offset.x + d[0], y: offset.y + d[1] }, natural, zoom));
  }

  function rezoom(z: number) {
    if (!natural) return;
    // Zoom about the centre of the frame, so the thing you were looking at is
    // still the thing you are looking at.
    const before = scaleOf(natural, zoom);
    const after = scaleOf(natural, z);
    const cx = (frame.w / 2 - offset.x) / before;
    const cy = (frame.h / 2 - offset.y) / before;
    setZoom(z);
    setOffset(clamp({ x: frame.w / 2 - cx * after, y: frame.h / 2 - cy * after }, natural, z));
  }

  // ── export ────────────────────────────────────────────────────────────
  //
  // Debounced: dragging fires continuously, and re-encoding on every frame
  // would make the drag itself stutter.
  useEffect(() => {
    const img = image.current;
    if (!img || !natural) return;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const s = scaleOf(natural, zoom);
        const canvas = document.createElement("canvas");
        canvas.width = output.width;
        canvas.height = output.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(
          img,
          -offset.x / s, -offset.y / s, frame.w / s, frame.h / s,
          0, 0, output.width, output.height,
        );
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/webp", 0.9),
        );
        if (!blob || !input.current) return;
        // Handing the framed image back through the same <input> keeps the
        // form a plain form: nothing intercepts submit, and the field is
        // serialised exactly as it would have been.
        // `toBlob` is specified to fall back to PNG where the requested type
        // is not supported, so the name follows the blob rather than the ask.
        const type = blob.type || "image/webp";
        const ext = type === "image/webp" ? "webp" : "png";
        const dt = new DataTransfer();
        dt.items.add(new File([blob], `${name}.${ext}`, { type }));
        input.current.files = dt.files;
      } catch {
        // Leave whatever the user chose in the input. The server re-encodes
        // and enforces its own limits, so an un-cropped upload still works.
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [natural, zoom, offset, output.width, output.height, frame.w, frame.h, name, scaleOf]);

  const s = natural ? scaleOf(natural, zoom) : 1;

  return (
    <div>
      <input
        ref={input}
        id={name}
        type="file"
        name={name}
        accept="image/*"
        onChange={pick}
        className={mounted && src ? "hidden" : undefined}
      />

      {src && natural && (
        <div className="mt-4 flex flex-wrap items-start gap-5">
          <div
            className="plate"
            style={{ width: frame.w, height: frame.h }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={nudge}
            aria-label="Position the picture: drag it, or use the arrow keys"
            tabIndex={0}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: natural.w * s,
                height: natural.h * s,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
            <span className="plate-grid" aria-hidden />
          </div>

          <div className="min-w-[12rem] flex-1">
            <label className="field-label" htmlFor={`${name}-zoom`}>
              Closer
            </label>
            <input
              id={`${name}-zoom`}
              type="range"
              min={1}
              max={4}
              step={0.02}
              value={zoom}
              onChange={(e) => rezoom(Number(e.target.value))}
              className="w-full"
            />
            <p className="hint mt-2">
              Drag the picture to move it{busy ? " · framing…" : ""}
            </p>
            <button
              type="button"
              onClick={reset}
              className="act act--ink act--small mt-4"
            >
              Choose another
            </button>
          </div>
        </div>
      )}

      {!src && <p className="hint mt-2">{empty}</p>}
      {hint && src && <p className="hint mt-3">{hint}</p>}
      {error && <p className="mt-2 text-sm text-rubric">{error}</p>}
    </div>
  );
}
