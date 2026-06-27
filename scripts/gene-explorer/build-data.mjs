// Reindex the UCSC 100-way exon-amino-acid alignment into ONE bgzip file plus a
// tiny name index, so the Gene explorer (and the JBrowse MsaView it launches)
// can pull any one gene's whole vertebrate alignment with a single random read —
// keyed by GENE SYMBOL, not genomic coordinate. No per-gene files, no 91 MB
// faidx.
//
// Input  (UCSC knownCanonical, ~474 MB gz, streamed — never fully in memory):
//   knownCanonical.multiz100way.exonAA.fa.gz
//     FASTA, one record per (transcript, species, exon). Header:
//       >{ENST.version}_{db}_{exonNum}_{exonCount} {aaLen} {..} {..} {chr:start-end}{strand}
//     knownCanonical = one canonical transcript per gene, Ensembl-keyed (ENST).
//     Records for one transcript are consecutive; within it, exon 1 of every
//     species, then exon 2, ...
//   kgXref.txt.gz — TAB-sep; col1 ENST.version, col5 geneSymbol. Used to map
//     each knownCanonical ENST to its gene symbol — the exact thing the website
//     resolves from mygene.info, and unique per gene (one canonical transcript
//     each). We key on the symbol rather than the RefSeq NM_ because kgXref's
//     mRNA column is unreliable: e.g. TP53's canonical ENST00000269305 maps to
//     the non-coding NR_176326, so NM_-keying would silently drop TP53.
//
// Output (hosted on s3://jbrowse.org/demos/msaview/100way/):
//   hg38.knownCanonical.multiz100way.aa.fa.gz       bgzip of concatenated
//     per-transcript FASTA blocks. One block = `>hg38\nSEQ\n>panTro4\nSEQ\n...`
//     (hg38 first; UCSC db names = alignment rows = species-tree leaves; a
//     species missing an exon is gap-filled so columns stay aligned).
//   hg38.knownCanonical.multiz100way.aa.fa.gz.gzi   the `bgzip -i` index.
//   hg38.knownCanonical.multiz100way.aa.fa.gz.idx   TSV `SYMBOL <TAB> offset
//     <TAB> length` — uncompressed byte offset + length of each block, keyed by
//     gene symbol. The `.gzi`/`.idx` are found by appending to the `.fa.gz` uri.
//     Fetched once by the browser (~1 MB), then random-read by name.
//   hg38.knownCanonical.multiz100way.aa.fa.gz.cds   TSV `SYMBOL <TAB> ENST <TAB>
//     refName <TAB> strand <TAB> start:end:phase,...` — the hg38 knownCanonical
//     CDS model (0-based interbase, genomic-ascending). The website builds the
//     connected feature from this so it shares the alignment's transcript.
//   hg38.multiz100way.nh   the 100-way species tree (leaf names = UCSC db ids).
//
// Usage:
//   node scripts/gene-explorer/build-data.mjs [exonAA.fa.gz] [outDir]
// Defaults: streams the file straight from hgdownload; writes to ./out.
// Requires bgzip (htslib) on PATH.
//
// To test on a small slice without the 474 MB download, pass a local gz holding
// a handful of transcripts (see scripts/gene-explorer/README.md).

import { spawnSync } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createGunzip } from 'node:zlib'
import { once } from 'node:events'
import readline from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const here = dirname(fileURLToPath(import.meta.url))
const UCSC = 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38'
const EXON_AA = `${UCSC}/multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz`
const KGXREF = `${UCSC}/database/kgXref.txt.gz`
const TREE = `${UCSC}/multiz100way/hg38.100way.nh`

