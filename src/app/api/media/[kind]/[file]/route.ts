import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

import { NextResponse } from "next/server";

/**
 * Serves the re-encoded portraits and crests.
 *
 * `storeImage` has always written these to `../uploads`, and nothing has ever
 * served them — an uploaded likeness went to disk and was never seen again.
 * This is the read side.
 *
 * **The name is the whole access check, so the name is checked hard.** Both
 * segments are matched against a fixed pattern before they are joined to
 * anything: the kind must be one of two literals and the file must be exactly
 * a v4 UUID with a `.webp` suffix. `..`, an absolute path, a URL-encoded
 * separator and a symlink name all fail that pattern, so the join below cannot
 * be steered out of the uploads directory. The resolved path is then checked
 * against the root as well, because one guard is a typo away from none.
 *
 * These are not secret — the roster is public and so are the faces on it — but
 * a UUID filename is not enumerable either, which is the right posture for a
 * picture somebody uploaded of themselves.
 */

const ROOT = path.resolve(process.cwd(), "..", "uploads");
const KINDS: Record<string, string> = { portraits: "portraits", crests: "crests" };
const NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export async function GET(
  _req: Request,
  { params }: { params: { kind: string; file: string } },
) {
  const kind = KINDS[params.kind];
  if (!kind || !NAME.test(params.file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = path.resolve(ROOT, kind, params.file);
  if (file !== path.join(ROOT, kind, params.file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const stream = Readable.toWeb(
      createReadStream(file),
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(info.size),
        // The name is a UUID and the bytes behind it never change, so this can
        // be cached for as long as anyone likes.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
