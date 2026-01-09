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

const formatStartRegex = /^# STOCKHOLM 1.0/
const formatEndRegex = /^\/\/\s*$/
const gfRegex = /^#=GF\s+(\S+)\s+(.*?)\s*$/
const gcRegex = /^#=GC\s+(\S+)\s+(.*?)\s*$/
const gsRegex = /^#=GS\s+(\S+)\s+(\S+)\s+(.*?)\s*$/
const grRegex = /^#=GR\s+(\S+)\s+(\S+)\s+(.*?)\s*$/
const lineRegex = /^\s*(\S+)\s+(\S+)\s*$/
const nonwhiteRegex = /\S/

export function sniff(text: string): boolean {
  return formatStartRegex.test(text)
}

export function parseAll(
  text: string,
  opts?: { strict?: boolean; quiet?: boolean },
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
      if (!stock) {
        if (options.strict) {
          throw new Error('No format header: # STOCKHOLM 1.0')
        }
        stock = createStockholm()
      }
      const tag = match[1]!
      if (!stock.gf[tag]) {
        stock.gf[tag] = []
      }
      stock.gf[tag].push(match[2]!)
    } else if ((match = gcRegex.exec(line))) {
      if (!stock) {
        if (options.strict) {
          throw new Error('No format header: # STOCKHOLM 1.0')
        }
        stock = createStockholm()
      }
      const tag = match[1]!
      if (!stock.gc[tag]) {
        stock.gc[tag] = ''
      }
      stock.gc[tag] += match[2]!
    } else if ((match = gsRegex.exec(line))) {
      if (!stock) {
        if (options.strict) {
          throw new Error('No format header: # STOCKHOLM 1.0')
        }
        stock = createStockholm()
      }
      const seqname = match[1]!
      const tag = match[2]!
      const value = match[3]!
      if (!stock.gs[tag]) {
        stock.gs[tag] = {}
      }
      if (!stock.gs[tag][seqname]) {
        stock.gs[tag][seqname] = []
      }
      stock.gs[tag][seqname].push(value)
    } else if ((match = grRegex.exec(line))) {
      if (!stock) {
        if (options.strict) {
          throw new Error('No format header: # STOCKHOLM 1.0')
        }
        stock = createStockholm()
      }
      const seqname = match[1]!
      const tag = match[2]!
      const value = match[3]!
      if (!stock.gr[tag]) {
        stock.gr[tag] = {}
      }
      if (!stock.gr[tag][seqname]) {
        stock.gr[tag][seqname] = ''
      }
      stock.gr[tag][seqname] += value
    } else if ((match = lineRegex.exec(line))) {
      if (!stock) {
        if (options.strict) {
          throw new Error('No format header: # STOCKHOLM 1.0')
        }
        stock = createStockholm()
      }
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
  opts?: { strict?: boolean; quiet?: boolean },
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
