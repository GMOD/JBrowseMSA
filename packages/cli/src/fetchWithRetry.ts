const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry-After in ms, capped at 60s so a large value cannot hang a run
function retryAfterMs(response: Response) {
  const header = response.headers.get('retry-after')
  const seconds = header ? Number(header) : Number.NaN
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, 60) * 1000
    : undefined
}

/**
 * fetch with exponential backoff on the statuses that mean "ask again later"
 */
export async function fetchWithRetry(
  url: string,
  {
    attempts = 4,
    baseDelayMs = 1000,
    headers,
  }: {
    attempts?: number
    baseDelayMs?: number
    headers?: Record<string, string>
  } = {},
) {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    // one wait per failed attempt: Retry-After when present, else exponential
    let wait = baseDelayMs * 2 ** attempt
    try {
      const response = await fetch(url, headers ? { headers } : undefined)
      if (!RETRYABLE.has(response.status)) {
        return response
      }
      lastError = new Error(`${response.status} ${response.statusText}`)
      wait = retryAfterMs(response) ?? wait
    } catch (e) {
      // network-level failure (DNS, reset, offline); retry the same way
      lastError = e
    }
    if (attempt < attempts - 1) {
      await delay(wait)
    }
  }
  throw new Error(
    `${url} failed after ${attempts} attempts: ${describe(lastError)}`,
  )
}

/**
 * The JSON body of `url`, fetched with retries. A 404 throws `notFound`, which
 * names what is missing in the caller's terms.
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  notFound: string,
  headers?: Record<string, string>,
) {
  const res = await fetchWithRetry(url, { headers })
  if (res.status === 404) {
    throw new Error(notFound)
  } else if (!res.ok) {
    throw new Error(`${url}: HTTP ${res.status} ${res.statusText}`)
  }
  const body: Promise<T> = res.json()
  return body
}

// undici throws `TypeError: fetch failed` and keeps the reason, such as
// ENOTFOUND or ECONNREFUSED, on `cause.code`
function describe(error: unknown) {
  const code = (error as { cause?: { code?: unknown } } | undefined)?.cause
    ?.code
  return typeof code === 'string' ? `${error} (${code})` : String(error)
}
