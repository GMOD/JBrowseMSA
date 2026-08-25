// Reindex a UCSC multiz exon-amino-acid alignment into ONE bgzip file plus a
// tiny name index, so the Gene explorer (and the JBrowse MsaView it launches)
// can pull any one gene's whole alignment with a single random read — keyed by
// GENE SYMBOL, not genomic coordinate. No per-gene files, no 91 MB faidx.
//
// Input: a UCSC `*.exonAA.fa.gz` (streamed — never fully in memory). FASTA, one
// record per (transcript, species, exon). Header:
//   >{transcript}_{db}_{exonNum}_{exonCount} {aaLen} {..} {..} {chr:start-end}{strand}
// A transcript's records for one exon are consecutive, the reference assembly
// first; exon groups of isoforms that share exons can interleave (refGene sets
// do this), so a transcript stays open until its last run of records has
// passed, which a first pass over the headers counts. {db}
// can itself contain underscores (`C_sp38_MB_2015` in the ce11 135-way), so
// the parser anchors on the reference db and the open transcript rather than
// counting underscores.
//
// The ASSEMBLIES table below says, per UCSC assembly, which exonAA set to read,
// which xref table turns its transcript ids into gene symbols, which species
// tree to ship, and which GenArk assembly the website shows the gene on. Human
// is the original and its outputs are byte-identical to what this script wrote
// before it learned other assemblies.
//
// Output (hosted on s3://jbrowse.org/demos/msaview/<name>/):
//   <db>.<set>.multiz<N>way.aa.fa.gz       bgzip of concatenated per-transcript
//     FASTA blocks. One block = `>hg38\nSEQ\n>panTro4\nSEQ\n...` (reference
//     first; UCSC db names = alignment rows = species-tree leaves; a species
//     missing an exon is gap-filled so columns stay aligned).
//   <db>.<set>.multiz<N>way.aa.fa.gz.gzi   the `bgzip -i` index.
//   <db>.<set>.multiz<N>way.aa.fa.gz.idx   TSV `SYMBOL <TAB> offset <TAB>
//     length` — uncompressed byte offset + length of each block, keyed by gene
//     symbol. The `.gzi`/`.idx` are found by appending to the `.fa.gz` uri.
//     Fetched once by the browser (~1 MB), then random-read by name.
//   <db>.<set>.multiz<N>way.aa.fa.gz.cds   TSV `SYMBOL <TAB> transcript <TAB>
//     refName <TAB> strand <TAB> start:end:phase,...` — the reference row's CDS
//     model (0-based interbase, genomic-ascending). refName is the sequence name
//     of the assembly the website displays: UCSC's `chr17` for hg38, the GenArk
//     2bit's RefSeq accession (`NC_000077.7`) for every assembly with a `genArk`
//     entry, mapped through the hub's chromAlias.txt.
//   <db>.multiz<N>way.nh   the species tree (leaf names = alignment row names).
//
// Usage:
//   node scripts/gene-explorer/build-data.mjs [--assembly=hg38] [exonAA.fa.gz] [outDir]
// Defaults: downloads the exonAA from hgdownload into outDir (it is read twice);
// writes to ./out. Requires bgzip (htslib) on PATH.
//
// To test on a small slice without the full download, pass a local gz holding a
// handful of transcripts (see scripts/gene-explorer/README.md).

import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import readline from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { createGunzip } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const UCSC = 'https://hgdownload.soe.ucsc.edu/goldenPath'
const GENARK = 'https://hgdownload.soe.ucsc.edu/hubs'

