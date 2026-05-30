# react-msaview examples

A lightweight Vite site demonstrating different ways to use `react-msaview`.
Each example renders a live viewer alongside its own source code.

Deployed at https://jbrowse.org/storybook/msa/

## Develop

```sh
pnpm --filter examples dev
```

## Build

```sh
pnpm --filter examples build
```

Outputs a static site to `dist/` (relative `base`, so it works under the
`/storybook/msa/` subpath).

## Deploy

CI deploys automatically on pushes to `main` (see `.github/workflows/push.yml`).
To deploy manually:

```sh
pnpm --filter examples build
aws s3 sync --delete packages/examples/dist s3://jbrowse.org/storybook/msa
aws cloudfront create-invalidation --distribution-id E13LGELJOT4GQO --paths "/storybook/msa/*"
```

## Adding an example

Add a `src/examples/MyExample.tsx` that default-exports a component, then
register it in `src/examples/index.ts` (the `?raw` import shows its source in
the UI).
