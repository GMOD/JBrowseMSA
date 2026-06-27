// Reindex the UCSC 100-way exon-amino-acid alignment into a single tabix file
// keyed by genomic locus, so the Gene explorer (and the JBrowse MsaView it
// launches) can pull any one gene's whole vertebrate alignment with one range
// request — no per-gene files, no 100+ MB faidx.
//
// Input  (UCSC, ~3.6 GB gz, streamed — never fully held in memory):
//   ncbiRefSeq.multiz100way.exonAA.fa.gz
//     FASTA, one record per (transcript, species, exon). Header:
//       >{transcript}_{db}_{exonNum}_{exonCount} {aaLen} {..} {..} {chr:start-end}{strand}
//     Records for one transcript are consecutive; within it, exon 1 of every
//     species, then exon 2, ... The hg38 row's header carries the hg38 genomic
//     coordinates of each exon, so we need no separate coordinate file.
//
// Output (hosted under packages/app/public/data, served at
//   gmod.org/JBrowseMSA/demo/data):
//   hg38.ncbiRefSeq.multiz100way.aa.txt.gz(.csi)
//     bgzip + tabix. One line per transcript:
//       chrom <TAB> start <TAB> end <TAB> transcriptId <TAB> packed
//     `start`/`end` are the 0-based half-open genomic span of the transcript's
//     coding exons; `packed` is `db:ALIGNEDSEQ;db:ALIGNEDSEQ;...` with hg38
//     first (no newlines, so the alignment is one tabix column). A species that
//     is missing an exon is gap-filled to keep every row column-aligned.
//   hg38.multiz100way.nh   (the 100-way species tree, leaf names = UCSC db ids)
//
// Usage:
//   node scripts/gene-explorer/build-data.mjs [exonAA.fa.gz] [outDir]
// Defaults: streams the file straight from hgdownload; writes to
// packages/app/public/data. Requires bgzip + tabix (htslib) on PATH.
//
// To test on a small slice without the 3.6 GB download, pass a local gz holding
// a handful of transcripts (see scripts/gene-explorer/README.md).

import { spawn, spawnSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createGunzip } from 'node:zlib'
import readline from 'node:readline'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const here = dirname(fileURLToPath(import.meta.url))
const UCSC = 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way'
const EXON_AA = `${UCSC}/alignments/ncbiRefSeq.multiz100way.exonAA.fa.gz`
const TREE = `${UCSC}/hg38.100way.nh`

const input = process.argv[2] ?? EXON_AA
const outDir = process.argv[3] ?? join(here, '..', '..', 'packages', 'app', 'public', 'data')
const outName = 'hg38.ncbiRefSeq.multiz100way.aa.txt'
const outPath = join(outDir, `${outName}.gz`)

await mkdir(outDir, { recursive: true })
requireTool('bgzip')
requireTool('tabix')

// --- stream the exonAA, reassemble per transcript, sort, bgzip, tabix --------

// sort by chrom then start; bgzip; the .gz lands at outPath
const sort = spawn('sort', ['-k1,1', '-k2,2n'], { stdio: ['pipe', 'pipe', 'inherit'] })
const bgzip = spawn('bgzip', ['-c'], { stdio: ['pipe', 'pipe', 'inherit'] })
const out = (await import('node:fs')).createWriteStream(outPath)
sort.stdout.pipe(bgzip.stdin)
bgzip.stdout.pipe(out)

const lines = readline.createInterface({ input: await openInput(input) })

let cur // { transcript, exonCount, exons: Map<exonNum, {len, bySpecies: Map<db,seq>}>, hg38: {chrom, starts, ends} }
let header
let seq = ''
let written = 0

function flush() {
  if (cur) {
    const line = assemble(cur)
    if (line) {
      sort.stdin.write(line + '\n')
      written++
    }
  }
}

for await (const raw of lines) {
  if (raw.startsWith('>')) {
    commitRecord()
    header = raw.slice(1)
    seq = ''
  } else {
    seq += raw.trim()
  }
}
commitRecord()
flush()
sort.stdin.end()

function commitRecord() {
  if (header) {
    const rec = parseHeader(header)
    if (rec) {
      if (!cur || cur.transcript !== rec.transcript) {
        flush()
        cur = { transcript: rec.transcript, exonCount: rec.exonCount, exons: new Map(), hg38: undefined }
      }
      let exon = cur.exons.get(rec.exonNum)
      if (!exon) {
        exon = { len: seq.length, bySpecies: new Map() }
        cur.exons.set(rec.exonNum, exon)
      }
      exon.len = Math.max(exon.len, seq.length)
      exon.bySpecies.set(rec.db, seq)
      if (rec.db === 'hg38' && rec.pos) {
        cur.hg38 ??= { chrom: rec.pos.chrom, starts: [], ends: [] }
        cur.hg38.starts.push(rec.pos.start)
        cur.hg38.ends.push(rec.pos.end)
      }
    }
  }
  header = undefined
}

// Header: {transcript}_{db}_{exonNum}_{exonCount} {len} {x} {y} {chr:start-end}{strand}
function parseHeader(h) {
  const [id, , , , coord] = h.split(/\s+/)
  const parts = id.split('_')
  const exonCount = Number(parts.pop())
  const exonNum = Number(parts.pop())
  const db = parts.pop()
  const transcript = parts.join('_')
  const m = coord ? /^(.+):(\d+)-(\d+)([+-]?)$/.exec(coord) : null
  const pos = m
    ? { chrom: m[1], start: Number(m[2]) - 1, end: Number(m[3]) }
    : undefined
  return transcript && db && exonNum
    ? { transcript, db, exonNum, exonCount, pos }
    : undefined
}

function assemble(t) {
  if (!t.hg38 || t.exons.size === 0) {
    return undefined // no human reference row / coordinates -> skip
  }
  const exonNums = [...t.exons.keys()].sort((a, b) => a - b)
  const species = new Set()
  for (const e of t.exons.values()) {
    for (const db of e.bySpecies.keys()) {
      species.add(db)
    }
  }
  // hg38 first, then the rest in first-seen order
  const ordered = ['hg38', ...[...species].filter(s => s !== 'hg38')]
  const rows = ordered.map(db => {
    const seqStr = exonNums
      .map(n => {
        const exon = t.exons.get(n)
        return exon.bySpecies.get(db) ?? '-'.repeat(exon.len)
      })
      .join('')
    return `${db}:${seqStr}`
  })
  const start = Math.min(...t.hg38.starts)
  const end = Math.max(...t.hg38.ends)
  return `${t.hg38.chrom}\t${start}\t${end}\t${t.transcript}\t${rows.join(';')}`
}

await new Promise((resolve, reject) => {
  out.on('finish', resolve)
  out.on('error', reject)
  bgzip.on('error', reject)
  sort.on('error', reject)
})

console.error(`wrote ${written} transcripts to ${outPath}`)

// tabix: 0-based (-0), seqcol 1, begin 2, end 3, CSI (large coords safe)
run('tabix', ['-0', '-s', '1', '-b', '2', '-e', '3', '-C', '-f', outPath])
console.error(`indexed ${outPath}.csi`)

// --- species tree ------------------------------------------------------------
const treeText = await (await fetch(TREE)).text()
await (await import('node:fs/promises')).writeFile(
  join(outDir, 'hg38.multiz100way.nh'),
  treeText,
)
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

function requireTool(name) {
  const r = spawnSync('which', [name])
  if (r.status !== 0) {
    throw new Error(`${name} not found on PATH (install htslib)`)
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' })
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed`)
  }
}
