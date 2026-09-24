import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

// A disk cache for the InterPro API, which serves
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

export function newestCachedRelease() {
  try {
    return fs
      .readdirSync(CACHE_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && SAFE_SEGMENT.test(e.name))
      .map(e => e.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0]
  } catch {
    return undefined
  }
}
