import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import sharp from "sharp";

/**
 * Portrait and crest uploads.
 *
 * **Re-encode, never strip.** A metadata editor removes the tags it knows
 * about; a re-encode cannot preserve what it never decodes. GPS coordinates in
 * a maker-note a stripper does not recognise survive stripping and do not
 * survive this.
 *
 * **The original is never written to disk.** It exists as a buffer, is decoded,
 * and the decoded pixels are re-encoded to a new file. Keeping the original
 * "just in case" defeats the whole exercise, whatever the intention for it was.
 *
 * Dimensions are capped, and the output is always WebP — one format out means
 * one decoder path for everything downstream.
 */

const ROOT = path.resolve(process.cwd(), "..", "uploads");

export const LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  portrait: { width: 800, height: 1000 },
  crest: { width: 512, height: 512 },
} as const;

const ACCEPTED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
]);

export type UploadKind = "portrait" | "crest";

export async function storeImage(
  file: File,
  kind: UploadKind,
): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
  if (!file || file.size === 0) return { ok: false, reason: "No file given." };
  if (file.size > LIMITS.maxBytes) {
    return { ok: false, reason: "That image is over 8MB." };
  }
  if (!ACCEPTED.has(file.type)) {
    return { ok: false, reason: "JPEG, PNG, WebP, AVIF or GIF, please." };
  }

  const input = Buffer.from(await file.arrayBuffer());
  const cap = LIMITS[kind];

  try {
    const out = await sharp(input, { animated: false })
      .rotate()                     // apply EXIF orientation, then discard it
      .resize({ ...cap, fit: "inside", withoutEnlargement: true })
      // No `.withMetadata()`. Its absence is the point: sharp writes no EXIF,
      // no ICC, no XMP unless asked, so the re-encode carries none of it.
      .webp({ quality: 82 })
      .toBuffer();

    const dir = path.join(ROOT, kind === "portrait" ? "portraits" : "crests");
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(dir, name), out);
    return { ok: true, path: `${kind}s/${name}` };
  } catch (err) {
    // A decode failure is usually a file that is not the image it claims to
    // be, which is worth refusing rather than diagnosing.
    console.error("storeImage failed", err);
    return { ok: false, reason: "That file could not be read as an image." };
  }
}
