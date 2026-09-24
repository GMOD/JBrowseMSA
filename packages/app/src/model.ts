import {
  addDisposer,
  getSnapshot,
  isAlive,
  types,
} from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { MSAModelF, expandSpec } from 'react-msaview'

import type { Instance, SnapshotIn } from '@jbrowse/mobx-state-tree'
import type { MsaSpec } from 'react-msaview'

// gmod.org answers 414 once the request line passes 8,192 bytes
export const maxLinkLength = 8000

const gzipPrefix = 'z.'

async function pipe(bytes: Uint8Array, transform: GenericTransformStream) {
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(transform)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function toBase64url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64url(text: string) {
  return Uint8Array.from(
    atob(text.replaceAll('-', '+').replaceAll('_', '/')),
    c => c.charCodeAt(0),
  )
}

export async function encodeParam(snapshot: unknown) {
  const json = new TextEncoder().encode(JSON.stringify(snapshot))
  return (
    gzipPrefix + toBase64url(await pipe(json, new CompressionStream('gzip')))
  )
}

export async function decodeParam(param: string) {
  return param.startsWith(gzipPrefix)
    ? new TextDecoder().decode(
        await pipe(
          fromBase64url(param.slice(gzipPrefix.length)),
          new DecompressionStream('gzip'),
        ),
      )
    : param
}

const AppBase = types
  .model({
    msaview: MSAModelF(),
  })
  .volatile(() => ({
    linkProblem: undefined as string | undefined,
  }))
  .actions(self => ({
    setLinkProblem(problem?: string) {
      self.linkProblem = problem
    },
  }))

export type Link =
  | { url: string; problem?: undefined }
  | { url?: undefined; problem: string }

function size(bytes: number) {
  return `${Math.round(bytes / 1000)} kB`
}

// Reads the model before its first await, so an autorun calling it tracks the
// snapshot
export async function shareLink(
  app: Instance<typeof AppBase>,
  href: string,
): Promise<Link> {
  const { unshareableData } = app.msaview
  const snapshot = getSnapshot(app)
  if (unshareableData.length > 0) {
    const what = unshareableData
      .map(({ what, bytes }) => `${what} (${size(bytes)})`)
      .join(' and the ')
    return {
      problem: `The ${what} came from this computer and is too large for a link. Open it by URL to share the view.`,
    }
  }
  const url = new URL(href)
  url.searchParams.set('data', await encodeParam(snapshot))
  return url.href.length > maxLinkLength
    ? {
        problem: `A link to this view runs to ${url.href.length.toLocaleString('en-US')} characters, and gmod.org refuses one over ${maxLinkLength.toLocaleString('en-US')}. Open the files by URL to share the view.`,
      }
    : { url: url.href }
}

const App = AppBase.actions(self => ({
  afterCreate() {
    let latest = 0
    addDisposer(
      self,
      autorun(
        () => {
          // A link that failed to open stays in the address bar, so the
          // reader can see and fix what they pasted
          if (self.msaview.error) {
            return
          }
          const request = ++latest
          void shareLink(self, window.location.href).then(link => {
            if (request !== latest || !isAlive(self)) {
              return
            }
            self.setLinkProblem(link.problem)
            // A view too large for the link loses the param, so the address
            // bar never holds a URL that opens an empty viewer or a 414
            const url = new URL(link.url ?? window.location.href)
            if (link.problem !== undefined) {
              url.searchParams.delete('data')
            }
            window.history.replaceState(null, '', url.href)
          })
        },
        { delay: 1000 },
      ),
    )
  },
}))

const empty = { msaview: { type: 'MsaView' as const } }

function toSnapshot(param: string): SnapshotIn<typeof App> {
  const parsed: unknown = JSON.parse(param)
  if (parsed && typeof parsed === 'object') {
    const view =
      'msaview' in parsed
        ? parsed.msaview
        : 'type' in parsed && parsed.type === 'MsaView'
          ? parsed
          : undefined
    if (view && typeof view === 'object') {
      return { msaview: expandSpec(view as MsaSpec) } as SnapshotIn<typeof App>
    }
  }
  throw new Error(
    'expected {"msaview": {"type": "MsaView", ...}} or a bare {"type": "MsaView", ...} snapshot',
  )
}

// `?data=` takes the app snapshot, `{"msaview": {...}}`, or the MsaView
// snapshot on its own, which is what docs/layers.md and every other embedding
// write, either as JSON or gzipped by `encodeParam`. A value that is none of
// these opens on an error, since the empty import form would read as the link
// having no data in it.
export async function createApp(param: string | null) {
  if (!param) {
    return App.create(empty)
  }
  try {
    return App.create(toSnapshot(await decodeParam(param)))
  } catch (e) {
    const app = App.create(empty)
    app.msaview.setError(
      new Error(
        `Could not open the view in this link's ?data= parameter: ${e instanceof Error ? e.message : String(e)}`,
      ),
    )
    return app
  }
}

export default App
export type AppModel = Instance<typeof App>
