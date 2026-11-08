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

// The snapshot rides in the fragment, which the browser never sends, so
// gmod.org's 8,192-byte request line does not bound a link. Chrome and Firefox
// both opened a 1,000,000-character link and both refused 2,500,000; Safari is
// untested.
export const maxLinkLength = 1_000_000

const gzipPrefix = 'z.'

const dataHash = /^#data=(?={|%7b)/i

/**
 * The snapshot a link carries: `#data=`, or `?data=` for a link written before
 * the snapshot moved into the fragment. JSON in `#data=` runs to the end of the
 * link, so a hand-written one can leave a `&`, `+` or lone `%` in a label as
 * typed.
 */
export function linkParam({ hash, search }: { hash: string; search: string }) {
  const json = dataHash.exec(hash)
  return json
    ? decodeURIComponent(
        hash.slice(json[0].length).replaceAll(/%(?![\da-f]{2})/gi, '%25'),
      )
    : (new URLSearchParams(hash.slice(1)).get('data') ??
        new URLSearchParams(search).get('data'))
}

function withParam(href: string, param?: string) {
  const url = new URL(href)
  url.searchParams.delete('data')
  url.hash = param ? new URLSearchParams({ data: param }).toString() : ''
  return url.href
}

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  transform: GenericTransformStream,
) {
  const stream = new Response(bytes).body!.pipeThrough(transform)
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
    // a pasted or local document stays in the link as long as the link does
    msaview: MSAModelF({ maxInlineSnapshotBytes: maxLinkLength }),
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
      .map(item => `${item.what} (${size(item.bytes)})`)
      .join(' and the ')
    return {
      problem: `The ${what} came from this computer and is too large for a link. Open it by URL to share the view.`,
    }
  }
  const url = withParam(href, await encodeParam(snapshot))
  return url.length > maxLinkLength
    ? {
        problem: `A link to this view runs to ${url.length.toLocaleString('en-US')} characters, over the ${maxLinkLength.toLocaleString('en-US')} a link can hold. Open the files by URL to share the view.`,
      }
    : { url }
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
            // bar never holds a URL that opens an empty viewer
            window.history.replaceState(
              null,
              '',
              link.url ?? withParam(window.location.href),
            )
          })
        },
        { delay: 1000 },
      ),
    )
  },
}))

const empty = { msaview: { type: 'MsaView' as const } }

function holds(value: object, keys: string[], ok: (v: unknown) => boolean) {
  return keys.every(key => !(key in value) || ok(Reflect.get(value, key)))
}

function isMsaSpec(value: object): value is MsaSpec {
  return (
    holds(value, ['query', 'msa', 'tree'], v => typeof v === 'string') &&
    holds(value, ['highlights', 'columnTracks'], v => Array.isArray(v)) &&
    holds(
      value,
      ['region'],
      v => typeof v === 'string' || (typeof v === 'object' && v !== null),
    )
  )
}

function toSnapshot(param: string): SnapshotIn<typeof App> {
  const parsed: unknown = JSON.parse(param)
  if (parsed && typeof parsed === 'object') {
    const view =
      'msaview' in parsed
        ? parsed.msaview
        : 'type' in parsed && parsed.type === 'MsaView'
          ? parsed
          : undefined
    if (view && typeof view === 'object' && isMsaSpec(view)) {
      const snapshot = { msaview: expandSpec(view) }
      if (App.is(snapshot)) {
        return snapshot
      }
    }
  }
  throw new Error(
    'expected {"msaview": {"type": "MsaView", ...}} or a bare {"type": "MsaView", ...} snapshot',
  )
}

// A link's `data=` takes the app snapshot, `{"msaview": {...}}`, or the MsaView
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
        `Could not open the view in this link's data= parameter: ${e instanceof Error ? e.message : String(e)}`,
      ),
    )
    return app
  }
}

export default App
export type AppModel = Instance<typeof App>