// `set` names the gene set the exonAA was built from; `xref` names the UCSC
// table that maps its transcript ids to symbols. knownCanonical is one
// transcript per gene already (`canonical`, first one wins); the other sets
// carry every isoform, so the build keeps the longest coding one per symbol.
// `genArk` is the assembly the website displays the gene on, whose sequence
// names differ from UCSC's; absent for hg38, which keeps UCSC names.
const ASSEMBLIES = {
  hg38: {
    db: 'hg38',
    way: 100,
    set: 'knownCanonical',
    canonical: true,
    exonAA: 'multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz',
    xref: 'kgXref',
    tree: 'multiz100way/hg38.100way.nh',
  },
  mm39: {
    db: 'mm39',
    way: 35,
    set: 'knownCanonical',
    canonical: true,
    exonAA: 'multiz35way/alignments/knownCanonical.exonAA.fa.gz',
    xref: 'kgXref',
    tree: 'multiz35way/mm39.35way.nh',
    genArk: 'GCF_000001635.27',
  },
  dm6: {
    db: 'dm6',
    way: 27,
    set: 'refGene',
    exonAA: 'multiz27way/alignments/refGene.exonAA.fa.gz',
    xref: 'refGene',
    tree: 'multiz27way/dm6.27way.nh',
    genArk: 'GCF_000001215.4',
  },
  'dm6-124way': {
    db: 'dm6',
    way: 124,
    set: 'ncbiRefSeq',
    exonAA: 'multiz124way/alignments/ncbiRefSeq.exonAA.fa.gz',
    xref: 'ncbiRefSeq',
    tree: 'multiz124way/dm6.124way.sequenceNames.nh',
    genArk: 'GCF_000001215.4',
  },
  ce11: {
    db: 'ce11',
    way: 26,
    set: 'refGene',
    exonAA: 'multiz26way/alignments/refGene.exonAA.fa.gz',
    xref: 'refGene',
    tree: 'multiz26way/ce11.26way.nh',
    genArk: 'GCF_000002985.6',
  },
  'ce11-135way': {
    db: 'ce11',
    way: 135,
    set: 'ensGene',
    exonAA: 'multiz135way/alignments/ensGene.exonAA.fa.gz',
    xref: 'ensemblToGeneName',
    tree: 'multiz135way/ce11.135way.nh',
    genArk: 'GCF_000002985.6',
  },
}

const args = process.argv.slice(2)
const assemblyName =
  args.find(a => a.startsWith('--assembly='))?.slice('--assembly='.length) ??
  'hg38'
const assembly = ASSEMBLIES[assemblyName]
if (!assembly) {
  throw new Error(
    `unknown --assembly=${assemblyName}; one of ${Object.keys(ASSEMBLIES).join(', ')}`,
  )
}
const positional = args.filter(a => !a.startsWith('--'))
const outDir = positional[1] ?? join(here, 'out')
const { db, way, set } = assembly
const outName = `${db}.${set}.multiz${way}way.aa`
const faPath = join(outDir, `${outName}.fa`)
// name index and CDS model sit beside the bgzip as `<fa.gz>.idx` / `<fa.gz>.cds`,
// so a single `.fa.gz` uri finds all three by suffix (cf. JBrowse's bam/bai)
const idxPath = join(outDir, `${outName}.fa.gz.idx`)
const cdsPath = join(outDir, `${outName}.fa.gz.cds`)
const treePath = join(outDir, `${db}.multiz${way}way.nh`)

// ENST/NM_ ids are matched versionless, so version drift between the alignment
// build and the xref table doesn't break the lookup
const versionless = id => id.replace(/\.\d+$/, '')
// WormBase transcript ids (`F41D9.3b.1`, `T11F9.4a.1`) carry a `.N` version on
// top of the dotted gene name; drop it only when a dotted stem remains, so the
// gene `F41D9.3` keeps its `.3`
const wormbaseStem = id => id.replace(/^(.+\..+)\.\d+$/, '$1')

await mkdir(outDir, { recursive: true })
requireTool('bgzip')
const input = await localInput(
  positional[0] ?? `${UCSC}/${assembly.db}/${assembly.exonAA}`,
)

