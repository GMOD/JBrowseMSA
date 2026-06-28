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

// Wrap a standalone screenshot (a <p> containing only an <img>, or an <img>
// wrapped in a single <a> when the figure links to a live demo) together with
// the descriptive paragraph right after it into a <figure>, so screenshots read
// as documentation figures rather than looking like a live demo embedded in the
// page.
function wrapFigures() {
  return tree => {
    const visit = node => {
      if (!node.children) {
        return
      }
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        const only =
          child.type === 'element' &&
          child.tagName === 'p' &&
          child.children.length === 1 &&
          child.children[0]
        // the figure content is either a bare <img> or an <a><img></a>
        const img =
          only &&
          only.type === 'element' &&
          (only.tagName === 'img' ||
            (only.tagName === 'a' &&
              only.children.length === 1 &&
              only.children[0]?.tagName === 'img'))
            ? only
            : undefined
        if (img) {
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

// Give every h2/h3/h4 a stable slug id and a hover-reveal anchor link, so the
// long docs pages (user guide, genome browser) are deep-linkable section by
// section. Mirrors rehype-slug + rehype-autolink-headings without the deps.
function headingAnchors() {
  const slugify = text =>
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  const textOf = node =>
    node.type === 'text'
      ? node.value
      : (node.children ?? []).map(textOf).join('')
  return tree => {
    const seen = new Map()
    const visit = node => {
      if (node.type === 'element' && /^h[2-4]$/.test(node.tagName)) {
        const slug = slugify(textOf(node))
        const n = seen.get(slug) ?? 0
        seen.set(slug, n + 1)
        const id = n === 0 ? slug : `${slug}-${n}`
        node.properties = { ...node.properties, id }
        node.children.push({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-anchor'],
            'aria-hidden': 'true',
            tabindex: '-1',
          },
          children: [{ type: 'text', value: '#' }],
        })
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
    processor: unified({
      rehypePlugins: [rewriteMarkdownImages, wrapFigures, headingAnchors],
    }),
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
