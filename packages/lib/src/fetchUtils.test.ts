import { openLocation } from '@jbrowse/core/util/io'
import { describe, expect, test } from 'vitest'

import { fetchTextWithProgress, isAbortError } from './fetchUtils.ts'

import type { FetchStatus } from './fetchUtils.ts'

const loc = openLocation({
  uri: 'http://example.com/data.fa',
  locationType: 'UriLocation',
})

describe('fetchTextWithProgress', () => {
  test('reports progress messages then clears status', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    const result = await fetchTextWithProgress(loc, s => statuses.push(s), {
      fetcher: async (_loc, opts) => {
        opts.statusCallback('Downloading file')
        opts.statusCallback('')
        return 'GREETINGS'
      },
    })
    expect(result).toBe('GREETINGS')
    expect(statuses.map(s => s?.msg)).toEqual([
      'Downloading file',
      undefined,
      undefined,
    ])
  })

  test('reports the message from a determinate progress status', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    await fetchTextWithProgress(loc, s => statuses.push(s), {
      fetcher: async (_loc, opts) => {
        opts.statusCallback({
          message: 'Downloading file',
          current: 5,
          total: 10,
        })
        return 'GREETINGS'
      },
    })
    expect(statuses[0]?.msg).toBe('Downloading file')
  })

  test('clears status even when the fetch throws', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    await expect(
      fetchTextWithProgress(loc, s => statuses.push(s), {
        fetcher: async () => {
          throw new Error('network down')
        },
      }),
    ).rejects.toThrow('network down')
    expect(statuses.at(-1)).toBeUndefined()
  })

  test('onCancel aborts the underlying request', async () => {
    const statuses: (FetchStatus | undefined)[] = []
    const promise = fetchTextWithProgress(loc, s => statuses.push(s), {
      fetcher: (_loc, opts) =>
        new Promise<string>((_resolve, reject) => {
          opts.statusCallback('Downloading file')
          opts.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    })

    statuses.find(s => s?.onCancel)?.onCancel?.()

    await expect(promise).rejects.toSatisfy(isAbortError)
    expect(statuses.at(-1)).toBeUndefined()
  })
})

test('the caller can abort a request it no longer wants', async () => {
  const controller = new AbortController()
  const promise = fetchTextWithProgress(loc, () => {}, {
    controller,
    fetcher: (_loc, opts) =>
      new Promise<string>((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      }),
  })

  controller.abort()

  await expect(promise).rejects.toSatisfy(isAbortError)
})
