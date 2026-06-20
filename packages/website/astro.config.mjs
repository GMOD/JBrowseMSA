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

// Wrap a standalone screenshot (a <p> containing only an <img>) together
// with the descriptive paragraph right after it into a <figure>, so
// screenshots read as documentation figures rather than looking like a live
// demo embedded in the page.
function wrapFigures() {
  return tree => {
    const visit = node => {
      if (!node.children) {
        return
      }
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        const img =
          child.type === 'element' &&
          child.tagName === 'p' &&
          child.children.length === 1 &&
          child.children[0]
        if (img && img.type === 'element' && img.tagName === 'img') {
          // skip whitespace-only text nodes that remark-rehype inserts
          // between block elements to mirror blank lines in the source
          let j = i + 1
          while (
            node.children[j]?.type === 'text' &&
            /^\s*$/.test(node.children[j].value)
          ) {
            j++
          }
          const next = node.children[j]
          if (next?.type === 'element' && next.tagName === 'p') {
            node.children.splice(i, j - i + 1, {
              type: 'element',
              tagName: 'figure',
              properties: {},
              children: [
                img,
                {
                  type: 'element',
                  tagName: 'figcaption',
                  properties: {},
                  children: next.children,
                },
              ],
            })
          }
        }
      }
      for (const child of node.children) {
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
    rehypePlugins: [rewriteMarkdownImages, wrapFigures],
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
