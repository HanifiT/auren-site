# auren-rp.xyz

Next.js 14 (app router), on `127.0.0.1:3200` behind nginx. **The bot owns the
database and this reads it** — the boundary is enforced by Postgres grants
(`db/002_site_grants.sql` onward), not by convention in this code.

> **Where this comes from.** This repository is the `site/` directory of the
> Auren bot's repository, published on its own. Several things this README and
> the code comments refer to live there rather than here: the database schema
> and grants (`db/*.sql`), `config/standing.yml` and the script that generates
> `src/lib/ladder.generated.ts` and `src/lib/towns.generated.ts` from it
> (`tools/gen_site_config.py`), and the Python tests that fail when the two
> drift (`tests/test_site_ladder.py`). The generated files are committed, so
> this builds and tests on its own — but edit the YAML there, not the generated
> TypeScript here.

## The application

Everything behind a login renders inside one shell, `src/app/(app)/layout.tsx`:
a persistent rail and a scrolling content area. Five views.

| route | what it is |
| --- | --- |
| `/hearth` | the landing view once signed in — your character, your House's standing, the counts |
| `/record` | the character sheet, as a filled-in registry |
| `/house` | motto, seat, purse, members, and the Ār ladder |
| `/tree` | parents, married to, children, and the claim-a-tie flow |
| `/praesidium` | staff only — counts, the roll, petitions |

`/me` and `/admin` are the old names and redirect permanently. They redirect
from `next.config.mjs` rather than from a page component: a page whose whole
body is `redirect()` gets prerendered, and the prerendered artefact is a 307
with **no Location header at all**, which a browser will not follow.

Outside the shell: `/` (landing), `/apply` (the census), `/roster`, `/board`,
`/aedre`.

## The ladder

`src/lib/ladder.generated.ts` is **generated from `config/standing.yml`** by
`python tools/gen_site_ladder.py`. Do not hand-edit it —
`tests/test_site_ladder.py` regenerates it and fails if the result differs.

Where `docs/standing.md` and the config disagree, the config is right. The prose
says two rungs need generational depth; the data gates four (Hold, Ealdormann,
Hersir at one completed succession, Hlāford at two).

`src/lib/standing.ts` is the arithmetic on top, mirroring
`Standing.rank_for` in `core/standing.py`: scan the whole ladder and keep the
last rung satisfying **both** gates, rather than stopping at the first blocked
one. The two only agree for every input if this one does the same.

**Ār and coin never convert.** No view may show a combined figure, a rate, or
one progress bar covering both.

## Commands

```bash
npm run dev             # DO NOT RUN IN THE DEPLOYED DIRECTORY — see below
npm test                # the ladder arithmetic, under node --test
npm run audit:contrast  # every surface in the app, against WCAG AA
npm run build:verify    # a production build that does not touch the live one
npm run build           # the real build. Takes the site down until it restarts.
```

`npm test` compiles `src/lib/standing.ts` and its test with the TypeScript
already in `node_modules` and hands the result to node's built-in runner. No
test framework is installed: one assertion module is not worth a dependency
tree.

## Building on the box that serves the site

`npm run build` in the deployed directory **takes the live site down until it
restarts**. `next start` holds the old build manifest in memory while `next
build` replaces the content-hashed files under `.next`, so the served HTML
points at a stylesheet that no longer exists and every asset 400s. The page
still returns 200, so a status-code check will not catch it — compare the
stylesheet href against `ls .next/static/css/`.

`npm run build:verify` sets `NEXT_DIST_DIR=.next-verify` and lands somewhere
else entirely, leaving the served `.next` untouched. Use it for every check that
is not an actual deploy.

Restarting needs sudo (`auren-site` is a **system** unit, and there is no polkit
rule). `Restart=on-failure` does not cover a clean SIGTERM, so killing the main
PID stops the site rather than cycling it:

```bash
kill $(ss -tlnp | grep ':3200' | grep -o 'pid=[0-9]*' | cut -d= -f2)
sudo systemctl start auren-site
```

Never `pkill -f "next start"` — the pattern matches the systemd ExecStart line
and the shell running it.
