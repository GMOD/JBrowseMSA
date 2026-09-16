import { afterEach, expect, test, vi } from 'vitest'

import { fetchWithRetry } from './fetchWithRetry.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a retryable status is retried and the eventual success returned', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  const res = await fetchWithRetry('https://example.org/x', { baseDelayMs: 0 })
  expect(res.status).toBe(200)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('a 404 returns immediately rather than burning retries on it', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
  vi.stubGlobal('fetch', fetchMock)

  expect((await fetchWithRetry('https://example.org/x')).status).toBe(404)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('a 204 returns immediately: no matches is an answer, not a failure', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)

  expect((await fetchWithRetry('https://example.org/x')).status).toBe(204)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test('giving up names the url and the attempt count', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('', { status: 503 })),
  )
  await expect(
    fetchWithRetry('https://example.org/x', { attempts: 2, baseDelayMs: 0 }),
  ).rejects.toThrow(/https:\/\/example\.org\/x failed after 2 attempts/)
})

test('a network-level throw is retried like a retryable status', async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('ECONNRESET'))
    .mockResolvedValueOnce(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  expect(
    (await fetchWithRetry('https://example.org/x', { baseDelayMs: 0 })).status,
  ).toBe(200)
  expect(fetchMock).toHaveBeenCalledTimes(2)
})
