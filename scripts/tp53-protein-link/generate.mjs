// Builds the TP53 example on the "Genome browser" docs page: the p53 ortholog
// alignment connected to the human TP53 gene on hg38, opened on the R248 codon —
// where a wall of ClinVar pathogenic variants piles onto a 100%-conserved
// alignment column. The MsaView and the LinearGenomeView share coordinates
// (click a residue -> genome navigates to its codon), the LGV carries a ClinVar
// pathogenic-variant track, and the link opens with the R248 column highlighted.
//
// R248 is the most frequently mutated residue in TP53 across human cancers: it
// contacts DNA in the minor groove, is invariant across vertebrates, and the
// codon collects a dense stack of distinct pathogenic substitutions.
//
// Like the SRC/BRAF scripts, the only piece that can't be a bare file URL is
// `connectedFeature` (the transcript model for the codon mapping), derived here
// from the same public RefSeq GFF the gene track uses.
//
// Usage:  node scripts/tp53-protein-link/generate.mjs
// Requires: tabix (htslib) on PATH for the remote RefSeq fetch.
// The data files are built by scripts/tp53-protein-link/build-data.mjs.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dataLocal = join(here, '..', '..', 'packages', 'app', 'public', 'data')

// Public RefSeq GFF (CSI-indexed) — the same source as the hg38-ncbiRefSeq track
const GFF = 'https://jbrowse.org/ucsc/hg38/ncbiRefSeq.gff.gz'
// TP53 (NM_000546.6 -> NP_000537.3, canonical 393 aa p53), hg38 chr17, - strand
const TRANSCRIPT = 'NM_000546.6'
const REGION = 'chr17:7660000-7690000'
const QUERY_SEQ = 'human' // the matching row in tp53-p53-orthologs.fa (= NP_000537.3)
const HIGHLIGHT_RESIDUE = 248 // R248 (the DNA-contact mutation hotspot)
const DATA = 'https://gmod.org/JBrowseMSA/demo/data'
const CONFIG = `${DATA}/jbrowse-msa-combined-config.json`
const CLINVAR_TRACK = 'hg38-tp53-clinvar-pathogenic'
const JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc/'

// 0-based aligned column of the query row's HIGHLIGHT_RESIDUE, read from the same
// FASTA alignment we serve, so the link can never drift from the data.
const seqs = {}
let name
for (const line of readFileSync(
  join(dataLocal, 'tp53-p53-orthologs.fa'),
  'utf8',
).split('\n')) {
  if (line.startsWith('>')) {
    name = line.slice(1).trim()
    seqs[name] = ''
  } else if (name) {
    seqs[name] += line.trim()
  }
}
const queryRow = seqs[QUERY_SEQ]
let residues = 0
let HIGHLIGHT_COLUMN
for (let col = 0; col < queryRow.length; col++) {
  if (queryRow[col] !== '-') {
    residues++
    if (residues === HIGHLIGHT_RESIDUE) {
      HIGHLIGHT_COLUMN = col
      break
    }
  }
}
if (HIGHLIGHT_COLUMN === undefined) {
  throw new Error(`residue ${HIGHLIGHT_RESIDUE} not found in ${QUERY_SEQ}`)
}

const lines = execFileSync('tabix', [GFF, REGION], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .map(l => l.split('\t'))

// GFF is 1-based inclusive; JBrowse features use 0-based interbase (start-1, end)
const cds = lines
  .filter(r => r[2] === 'CDS' && r[8].includes(TRANSCRIPT))
  .map(r => ({
    type: 'CDS',
    refName: r[0],
    start: +r[3] - 1,
    end: +r[4],
    strand: r[6] === '+' ? 1 : -1,
    phase: +r[7],
  }))
  .sort((a, b) => a.start - b.start)

if (cds.length === 0) {
  throw new Error(`no CDS found for ${TRANSCRIPT} in ${REGION}`)
}

const codingBp = cds.reduce((s, c) => s + (c.end - c.start), 0)
console.error(
  `${TRANSCRIPT}: ${cds.length} CDS, ${codingBp} bp = ${codingBp / 3} codons; ` +
    `${QUERY_SEQ} residue ${HIGHLIGHT_RESIDUE} -> column ${HIGHLIGHT_COLUMN}`,
)

const connectedFeature = {
  type: 'mRNA',
  refName: cds[0].refName,
  start: Math.min(...cds.map(c => c.start)),
  end: Math.max(...cds.map(c => c.end)),
  strand: cds[0].strand,
  name: TRANSCRIPT,
  subfeatures: cds.map(({ type, start, end, strand, phase }) => ({
    type,
    start,
    end,
    strand,
    phase,
  })),
}

// Walk the CDS in translation order (descending genomic coord on the - strand)
// to find the genomic span of the highlighted codon for the genome view's loc.
const codingPositions = []
const exonsInTranslationOrder = [...cds].sort((a, b) =>
  connectedFeature.strand === 1 ? a.start - b.start : b.start - a.start,
)
for (const c of exonsInTranslationOrder) {
  const range = []
  for (let p = c.start; p < c.end; p++) {
    range.push(p)
  }
  codingPositions.push(
    ...(connectedFeature.strand === 1 ? range : range.reverse()),
  )
}
const codonStartIdx = (HIGHLIGHT_RESIDUE - 1) * 3
const codonPositions = codingPositions.slice(codonStartIdx, codonStartIdx + 3)
const codonStart = Math.min(...codonPositions) // 0-based interbase
const codonEnd = Math.max(...codonPositions) + 1
const refName = connectedFeature.refName
console.error(
  `residue ${HIGHLIGHT_RESIDUE} codon -> ${refName}:${codonStart + 1}-${codonEnd}`,
)

const pad = 30
const fmt = n => n.toLocaleString('en-US')
const spec = {
  views: [
    {
      type: 'LinearGenomeView',
      // pinned id so the MsaView below can connect to this view declaratively
      id: 'lgv-tp53',
      assembly: 'hg38',
      loc: `${refName}:${fmt(codonStart + 1 - pad)}-${fmt(codonEnd + pad)}`,
      highlight: [`${refName}:${fmt(codonStart + 1)}-${fmt(codonEnd)}`],
      // codon-frame coloring on the reference sequence so the highlighted R248
      // codon reads in-frame beside the alignment
      colorByCDS: true,
      // collapse the gene track to the single longest coding transcript
      // (NM_000546.6, the same one the protein<->genome map uses) so the deep
      // zoom isn't a confusing stack of overlapping isoforms
      tracks: [
        {
          trackId: 'hg38-ncbiRefSeq',
          displaySnapshot: {
            type: 'LinearBasicDisplay',
            geneGlyphMode: 'longestCoding',
          },
        },
        CLINVAR_TRACK,
      ],
    },
    {
      type: 'MsaView',
      connectedViewId: 'lgv-tp53',
      connectedFeature,
      querySeqName: QUERY_SEQ,
      highlightColumns: [HIGHLIGHT_COLUMN],
      msaFileLocation: { uri: `${DATA}/tp53-p53-orthologs.fa` },
      treeFileLocation: { uri: `${DATA}/tp53-p53.nh` },
      colorSchemeName: 'clustalx_protein_dynamic',
      labelsAlignRight: true,
      treeAreaWidth: 200,
    },
  ],
}

const url =
  JBROWSE +
  '?config=' +
  encodeURIComponent(CONFIG) +
  '&session=spec-' +
  encodeURIComponent(JSON.stringify(spec))

console.log(url)