const input = process.argv[2] ?? EXON_AA
const outDir = process.argv[3] ?? join(here, 'out')
const outName = 'hg38.knownCanonical.multiz100way.aa'
const faPath = join(outDir, `${outName}.fa`)
// name index sits beside the bgzip as `<fa.gz>.idx`, so a single `.fa.gz` uri
// finds both the `.gzi` and `.idx` by suffix (cf. JBrowse's bam/bai shorthand)
const idxPath = join(outDir, `${outName}.fa.gz.idx`)
// the knownCanonical CDS model (genomic coords + phase) of the hg38 row, keyed by
// the same gene symbol. Found by suffix `.cds` on the `.fa.gz` uri. The website
// builds the MsaView/ProteinView `connectedFeature` from THIS, so the feature
// shares the alignment's transcript (knownCanonical) instead of RefSeq Select —
// keeping the genome<->MSA and genome<->3D coordinate mappings self-consistent.
const cdsPath = join(outDir, `${outName}.fa.gz.cds`)

// ENST is matched versionless, so version drift between the alignment build and
// kgXref doesn't break the lookup
const versionless = id => id.replace(/\.\d+$/, '')

await mkdir(outDir, { recursive: true })
requireTool('bgzip')

// --- kgXref: versionless ENST -> gene symbol ---------------------------------
console.error('loading kgXref (ENST -> symbol)...')
const enstToSymbol = new Map()
for await (const line of readline.createInterface({
  input: await openInput(KGXREF),
})) {
  const cols = line.split('\t')
  const enst = cols[0]
  const symbol = cols[4]
  if (enst && symbol) {
    enstToSymbol.set(versionless(enst), symbol)
  }
}
console.error(`kgXref: ${enstToSymbol.size} ENST->symbol mappings`)

// --- stream the exonAA, reassemble per transcript, write blocks + index ------
const fa = createWriteStream(faPath)
const idx = createWriteStream(idxPath)
const cdsOut = createWriteStream(cdsPath)
const lines = readline.createInterface({ input: await openInput(input) })

let cur // { transcript, exons: Map<exonNum,{len,bySpecies:Map<db,seq>}> }
let header
let seq = ''
let offset = 0
let written = 0
let dupes = 0
// CDS whose coding length is not a clean multiple of 3 — UCSC's exonAA is itself
// partial here (immunoglobulin/TCR gene segments, a few truncated rows). The
// model is still emitted; the mapping is just off by the partial last codon.
let partialCds = 0
// one canonical transcript per gene, so a symbol keys exactly one block — but
// guard anyway: if two knownCanonical ENSTs ever share a symbol, keep the first
// and count the rest, so a name can never silently return the wrong gene.
const seenSymbol = new Set()

for await (const line of lines) {
  if (line.startsWith('>')) {
    await commitRecord()
    header = line.slice(1)
    seq = ''
  } else {
    seq += line.trim()
  }
}
await commitRecord()
await flush()
await endStream(fa)
await endStream(idx)
await endStream(cdsOut)

async function commitRecord() {
  if (header) {
    const rec = parseHeader(header)
    if (rec) {
      if (!cur || cur.transcript !== rec.transcript) {
        await flush()
        cur = { transcript: rec.transcript, exons: new Map() }
      }
      let exon = cur.exons.get(rec.exonNum)
      if (!exon) {
        exon = { len: seq.length, bySpecies: new Map() }
        cur.exons.set(rec.exonNum, exon)
      }
      exon.len = Math.max(exon.len, seq.length)
      exon.bySpecies.set(rec.db, seq)
      // capture the hg38 row's genomic CDS coords for this exon (for the .cds)
      if (rec.db === 'hg38' && rec.coord) {
        exon.hg38 = rec.coord
        cur.refName = rec.coord.refName
        cur.strand = rec.coord.strand
      }
    }
  }
  header = undefined
}

// Header: {ENST.version}_{db}_{exonNum}_{exonCount} {aaLen} {f0} {f1} {coord}
// where {coord} = chr:start-end[+-], 1-based inclusive genomic CDS span of the
// exon's coding bases. The two frame ints are derivable from cumulative length,
// so phase is recomputed in flush() rather than trusted from the header.
function parseHeader(h) {
  const tokens = h.split(/\s+/)
  const parts = tokens[0].split('_')
  parts.pop() // exonCount
  const exonNum = Number(parts.pop())
  const db = parts.pop()
  const transcript = parts.join('_')
  const coord = parseCoord(tokens.at(-1))
  return transcript && db && exonNum
    ? { transcript, db, exonNum, coord }
    : undefined
}

