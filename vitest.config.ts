import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // This suite deliberately works at the sizes the viewer claims to support:
    // a 200k-tip tree, a 100k-deep caterpillar, whole-alignment tallies. Several
    // of those sit within a couple of seconds of the 5s default on a fast
    // machine, so on CI's 2-core runners they were failing on load rather than
    // on anything being wrong.
    testTimeout: 30_000,
  },
})
