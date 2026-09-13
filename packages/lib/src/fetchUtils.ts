import { fetchAndMaybeUnzipText } from '@jbrowse/core/util'

import type { RpcStatus } from '@jbrowse/core/util'

/**
 * Extract the human-readable text from a status value, which core reports
 * either as a bare string or as a `{message, current, total}` progress object.
 *
 * Inlined rather than imported from `@jbrowse/core/util` on purpose:
 * `statusMessageText` is a recent core export, and in the UMD plugin build
 * `@jbrowse/core/util` is an external resolved against whatever core the host
 * jbrowse-web ships. Against an older host this import lands as `undefined` and
 * every download tick throws `statusMessageText is not a function`. Keeping the
 * one-liner local makes the viewer work on old and new hosts alike.
 */
function statusMessageText(status: RpcStatus | undefined) {
  return typeof status === 'string' ? status : status?.message
}

export interface FetchStatus {
  msg: string
  onCancel?: () => void
}

type Filehandle = Parameters<typeof fetchAndMaybeUnzipText>[0]

type ProgressFetcher = (
  loc: Filehandle,
  opts: { signal: AbortSignal; statusCallback: (status: RpcStatus) => void },
) => Promise<string>

/**
 * Fetch text from a filehandle while reporting download/unzip progress through
 * setStatus, and wiring a Cancel handler that aborts the underlying request.
 * The status is always cleared once the fetch settles. The fetcher is injectable
 * for testing, and so is the AbortController: a caller that can supersede its
 * own request -- the model's loaders, when the filehandle changes under them --
 * holds one and aborts the download it no longer wants.
 */
export async function fetchTextWithProgress(
  loc: Filehandle,
  setStatus: (status?: FetchStatus) => void,
  {
    fetcher = fetchAndMaybeUnzipText,
    controller = new AbortController(),
  }: { fetcher?: ProgressFetcher; controller?: AbortController } = {},
) {
  try {
    return await fetcher(loc, {
      signal: controller.signal,
      statusCallback: status => {
        const msg = statusMessageText(status)
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

export function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === 'AbortError'
}
