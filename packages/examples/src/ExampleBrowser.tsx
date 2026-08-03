import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import { categoryOrder, examples, slugOf } from './examples'

import type { ReactNode } from 'react'
import type { HighlighterCore } from 'shiki/core'

// One highlighter for the whole app, loaded lazily. The fine-grained Shiki core
// (rather than the `shiki` bundle) keeps only the tsx grammar + one theme in the
// output instead of every bundled language.
let highlighterPromise: Promise<HighlighterCore> | undefined
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([
      import('shiki/core'),
      import('shiki/engine/oniguruma'),
      import('shiki/wasm'),
      import('shiki/langs/tsx.mjs'),
      import('shiki/themes/github-light.mjs'),
    ]).then(([core, oniguruma, wasm, tsx, githubLight]) =>
      core.createHighlighterCore({
        themes: [githubLight.default],
        langs: [tsx.default],
        engine: oniguruma.createOnigurumaEngine(wasm),
      }),
    )
  }
  return highlighterPromise
}

// Shows the example source, Shiki-highlighted once the highlighter resolves and
// falling back to plain monospace until then (or if highlighting fails).
function SourceView({ source }: { source: string }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let cancelled = false
    getHighlighter().then(
      highlighter => {
        if (!cancelled) {
          setHtml(
            highlighter.codeToHtml(source, {
              lang: 'tsx',
              theme: 'github-light',
            }),
          )
        }
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [source])

  return html ? (
    <Box
      sx={{
        overflowX: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        '& pre': { m: 0, p: 2, fontSize: 13, fontFamily: 'monospace' },
      }}
      // Shiki output for our own bundled example source — no user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <Paper
      variant="outlined"
      sx={{ p: 2, overflowX: 'auto', backgroundColor: 'action.hover' }}
    >
      <Box
        component="pre"
        sx={{ m: 0, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre' }}
      >
        {source}
      </Box>
    </Paper>
  )
}

// Keeps the selected example in the URL hash so links deep-link to it, and
// stays in sync when the hash changes elsewhere (back/forward, manual edits,
// another link on the page).
function useHashSlug() {
  const readHash = () => {
    const hash =
      typeof window === 'undefined'
        ? ''
        : decodeURIComponent(window.location.hash.replace(/^#/, ''))
    return examples.some(e => slugOf(e.name) === hash) ? hash : ''
  }
  const [slug, setSlug] = useState(
    () => readHash() || slugOf(examples[0]!.name),
  )

  useEffect(() => {
    const onHashChange = () => {
      const next = readHash()
      if (next) {
        setSlug(next)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  const select = (name: string) => {
    const next = slugOf(name)
    setSlug(next)
    window.history.replaceState(null, '', `#${next}`)
  }
  return [slug, select] as const
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true)
            setTimeout(() => {
              setCopied(false)
            }, 1500)
          },
          () => {},
        )
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}

export default function ExampleBrowser({
  sidebarHeader,
  sidebarFooter,
  height,
}: {
  sidebarHeader?: ReactNode
  sidebarFooter?: ReactNode
  height: string
}) {
  const [slug, select] = useHashSlug()
  const example = examples.find(e => slugOf(e.name) === slug) ?? examples[0]!
  const { Component } = example
  return (
    <Box sx={{ display: 'flex', height }}>
      <Box
        component="nav"
        sx={{
          width: 260,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          overflowY: 'auto',
        }}
      >
        {sidebarHeader}
        {categoryOrder.map(category => (
          <List
            key={category}
            dense
            subheader={<ListSubheader disableSticky>{category}</ListSubheader>}
          >
            {examples
              .filter(e => e.category === category)
              .map(e => (
                <ListItemButton
                  key={e.name}
                  selected={slugOf(e.name) === slug}
                  onClick={() => {
                    select(e.name)
                  }}
                >
                  <ListItemText primary={e.name} />
                </ListItemButton>
              ))}
          </List>
        ))}
        {sidebarFooter}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {example.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {example.description}
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
          <Component />
        </Paper>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography variant="subtitle2">Source</Typography>
          <CopyButton text={example.source} />
        </Box>
        <SourceView source={example.source} />
      </Box>
    </Box>
  )
}
