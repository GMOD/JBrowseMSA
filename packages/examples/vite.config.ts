import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // relative base so the build works under https://jbrowse.org/storybook/msa/
  base: './',
  build: {
    sourcemap: true,
  },
})