// chr1:169888676-169888840-  ->  {refName, start (1-based), end, strand}
function parseCoord(token) {
  const m = /^(.+):(\d+)-(\d+)([+-])$/.exec(token ?? '')
  return m
    ? { refName: m[1], start: Number(m[2]), end: Number(m[3]), strand: m[4] }
    : undefined
}

async function flush() {
  if (cur && cur.exons.size > 0) {
    const symbol = enstToSymbol.get(versionless(cur.transcript))
    if (symbol) {
      if (seenSymbol.has(symbol)) {
        dupes++
      } else {
        seenSymbol.add(symbol)
        const block = Buffer.from(assemble(cur))
        if (!fa.write(block)) {
          await once(fa, 'drain')
        }
        idx.write(`${symbol}\t${offset}\t${block.length}\n`)
        offset += block.length
        written++
        const cds = buildCds(cur)
        if (cds) {
          if (cds.bp % 3 !== 0) {
            partialCds++
          }
          cdsOut.write(
            `${symbol}\t${cur.transcript}\t${cds.refName}\t${cds.strand}\t${cds.spec}\n`,
          )
        }
      }
    }
  }
}

// The hg38 knownCanonical CDS model from the per-exon genomic coords. Exons are
// numbered in translation order, so phase is the running codon offset over that
// order ((3 - cumBefore%3) % 3, the GFF3 definition); the emitted list is sorted
// genomic-ascending (with each exon's phase) to match a JBrowse feature's CDS
// subfeatures. Coords are 0-based interbase (start-1) like the GFF path was.
function buildCds(t) {
  const exons = [...t.exons.entries()]
    .filter(([, e]) => e.hg38)
    .sort((a, b) => a[0] - b[0]) // exonNum = translation order
    .map(([, e]) => e.hg38)
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
  return { refName: t.refName, strand: t.strand, spec, bp }
}

// One FASTA block: hg38 first, then every other species in first-seen order;
// each row = its exons concatenated in order, missing exons gap-filled.
function assemble(t) {
  const exonNums = [...t.exons.keys()].sort((a, b) => a - b)
  const species = new Set()
  for (const e of t.exons.values()) {
    for (const db of e.bySpecies.keys()) {
      species.add(db)
    }
  }
  const ordered = ['hg38', ...[...species].filter(s => s !== 'hg38')]
  return (
    ordered
      .map(db => {
        const row = exonNums
          .map(n => {
            const exon = t.exons.get(n)
            return exon.bySpecies.get(db) ?? '-'.repeat(exon.len)
          })
          .join('')
        return `>${db}\n${row}`
      })
      .join('\n') + '\n'
  )
}

console.error(
  `assembled ${written} transcript blocks (${dupes} dropped as duplicate symbol, ` +
    `${partialCds} partial-CDS genes); bgzipping...`,
)

// bgzip -i builds the .gzi alongside the .gz in one pass (random reads use the
// uncompressed offsets recorded in the .idx above).
run('bgzip', ['-i', '-f', faPath]) // -> .fa.gz + .fa.gz.gzi
console.error(`wrote ${faPath}.gz (+ .gzi), ${idxPath}, ${cdsPath}`)

// --- species tree ------------------------------------------------------------
const treeText = await (await fetch(TREE)).text()
await writeFile(join(outDir, 'hg38.multiz100way.nh'), treeText)
console.error(`wrote ${join(outDir, 'hg38.multiz100way.nh')}`)

// --- helpers -----------------------------------------------------------------
async function openInput(src) {
  if (src.startsWith('http')) {
    const res = await fetch(src)
    if (!res.ok || !res.body) {
      throw new Error(`fetch failed: ${res.status} ${src}`)
    }
    return Readable.fromWeb(res.body).pipe(createGunzip())
  }
  return createReadStream(src).pipe(createGunzip())
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

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed`)
  }
}
