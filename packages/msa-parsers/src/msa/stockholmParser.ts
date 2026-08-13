/**
 * Stockholm format parser
 * Based on stockholm-js by Ian Holmes
 * Rewritten in TypeScript
 */

export interface StockholmData {
  gf: Record<string, string[]>
  gc: Record<string, string>
  gs: Record<string, Record<string, string[]>>
  gr: Record<string, Record<string, string>>
  seqname: string[]
  seqdata: Record<string, string>
}

function createStockholm(): StockholmData {
  return {
    gf: {},
    gc: {},
    gs: {},
    gr: {},
    seqname: [],
    seqdata: {},
  }
}

// records before a "# STOCKHOLM 1.0" header are an error in strict mode,
// otherwise they implicitly start a new alignment
function ensureStock(
  stock: StockholmData | null,
  strict: boolean,
): StockholmData {
  if (stock) {
    return stock
  }
  if (strict) {
    throw new Error('No format header: # STOCKHOLM 1.0')
  }
  return createStockholm()
}

const formatStartRegex = /^# STOCKHOLM 1.0/
const formatEndRegex = /^\/\/\s*$/
const gfRegex = /^#=GF\s+(\S+)\s+(.*?)\s*$/
const gcRegex = /^#=GC\s+(\S+)\s+(.*?)\s*$/
const gsRegex = /^#=GS\s+(\S+)\s+(\S+)\s+(.*?)\s*$/
const grRegex = /^#=GR\s+(\S+)\s+(\S+)\s+(.*?)\s*$/
// a sequence line is "<name> <residues>". The leading [^#\s] guards against a
// two-word comment ("# note") being taken as a sequence named '#'; every
// meaningful '#' line is a #=GF/#=GC/#=GS/#=GR record already matched above.
const lineRegex = /^\s*([^#\s]\S*)\s+(\S+)\s*$/
const nonwhiteRegex = /\S/

export function sniff(text: string): boolean {
  return formatStartRegex.test(text)
}

export function parseAll(
  text: string,
  opts?: { strict?: boolean },
): StockholmData[] {
  const options = opts ?? {}
  const db: StockholmData[] = []
  let stock: StockholmData | null = null

  const lines = text.split('\n')
  for (const line of lines) {
    let match: RegExpExecArray | null

    if (formatStartRegex.test(line)) {
      stock = createStockholm()
    } else if (formatEndRegex.test(line)) {
      if (stock) {
        db.push(stock)
      }
      stock = null
    } else if ((match = gfRegex.exec(line))) {
      stock = ensureStock(stock, !!options.strict)
      ;(stock.gf[match[1]!] ??= []).push(match[2]!)
    } else if ((match = gcRegex.exec(line))) {
      stock = ensureStock(stock, !!options.strict)
      stock.gc[match[1]!] = (stock.gc[match[1]!] ?? '') + match[2]!
    } else if ((match = gsRegex.exec(line))) {
      stock = ensureStock(stock, !!options.strict)
      const byName = (stock.gs[match[2]!] ??= {})
      ;(byName[match[1]!] ??= []).push(match[3]!)
    } else if ((match = grRegex.exec(line))) {
      stock = ensureStock(stock, !!options.strict)
      const byName = (stock.gr[match[2]!] ??= {})
      byName[match[1]!] = (byName[match[1]!] ?? '') + match[3]!
    } else if ((match = lineRegex.exec(line))) {
      stock = ensureStock(stock, !!options.strict)
      const seqname = match[1]!
      const seqdata = match[2]!
      if (!stock.seqdata[seqname]) {
        stock.seqdata[seqname] = ''
        stock.seqname.push(seqname)
      }
      stock.seqdata[seqname] += seqdata
    } else if (nonwhiteRegex.test(line)) {
      if (options.strict) {
        throw new Error('Malformed line')
      }
    }
  }

  if (stock) {
    db.push(stock)
  }

  return db
}

export function parse(
  text: string,
  opts?: { strict?: boolean },
): StockholmData {
  const db = parseAll(text, opts)
  if (db.length === 0) {
    throw new Error('No alignments found')
  }
  if (db.length > 1) {
    throw new Error('More than one alignment found')
  }
  return db[0]!
}
