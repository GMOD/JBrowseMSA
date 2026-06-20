import { fetchAndMaybeUnzipText } from '@jbrowse/core/util'

export interface FetchStatus {
  msg: string
  url?: string
  onCancel?: () => void
}

type Filehandle = Parameters<typeof fetchAndMaybeUnzipText>[0]

type ProgressFetcher = (
  loc: Filehandle,
  opts: { signal: AbortSignal; statusCallback: (msg: string) => void },
) => Promise<string>

/**
 * Fetch text from a filehandle while reporting download/unzip progress through
 * setStatus, and wiring a Cancel handler that aborts the underlying request.
 * The status is always cleared once the fetch settles. The fetcher is injectable
 * for testing.
 */
export async function fetchTextWithProgress(
  loc: Filehandle,
  setStatus: (status?: FetchStatus) => void,
  fetcher: ProgressFetcher = fetchAndMaybeUnzipText,
) {
  const controller = new AbortController()
  try {
    return await fetcher(loc, {
      signal: controller.signal,
      statusCallback: msg => {
        setStatus(
          msg
            ? {
                msg,
                onCancel: () => {
                  controller.abort()
                },
              }
            : undefined,
        )
      },
    })
  } finally {
    setStatus(undefined)
  }
}

export async function myfetch(url: string, args?: RequestInit) {
  const response = await fetch(url, args)

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${url} ${await response.text()}`,
    )
  }

  return response
}

export async function textfetch(url: string, args?: RequestInit) {
  const response = await myfetch(url, args)
  return response.text()
}

export async function jsonfetch<T>(url: string, args?: RequestInit) {
  const response = await myfetch(url, args)
  return response.json() as T
}

export function timeout(time: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
    } else {
      const id = setTimeout(resolve, time)
      signal?.addEventListener('abort', () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }
  })
}

export function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === 'AbortError'
}
