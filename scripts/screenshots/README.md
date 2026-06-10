# App screenshots

Automated screenshots of the **demo app** (`packages/app`) for
[`docs/user_guide.md`](../../docs/user_guide.md), driven by a real browser
(`puppeteer-core` + the system Chrome — no bundled Chromium download).

```sh
pnpm screenshots            # build the app, capture every spec
node scripts/screenshots/generate.mjs --filter=colorscheme   # subset
node scripts/screenshots/generate.mjs --headed               # watch it run
```

Output lands in `docs/media/<name>.png`.

## How it works

The app reads a `?data=` URL param as a JSON model snapshot, so each spec can
deep-link a fully loaded alignment instead of clicking through the import form.
Specs that capture menus/dialogs run a few `click`/`waitFor` actions first.

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

Header menu buttons expose stable test ids (`file_menu`, `color_scheme_menu`,
`tree_settings_menu`, `msa_settings_menu`); menu items and dialog text are
reached with puppeteer's `::-p-text(...)` selector.

> For clean, scalable **viewer-only** figures (no app chrome) there is a
> separate, lighter headless SVG generator — `pnpm figures`, see
> `packages/lib/scripts/generateFigures.tsx`.
