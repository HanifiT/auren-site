/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Where the build lands.
   *
   * `next build` in the production directory replaces the content-hashed files
   * under `.next` while the running `next start` still holds the old build
   * manifest in memory, so the served HTML points at a stylesheet that no
   * longer exists and every asset 400s. The page still returns 200, so a
   * status check does not catch it — and restarting `auren-site` needs sudo,
   * which is not always to hand.
   *
   * So a verification build sets NEXT_DIST_DIR (see `npm run build:verify`)
   * and lands somewhere else entirely. Unset, this is Next's own default and
   * the deploy is unchanged.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /**
   * The two old paths.
   *
   * `/me` became `/hearth` and `/admin` became `/praesidium`. Both are in
   * Discord messages and in people's history, so they redirect rather than 404.
   *
   * THIS IS A CONFIG REDIRECT AND NOT A PAGE THAT CALLS `redirect()`, because
   * the page version silently did not work. A page component whose whole body
   * is `redirect()` has nothing dynamic in it, so Next prerenders it — and the
   * prerendered artefact is a 307 with NO Location header at all
   * (`.next/server/app/me.meta` carries only the status and the cache tags).
   * A browser receiving that stays where it is and shows nothing. Checked
   * against a running build; the config form sends a real 308 with a Location.
   */
  async redirects() {
    return [
      { source: "/me", destination: "/hearth", permanent: true },
      { source: "/admin", destination: "/praesidium", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      /**
       * Server actions default to a 1 MB body, and a crest plus a portrait
       * straight off a phone is several times that — the action threw a 413
       * before it ever reached `storeImage`, which surfaced in the browser as
       * a bare "Application error: a client-side exception has occurred".
       *
       * The form now crops and re-encodes both images in the browser, so a
       * normal submission is a few hundred KB. This limit is the backstop for
       * the no-JS path, where the raw file is posted as chosen; `LIMITS.maxBytes`
       * in lib/upload.ts (8 MB per image) is the real ceiling, and this sits
       * above it so the refusal comes from our code with a readable reason
       * rather than from the framework with none.
       */
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
