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
  { attempts = 4, baseDelayMs = 1000 } = {},
) {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    // one wait per failed attempt: Retry-After when present, else exponential
    let wait = baseDelayMs * 2 ** attempt
    try {
      const response = await fetch(url)
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
  throw new Error(`${url} failed after ${attempts} attempts: ${lastError}`)
}
