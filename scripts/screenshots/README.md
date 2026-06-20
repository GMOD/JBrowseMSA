# App screenshots

Automated screenshots of the **demo app** (`packages/app`) for
[`docs/user_guide.md`](../../docs/user_guide.md), driven by a real browser
(`puppeteer-core` + the system Chrome — no bundled Chromium download).

```sh
pnpm screenshots                                  # build the app, capture every spec
node scripts/screenshots/generate.mjs --filter=colorscheme,domains   # subset (comma list)
node scripts/screenshots/generate.mjs --headed                       # watch it run
node scripts/screenshots/generate.mjs --check                        # flakiness check, no writes
```

Output lands in `docs/media/<name>.png`.

## How it works

The app reads a `?data=` URL param as a JSON model snapshot, so each spec can
deep-link a fully loaded alignment instead of clicking through the import form.
Specs that capture menus/dialogs run a few `click`/`waitFor` actions first.

Each spec is rendered in a fresh browser to a temp PNG, optimized with
`pngquant`, then compared against the committed image: **the committed PNG is
only rewritten when the new capture differs by more than the diff threshold**
(default 0.5%). Rendering is deterministic, so an unchanged spec re-renders
near-identical and is kept — a regen doesn't churn the whole `docs/media` dir.

## Flags

| Flag                 | Effect                                                         |
| -------------------- | -------------------------------------------------------------- |
| `--filter=a,b,c`     | Only specs whose name contains any token (substring match)     |
| `--exact`            | Make `--filter` tokens match the full spec name                |
| `--headed`           | Run a visible browser (forces concurrency 1)                   |
| `--force`            | Rewrite every PNG, bypassing the diff gate                     |
| `--check`            | Render each spec twice and flag drift as FLAKY; writes nothing |
| `--diff-threshold=N` | Fraction-of-pixels diff below which a re-render keeps the PNG  |
| `--concurrency=N`    | Browsers running at once (default 4, or 1 when `--headed`)     |

Image diffing/optimization (`scripts/screenshots/image-pipeline.mjs`) shells out
to the system ImageMagick (`compare`/`identify`) and `pngquant`; each is
best-effort and degrades gracefully if the tool is missing.

## Adding a spec

Edit [`specs.mjs`](specs.mjs). A spec is:

```js
{
  name: 'my-shot',                 // → docs/media/my-shot.png
  url: data({ colorSchemeName }),  // '' for the import form, or data({...})
  actions: [                       // optional, for menus/dialogs
    { click: '[data-testid="file_menu"]' },
    { click: '::-p-text(More settings)' },
    { waitFor: '::-p-text(Tree options)' },
  ],
  clip: 'viewer',                  // 'viewer' = the [data-testid=msaview] box,
}                                  // anything else = full viewport
```

The `data({...})` helper spreads its argument into the `MsaView` snapshot, so
any model property is deep-linkable — e.g. `data({ collapsed: ['node-0-…'] })`
for a collapsed subtree (node ids are deterministic, see `generateNodeIds` in
`packages/msa-parsers/src/util.ts`).

Header menu buttons expose stable test ids (`file_menu`, `color_scheme_menu`,
`tree_settings_menu`, `msa_settings_menu`); menu items and dialog text are
reached with puppeteer's `::-p-text(...)` selector.

> For clean, scalable **viewer-only** figures (no app chrome) there is a
> separate, lighter headless SVG generator — `pnpm figures`, see
> `packages/lib/scripts/generateFigures.tsx`.
