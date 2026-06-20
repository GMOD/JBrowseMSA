import { openLocation } from '@jbrowse/core/util/io'
import { describe, expect, test } from 'vitest'

import { fetchTextWithProgress, isAbortError, timeout } from './fetchUtils.ts'

import type { FetchStatus } from './fetchUtils.ts'

const loc = openLocation({
  uri: 'http://example.com/data.fa',
  locationType: 'UriLocation',
})

describe('fetchTextWithProgress', () => {
  test('returns the fetched text', async () => {
    const result = await fetchTextWithProgress(
      loc,
      () => {},
      async (_loc, opts) => {
        opts.statusCallback('Downloading file')
        opts.statusCallback('')
        return 'GREETINGS'
      },
    )
    expect(result).toBe('GREETINGS')
  })

  test('reports progress messages then clears status', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    await fetchTextWithProgress(
      loc,
      s => statuses.push(s),
      async (_loc, opts) => {
        opts.statusCallback('Downloading file')
        opts.statusCallback('Unzipping')
        opts.statusCallback('')
        return 'ok'
      },
    )
    expect(statuses.map(s => s?.msg)).toEqual([
      'Downloading file',
      'Unzipping',
      undefined,
      undefined,
    ])
    // status is always cleared once the fetch settles
    expect(statuses.at(-1)).toBeUndefined()
  })

  test('clears status even when the fetch throws', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    await expect(
      fetchTextWithProgress(
        loc,
        s => statuses.push(s),
        async (_loc, opts) => {
          opts.statusCallback('Downloading file')
          throw new Error('network down')
        },
      ),
    ).rejects.toThrow('network down')
    expect(statuses.at(-1)).toBeUndefined()
  })

  test('onCancel aborts the underlying request', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    const promise = fetchTextWithProgress(
      loc,
      s => statuses.push(s),
      (_loc, opts) =>
        new Promise<string>((resolve, reject) => {
          opts.statusCallback('Downloading file')
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )

    // the reported status exposes an onCancel that aborts the request
    const active = statuses.find(s => s?.onCancel)
    expect(active).toBeDefined()
    expect(active?.onCancel).toBeDefined()
    active!.onCancel!()

    await expect(promise).rejects.toSatisfy(isAbortError)
    // status cleared after cancellation
    expect(statuses.at(-1)).toBeUndefined()
  })
})

describe('isAbortError', () => {
  test('true for AbortError DOMException', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true)
  })
  test('false for ordinary errors', () => {
    expect(isAbortError(new Error('boom'))).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
  })
})

describe('timeout', () => {
  test('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(timeout(1000, controller.signal)).rejects.toSatisfy(
      isAbortError,
    )
  })

  test('rejects when the signal aborts mid-wait', async () => {
    const controller = new AbortController()
    const promise = timeout(10_000, controller.signal)
    controller.abort()
    await expect(promise).rejects.toSatisfy(isAbortError)
  })

  test('resolves after the delay when not aborted', async () => {
    await expect(timeout(1)).resolves.toBeUndefined()
  })
})
