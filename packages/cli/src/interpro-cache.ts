import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// A disk cache and a backoff policy for the InterPro API, which serves
// precomputed matches one protein per request -- there is no batch endpoint
// (`?accession=a,b` is ignored and returns the full entry listing instead).
// The request count is therefore fixed at one per distinct accession, so the
// only way to be lighter on EBI is to not ask twice.
//
// Cache entries are keyed by InterPro release, so a new release misses cleanly
// rather than serving stale coordinates, and matchless proteins are cached too
// so they are not re-fetched every run.

const CACHE_DIR =
  process.env.REACT_MSAVIEW_CACHE ??
  path.join(
    process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
    'react-msaview-cli',
    'interpro',
  )

// Accessions and database names reach the filesystem as path segments, so
// anything outside this set is rejected rather than escaped -- a real UniProt
// accession or member-database name never contains one.
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
    // a missing or unreadable entry is a cache miss, never an error: the
    // fetch below is always able to produce the value again
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
    // an unwritable cache slows the next run down; it must not fail this one
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

// Seconds from a Retry-After header, when the server names a wait we should
// prefer over our own guess. Capped so a stray large value cannot hang a run.
function retryAfterMs(response: Response) {
  const header = response.headers.get('retry-after')
  const seconds = header ? Number(header) : Number.NaN
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, 60) * 1000
    : undefined
}

/**
 * GET with exponential backoff on the statuses that mean "ask again later".
 *
 * Without this a single blip failed the whole run, and the user's fix was to
 * re-run and re-request every accession that had already succeeded -- turning
 * one transient error into a second full pass over the API.
 */
export async function fetchWithRetry(
  url: string,
  { attempts = 4, baseDelayMs = 1000 } = {},
) {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await delay(baseDelayMs * 2 ** (attempt - 1))
    }
    try {
      const response = await fetch(url)
      if (!RETRYABLE.has(response.status)) {
        return response
      }
      lastError = new Error(`${response.status} ${response.statusText}`)
      const named = retryAfterMs(response)
      if (named) {
        await delay(named)
      }
    } catch (e) {
      // network-level failure (DNS, reset, offline); retry the same way
      lastError = e
    }
  }
  throw new Error(`${url} failed after ${attempts} attempts: ${lastError}`)
}
