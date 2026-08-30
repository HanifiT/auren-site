/** @type {import('next').NextConfig} */
const nextConfig = {
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
