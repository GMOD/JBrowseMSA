import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// A disk cache and a backoff policy for the InterPro API, which serves
// precomputed matches one protein per request; `?accession=a,b` is ignored and
// returns the full entry listing.
//
// Cache entries are keyed by InterPro release, and proteins with no matches are
// cached too.

const CACHE_DIR =
  process.env.REACT_MSAVIEW_CACHE ??
  path.join(
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
    'react-msaview-cli',
    'interpro',
  )

// Accessions and database names become path segments. Real UniProt accessions
// and member-database names stay within this set.
const SAFE_SEGMENT = /^[A-Za-z0-9_.-]+$/

function entryPath(release: string, database: string, accession: string) {
  for (const segment of [release, database, accession]) {
    if (!SAFE_SEGMENT.test(segment)) {
      throw new Error(`refusing to build a cache path from "${segment}"`)
    }
  }
  return path.join(CACHE_DIR, release, database, `${accession}.json`)
}

export function readCached<T>(
  release: string,
  database: string,
  accession: string,
): T | undefined {
  try {
    return JSON.parse(
      fs.readFileSync(entryPath(release, database, accession), 'utf8'),
    ) as T
  } catch {
    // a missing or unreadable entry is a cache miss
    return undefined
  }
}

export function writeCached(
  release: string,
  database: string,
  accession: string,
  value: unknown,
) {
  try {
    const file = entryPath(release, database, accession)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(value), 'utf8')
  } catch (e) {
    // an unwritable cache must not fail the run
    console.warn(`  (could not cache ${accession}: ${e})`)
  }
}

export function cacheLocation() {
  return CACHE_DIR
}

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
 * GET with exponential backoff on the statuses that mean "ask again later".
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
