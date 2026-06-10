import { unified } from '@astrojs/markdown-remark'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

const BASE = '/JBrowseMSA'

// Rewrite every markdown <img src> to the site's /media/ folder (populated by
// scripts/sync-media.mjs from docs/media), so the existing docs render here
// regardless of the relative path they were authored with.
function rewriteMarkdownImages() {
  return tree => {
    const visit = node => {
      if (
        node.type === 'element' &&
        node.tagName === 'img' &&
        node.properties?.src
      ) {
        const src = String(node.properties.src)
        if (!src.startsWith('http')) {
          node.properties.src = `${BASE}/media/${src.split('/').pop()}`
        }
      }
      for (const child of node.children ?? []) {
        visit(child)
      }
    }
    visit(tree)
  }
}

export default defineConfig({
  site: 'https://gmod.org',
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [react()],
  markdown: {
    processor: unified({ rehypePlugins: [rewriteMarkdownImages] }),
  },
  vite: {
    server: {
      fs: {
        // allow importing the repo's existing markdown + example data
        allow: ['../..'],
      },
    },
  },
})
