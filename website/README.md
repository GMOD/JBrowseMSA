# website

The documentation site for JBrowseMSA, a small [Astro](https://astro.build) site
(plain Astro + React, like the jbrowse-components website). The site renders the
repo's docs and embeds the **live viewer** as a React island on the homepage.

```sh
pnpm --filter website dev       # local dev server
pnpm --filter website build     # static build → dist/
pnpm --filter website preview   # preview the build
# or from the repo root: pnpm build:site
```

## How it's wired

| Page                     | What it is                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `index.astro`            | Landing page: hero, a live `MSAViewer` (`src/components/Viewer.tsx`, `client:only="react"`) |
| `guide.astro`            | `docs/user_guide.md`                                                                        |
| `layers.astro`           | `docs/layers.md`                                                                            |
| `embedding.astro`        | `USAGE.md`                                                                                  |
| `cli.astro`              | `packages/cli/README.md`                                                                    |
| `r-package.astro`        | `packages/r-msaview/README.md`                                                              |
| `tutorials/index.astro`  | Cards from `src/lib/tutorials.ts`                                                           |
| `tutorials/[slug].astro` | One page per `docs/tutorials/*.md`                                                          |
| `gallery.astro`          | Alignments that carry a finding, each a link into the app or JBrowse                        |
| `examples.astro`         | `packages/examples` as a React island (`ExamplesApp`)                                       |

Rendering the repo's markdown keeps the docs in one place. A small rehype plugin
in `astro.config.mjs` rewrites every markdown `<img>` to `/{base}/media/<file>`,
wraps a screenshot and the paragraph under it into a `<figure>`, and gives every
heading an id. `scripts/sync-media.mjs` copies `docs/media/*` into
`public/media/` (run automatically by `dev`/`build`); `public/media` is
git-ignored.

## Adding a page

Drop a `.astro` file in `src/pages/`, wrap it in `../layouts/Base.astro`, and
add it to the `groups` array in that layout. To surface another existing
markdown doc, `import { Content } from '../../../<path>.md'` (three `../` reach
the repo root from `src/pages/`) and render `<Content />`. A tutorial needs no
page: add the markdown to `docs/tutorials/` and an entry to
`src/lib/tutorials.ts`.

## Deployment

The site is served under `base: '/JBrowseMSA'` (`astro.config.mjs`), so every
absolute link in a page or a markdown doc starts with that prefix. The root
[README](../README.md#deployment) covers how a push to `main` builds and
publishes it.
