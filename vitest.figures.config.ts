import { defineConfig } from 'vitest/config'

// dedicated config so the figure generator (which writes files into docs/media)
// is not picked up by the normal `pnpm test` run
export default defineConfig({
  test: {
    include: ['packages/lib/scripts/generateFigures.tsx'],
    environment: 'jsdom',
  },
})
