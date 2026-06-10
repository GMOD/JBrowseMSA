# website

The documentation portal for JBrowseMSA — a small [Astro](https://astro.build)
site (plain Astro + React, mirroring the jbrowse-components website). It unifies
the existing docs and embeds the **live viewer** as a React island on the
homepage.

```sh
pnpm --filter website dev       # local dev server
pnpm --filter website build     # static build → dist/
pnpm --filter website preview   # preview the build
# or from the repo root: pnpm build:site
```

## How it's wired

- **`src/pages/index.astro`** — landing page: hero, a live `MSAViewer`
  (`src/components/Viewer.tsx`, rendered `client:only="react"`), and link cards.
- **`src/pages/guide.astro` / `embedding.astro`** — render the repo's existing
  markdown (`docs/user_guide.md`, `USAGE.md`) directly, so the docs are not
  duplicated. A small rehype plugin in `astro.config.mjs` rewrites every
  markdown `<img>` to `/{base}/media/<file>`.
- **`scripts/sync-media.mjs`** copies `docs/media/*` into `public/media/`
  (run automatically by `dev`/`build`); `public/media` is git-ignored.

## Adding a page

Drop a `.astro` file in `src/pages/`, wrap it in `../layouts/Base.astro`, and
add it to the `nav` array in that layout. To surface another existing markdown
doc, `import { Content } from '../../../../<path>.md'` and render `<Content />`.

## Deployment

Deployed to **gmod.org/JBrowseMSA** (hence `base: '/JBrowseMSA'` in
`astro.config.mjs`), with the demo **app** bundled in at
**gmod.org/JBrowseMSA/demo**.

From the repo root, `pnpm build:pages` builds this site plus the app into
`pages-dist/` (docs at the root, app under `/demo`, with a `.nojekyll` so
Astro's `_astro/` assets survive). The
[Deploy docs site](../../.github/workflows/deploy-docs.yml) workflow publishes
`pages-dist/` to the `gh-pages` branch on every push to `main`; `pnpm
deploy:pages` does the same by hand.

The interactive **examples gallery** (`packages/examples`,
jbrowse.org/storybook/msa) deploys separately and must be run locally
(`pnpm deploy:storybook`, needs AWS credentials).