// --- species tree ------------------------------------------------------------
// Loaded first because its leaf names are the row names the viewer joins on.
// UCSC spells an accession-named assembly `GCF_003668045v3` in the tree and
// `GCF_003668045.3` in the exonAA headers; rows take the tree's spelling.
const treeText = await (await fetch(`${UCSC}/${db}/${assembly.tree}`)).text()
const leaves = new Set(
  [...treeText.matchAll(/[(,]\s*([^(),:;]+?)\s*:/g)].map(m => m[1]),
)
const unmatchedDbs = new Set()
function rowName(species) {
  if (leaves.has(species)) {
    return species
  }
  const alt = species.replace(/\.(\d+)$/, 'v$1')
  if (leaves.has(alt)) {
    return alt
  }
  unmatchedDbs.add(species)
  return species
}

// --- xref: transcript id -> gene symbol ---------------------------------------
console.error(`loading ${assembly.xref} (transcript -> symbol)...`)
const { txToSymbol, keyOf, coding } = await loadXref(assembly.xref)
console.error(
  `${assembly.xref}: ${txToSymbol.size} transcript->symbol mappings`,
)

// --- chromAlias: UCSC sequence name -> the GenArk 2bit's name -----------------
const toDisplayRefName = assembly.genArk
  ? await loadChromAlias(assembly.genArk)
  : name => name
const unmappedRefNames = new Set()

// --- pass 1: which transcript represents each symbol ---------------------------
// The xref table is live and the exonAA a snapshot, so an isoform the table
// lists can be absent from the alignment (daf-16's longest RefSeq is); choosing
// among the transcripts the alignment actually holds is what makes every symbol
// resolve. Non-canonical sets keep the longest reference row per symbol,
// preferring a placement on a primary sequence, first seen on a tie.
//
// The same scan counts each transcript's runs of consecutive records, which is
// what tells pass 2 when a transcript's last record has passed.
console.error('scanning transcripts...')
const { symbolOf, runsOf, byCoordinate } = await scanTranscripts()
console.error(
  `${symbolOf.size} symbols map to a transcript in the alignment (${byCoordinate} placed by coordinate)`,
)

async function scanTranscripts() {
  const best = new Map() // symbol -> { transcript, residues, primary }
  const seen = new Map() // transcript -> { residues, primary, runs, span }
  const refSuffix = `_${db}_`
  let last
  let byCoordinate = 0
  for await (const line of fastaLines(input)) {
    if (!line.startsWith('>')) {
      continue
    }
    const i = line.indexOf(refSuffix)
    if (i < 0) {
      continue
    }
    const transcript = line.slice(1, i)
    const tokens = line.split(/\s+/)
    const entry = seen.get(transcript) ?? {
      residues: 0,
      primary: true,
      runs: 0,
    }
    entry.residues += Number(tokens[1]) || 0
    const coord = parseCoord(tokens[4])
    if (coord) {
      entry.primary &&= !coord.refName.includes('_')
      entry.span = {
        refName: coord.refName,
        strand: coord.strand,
        start: Math.min(entry.span?.start ?? Infinity, coord.start - 1),
        end: Math.max(entry.span?.end ?? 0, coord.end),
      }
    }
    if (transcript !== last) {
      entry.runs++
      last = transcript
    }
    seen.set(transcript, entry)
  }
  for (const [transcript, entry] of seen) {
    let symbol = txToSymbol.get(keyOf(transcript))
    if (!symbol && coding && entry.span) {
      symbol = symbolByOverlap(entry.span)
      if (symbol) {
        byCoordinate++
      }
    }
    if (!symbol) {
      continue
    }
    const prev = best.get(symbol)
    if (
      !prev ||
      (!assembly.canonical &&
        (entry.residues > prev.residues ||
          (entry.residues === prev.residues && entry.primary && !prev.primary)))
    ) {
      best.set(symbol, { transcript, ...entry })
    }
  }
  return {
    symbolOf: new Map(
      [...best].map(([symbol, { transcript }]) => [transcript, symbol]),
    ),
    runsOf: new Map(
      [...seen].map(([transcript, { runs }]) => [transcript, runs]),
    ),
    byCoordinate,
  }
}

// The gene whose coding span overlaps the transcript's the most, same sequence
// and strand. The exonAA is a snapshot and the genePred table is live, so ids
// retire between the two (a tenth of ce11's transcripts, daf-16 among them);
// the locus does not move.
function symbolByOverlap(span) {
  let bestSymbol
  let bestOverlap = 0
  for (const g of coding.get(span.refName) ?? []) {
    const overlap = Math.min(g.end, span.end) - Math.max(g.start, span.start)
    if (g.strand === span.strand && overlap > bestOverlap) {
      bestOverlap = overlap
      bestSymbol = g.symbol
    }
  }
  return bestSymbol
}

// --- pass 2: reassemble per transcript, write blocks + index --------------------
const fa = createWriteStream(faPath)
const idx = createWriteStream(idxPath)
const cdsOut = createWriteStream(cdsPath)

// transcripts whose records are still arriving, keyed by id; `cur` is the one
// the last record belonged to
const open = new Map()
let cur
let header
let seq = ''
let offset = 0
let written = 0
let dupes = 0
let unparsed = 0
// CDS whose coding length is not a clean multiple of 3 — UCSC's exonAA is itself
// partial here (immunoglobulin/TCR gene segments, a few truncated rows). The
// model is still emitted; the mapping is just off by the partial last codon.
let partialCds = 0
// complete CDS whose length is not 3x the reference row's residue count: the
// invariant the website's genome<->MSA mapping rests on
let cdsMismatch = 0
// one block per symbol: chooseTranscripts names one transcript, but the same
// transcript id can be aligned at two placements; the first block wins so a
// name can never silently return the wrong gene
const seenSymbol = new Set()

for await (const line of fastaLines(input)) {
  if (line.startsWith('>')) {
    await commitRecord()
    header = line.slice(1)
    seq = ''
  } else {
    seq += line.trim()
  }
}
await commitRecord()
for (const t of open.values()) {
  await flush(t)
}
await endStream(fa)
await endStream(idx)
await endStream(cdsOut)

async function commitRecord() {
  if (header) {
    const rec = parseHeader(header)
    if (!rec) {
      unparsed++
    } else {
      if (cur && cur.transcript !== rec.transcript) {
        await endRun(cur)
      }
      cur = open.get(rec.transcript)
      if (!cur) {
        cur = {
          transcript: rec.transcript,
          runsLeft: runsOf.get(rec.transcript) ?? 1,
          exons: new Map(),
        }
        open.set(rec.transcript, cur)
      }
      let exon = cur.exons.get(rec.exonNum)
      if (!exon) {
        exon = { len: seq.length, bySpecies: new Map() }
        cur.exons.set(rec.exonNum, exon)
      }
      exon.len = Math.max(exon.len, seq.length)
      exon.bySpecies.set(rec.db, seq)
      // capture the reference row's genomic CDS coords for this exon (for the .cds)
      if (rec.db === db && rec.coord) {
        exon.ref = rec.coord
        cur.refName = rec.coord.refName
        cur.strand = rec.coord.strand
      }
    }
  }
  header = undefined
}

// A transcript is complete when its last run of records ends (pass 1 counted
// them). One with runs still to come has an isoform's exon group interleaved
// and stays open.
async function endRun(t) {
  t.runsLeft--
  if (t.runsLeft <= 0) {
    open.delete(t.transcript)
    await flush(t)
  }
}

// Header: {transcript}_{db}_{exonNum}_{exonCount} {aaLen} {f0} {f1} {coord}
// where {coord} = chr:start-end[+-], the 1-based inclusive genomic CDS span of
// the exon's coding bases (absent for a species with no alignment there). The
// two frame ints are derivable from cumulative length, so phase is recomputed
// in flush() rather than trusted from the header.
//
// An exon group leads with the reference assembly, so a stem ending in `_{db}`
// names the transcript, and every other record of the group is `{transcript}_`
// followed by the species name, underscores and all.
function parseHeader(h) {
  const tokens = h.split(/\s+/)
  const m = /^(.+)_(\d+)_(\d+)$/.exec(tokens[0])
  if (!m) {
    return undefined
  }
  const [, stem, exonNum] = m
  const coord = parseCoord(tokens[4])
  const refSuffix = `_${db}`
  if (stem.endsWith(refSuffix)) {
    return {
      transcript: stem.slice(0, -refSuffix.length),
      db,
      exonNum: Number(exonNum),
      coord,
    }
  }
  const prefix = `${cur?.transcript}_`
  return cur && stem.startsWith(prefix)
    ? {
        transcript: cur.transcript,
        db: rowName(stem.slice(prefix.length)),
        exonNum: Number(exonNum),
        coord,
      }
    : undefined
}

// chr1:169888676-169888840-  ->  {refName, start (1-based), end, strand}
function parseCoord(token) {
  const m = /^(.+):(\d+)-(\d+)([+-])$/.exec(token ?? '')
  return m
    ? { refName: m[1], start: Number(m[2]), end: Number(m[3]), strand: m[4] }
    : undefined
}

async function flush(t) {
  const symbol = symbolOf.get(t.transcript)
  if (t.exons.size > 0 && symbol) {
    if (seenSymbol.has(symbol)) {
      dupes++
    } else {
      seenSymbol.add(symbol)
      const { block, refResidues } = assemble(t)
      const bytes = Buffer.from(block)
      if (!fa.write(bytes)) {
        await once(fa, 'drain')
      }
      idx.write(`${symbol}\t${offset}\t${bytes.length}\n`)
      offset += bytes.length
      written++
      const cds = buildCds(t)
      if (cds) {
        if (cds.bp % 3 !== 0) {
          partialCds++
        } else if (cds.bp !== 3 * refResidues) {
          cdsMismatch++
        }
        cdsOut.write(
          `${symbol}\t${t.transcript}\t${cds.refName}\t${cds.strand}\t${cds.spec}\n`,
        )
      }
    }
  }
}

// The reference row's CDS model from the per-exon genomic coords. Exons are
// numbered in translation order, so phase is the running codon offset over that
// order ((3 - cumBefore%3) % 3, the GFF3 definition); the emitted list is sorted
// genomic-ascending (with each exon's phase) to match a JBrowse feature's CDS
// subfeatures. Coords are 0-based interbase (start-1).
function buildCds(t) {
  const exons = [...t.exons.entries()]
    .filter(([, e]) => e.ref)
    .sort((a, b) => a[0] - b[0]) // exonNum = translation order
    .map(([, e]) => e.ref)
  if (exons.length === 0 || !t.refName) {
    return undefined
  }
  let cum = 0
  const withPhase = exons.map(c => {
    const phase = (3 - (cum % 3)) % 3
    cum += c.end - (c.start - 1)
    return { start: c.start - 1, end: c.end, phase }
  })
  const bp = withPhase.reduce((s, c) => s + (c.end - c.start), 0)
  const spec = withPhase
    .sort((a, b) => a.start - b.start)
    .map(c => `${c.start}:${c.end}:${c.phase}`)
    .join(',')
  return {
    refName: toDisplayRefName(t.refName),
    strand: t.strand,
    spec,
    bp,
  }
}

// One FASTA block: the reference first, then every other species in first-seen
// order; each row = its exons concatenated in order, missing exons gap-filled.
// Also returns the reference row's residue count for the CDS length check.
function assemble(t) {
  const exonNums = [...t.exons.keys()].sort((a, b) => a - b)
  const species = new Set()
  for (const e of t.exons.values()) {
    for (const name of e.bySpecies.keys()) {
      species.add(name)
    }
  }
  const ordered = [db, ...[...species].filter(s => s !== db)]
  const rows = ordered.map(name =>
    exonNums
      .map(n => {
        const exon = t.exons.get(n)
        return exon.bySpecies.get(name) ?? '-'.repeat(exon.len)
      })
      .join(''),
  )
  const refResidues = rows[0].replaceAll('-', '').length
  return {
    block: ordered.map((name, i) => `>${name}\n${rows[i]}`).join('\n') + '\n',
    refResidues,
  }
}

console.error(
  `assembled ${written} transcript blocks (${dupes} dropped as duplicate symbol, ` +
    `${partialCds} partial-CDS genes, ${cdsMismatch} CDS/row length mismatches, ` +
    `${unparsed} unparseable headers); bgzipping...`,
)
if (unmatchedDbs.size > 0) {
  console.error(
    `WARNING: ${unmatchedDbs.size} alignment row names have no tree leaf: ${[...unmatchedDbs].slice(0, 10).join(', ')}`,
  )
}
if (unmappedRefNames.size > 0) {
  console.error(
    `WARNING: ${unmappedRefNames.size} UCSC sequence names have no chromAlias entry (kept as-is): ${[...unmappedRefNames].slice(0, 10).join(', ')}`,
  )
}

// bgzip -i builds the .gzi alongside the .gz in one pass (random reads use the
// uncompressed offsets recorded in the .idx above).
run('bgzip', ['-i', '-f', faPath]) // -> .fa.gz + .fa.gz.gzi
await writeFile(treePath, treeText)
console.error(
  `wrote ${faPath}.gz (+ .gzi), ${idxPath}, ${cdsPath}, ${treePath}`,
)

// --- xref loaders -------------------------------------------------------------
// Each returns the transcript->symbol map plus the `keyOf` normalizer both the
// table's ids and the exonAA header ids go through before the lookup. genePred
// tables (columns: bin name chrom strand txStart txEnd cdsStart cdsEnd
// exonCount exonStarts exonEnds score name2 ...) also yield each symbol's
// coding span per sequence, for transcripts whose id the table no longer has.
async function loadXref(table) {
  const rows = readline.createInterface({
    input: await openGz(`${UCSC}/${db}/database/${table}.txt.gz`),
  })
  switch (table) {
    case 'kgXref':
      return xrefFromPairs(rows, versionless, cols => [cols[0], cols[4]])
    case 'refGene':
    case 'ncbiRefSeq':
      return xrefFromGenePred(rows)
    case 'ensemblToGeneName':
      return xrefFromPairs(rows, wormbaseStem, cols => [cols[0], cols[1]])
    default:
      throw new Error(`no loader for xref table ${table}`)
  }
}

async function xrefFromPairs(rows, keyOf, pick) {
  const txToSymbol = new Map()
  for await (const line of rows) {
    const [id, symbol] = pick(line.split('\t'))
    if (id && symbol) {
      txToSymbol.set(keyOf(id), symbol)
    }
  }
  return { txToSymbol, keyOf }
}

async function xrefFromGenePred(rows) {
  const txToSymbol = new Map()
  const coding = new Map() // refName -> [{ start, end, strand, symbol }]
  for await (const line of rows) {
    const cols = line.split('\t')
    const [, name, refName, strand, , , cdsStart, cdsEnd] = cols
    const symbol = cols[12]
    if (!name || !symbol) {
      continue
    }
    txToSymbol.set(versionless(name), symbol)
    if (Number(cdsStart) < Number(cdsEnd)) {
      const list = coding.get(refName) ?? []
      list.push({
        start: Number(cdsStart),
        end: Number(cdsEnd),
        strand,
        symbol,
      })
      coding.set(refName, list)
    }
  }
  return { txToSymbol, keyOf: versionless, coding }
}

// --- chromAlias ---------------------------------------------------------------
// GenArk hubs name sequences by RefSeq accession; UCSC's exonAA headers use
// `chr2L` / `chrY_DS485423v1_random`. The hub's chromAlias.txt lists every
// spelling per sequence, with the 2bit's own name in the first column. UCSC's
// `_random` contig names embed a GenBank/RefSeq accession with `v` for `.`,
// which is how those resolve when the ucsc column spells them differently.
async function loadChromAlias(accession) {
  const [prefix, digits] = [accession.slice(0, 3), accession.slice(4, 13)]
  const url = `${GENARK}/${prefix}/${digits.slice(0, 3)}/${digits.slice(3, 6)}/${digits.slice(6, 9)}/${accession}/${accession}.chromAlias.txt`
  const text = await (await fetch(url)).text()
  const alias = new Map()
  for (const line of text.split('\n')) {
    if (line && !line.startsWith('#')) {
      const cols = line.split('\t')
      for (const name of cols) {
        if (name) {
          alias.set(name, cols[0])
        }
      }
    }
  }
  return name => {
    const embedded = /^chr[^_]*_(.+?)(_random|_alt|_fix)?$/.exec(name)?.[1]
    const found =
      alias.get(name) ??
      (embedded && alias.get(embedded.replace(/v(\d+)$/, '.$1')))
    if (!found) {
      unmappedRefNames.add(name)
    }
    return found ?? name
  }
}

// --- helpers -----------------------------------------------------------------
// The exonAA is read twice (pass 1 chooses transcripts, pass 2 assembles), so a
// URL is downloaded once into outDir and kept there for the next run.
async function localInput(src) {
  if (!src.startsWith('http')) {
    return src
  }
  const path = join(outDir, basename(src))
  if (!existsSync(path)) {
    console.error(`downloading ${src} -> ${path}`)
    const res = await fetch(src)
    if (!res.ok || !res.body) {
      throw new Error(`fetch failed: ${res.status} ${src}`)
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(path))
  }
  return path
}

function fastaLines(path) {
  return readline.createInterface({
    input: createReadStream(path).pipe(createGunzip()),
  })
}

async function openGz(url) {
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`fetch failed: ${res.status} ${url}`)
  }
  return Readable.fromWeb(res.body).pipe(createGunzip())
}

function endStream(stream) {
  return new Promise((resolve, reject) => {
    stream.end(resolve)
    stream.on('error', reject)
  })
}

function requireTool(name) {
  if (spawnSync('which', [name]).status !== 0) {
    throw new Error(`${name} not found on PATH (install htslib)`)
  }
}

function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit' })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(' ')} failed`)
  }
}
