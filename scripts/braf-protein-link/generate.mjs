// Builds the BRAF protein example on the "Genome browser" docs page: the
// RAF-family kinase alignment connected to the human BRAF gene on hg38, opened
// on the V600 site. The MsaView and the LinearGenomeView share coordinates —
// clicking a residue navigates the genome via the codon map, and hovering the
// genome highlights the MSA column — and the link opens with the V600 column
// pre-highlighted (highlightColumns) over the V600E codon in the genome.
//
// BRAF V600E (c.1799T>A) is the most common oncogenic mutation in melanoma and a
// frequent driver across other cancers; V600 sits in the kinase activation
// segment and is invariant across the RAF family, which the alignment shows.
//
// Like scripts/src-protein-link/, the only piece that can't be a bare file URL
// is `connectedFeature` (the transcript model for the protein<->genome codon
// mapping), so we derive it reproducibly here from the same public RefSeq GFF
// the gene track uses, rather than pasting an opaque blob.
//
// Usage:  node scripts/braf-protein-link/generate.mjs
// Requires: tabix (htslib) on PATH for the remote RefSeq fetch.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// Public RefSeq GFF (CSI-indexed) — the same source as the hg38-ncbiRefSeq track
const GFF = 'https://jbrowse.org/ucsc/hg38/ncbiRefSeq.gff.gz'
// BRAF (NM_004333.6 -> NP_004324.2, canonical 766 aa B-Raf), hg38 chr7, - strand
const TRANSCRIPT = 'NM_004333.6'
const REGION = 'chr7:140700000-140930000'
const QUERY_SEQ = 'BRAF_HUMAN' // the matching row in braf.aln (UniProt P15056, 766 aa)
const HIGHLIGHT_RESIDUE = 600 // V600 (the V600E activation-segment site)
const DATA = 'https://gmod.org/JBrowseMSA/demo/data'

// 0-based aligned column of the query row's HIGHLIGHT_RESIDUE, read from the same
// CLUSTAL alignment we serve so the link can never drift from the data.
const aln = readFileSync(
  join(here, '..', '..', 'packages', 'app', 'public', 'data', 'braf.aln'),
  'utf8',
)
const queryRow = aln
  .split('\n')
  .filter(l => l.startsWith(QUERY_SEQ + ' '))
  .map(l => l.trim().split(/\s+/)[1])
  .join('')
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
const CONFIG = `${DATA}/jbrowse-msa-combined-config.json`
const JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc/'

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
  `${TRANSCRIPT}: ${cds.length} CDS, ${codingBp} bp = ${codingBp / 3} codons ` +
    `(${QUERY_SEQ} is ${codingBp / 3} aa)`,
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
// to find the genomic span of the highlighted codon, so the genome view opens on
// it with a matching highlight band.
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

const pad = 40
const fmt = n => n.toLocaleString('en-US')
const spec = {
  views: [
    {
      type: 'LinearGenomeView',
      // pinned id so the MsaView below can connect to this view declaratively
      // (requires jbrowse LaunchView-LinearGenomeView id forwarding)
      id: 'lgv-braf',
      assembly: 'hg38',
      loc: `${refName}:${fmt(codonStart + 1 - pad)}-${fmt(codonEnd + pad)}`,
      highlight: [`${refName}:${fmt(codonStart + 1)}-${fmt(codonEnd)}`],
      // codon-frame coloring on the reference sequence so the highlighted V600
      // codon reads in-frame beside the alignment
      colorByCDS: true,
      // collapse the gene track to the single longest coding transcript
      // (NM_004333.6, the same one the protein<->genome map uses) so the deep
      // zoom isn't a confusing stack of overlapping isoforms
      tracks: [
        {
          trackId: 'hg38-ncbiRefSeq',
          displaySnapshot: {
            type: 'LinearBasicDisplay',
            geneGlyphMode: 'longestCoding',
          },
        },
        // ClinVar pathogenic-variant pileup over the V600 codon — the disease
        // parallel to the conserved alignment column (like TP53 R248)
        'hg38-braf-clinvar-pathogenic',
      ],
    },
    {
      type: 'MsaView',
      connectedViewId: 'lgv-braf',
      connectedFeature,
      querySeqName: QUERY_SEQ,
      highlightColumns: [HIGHLIGHT_COLUMN],
      msaFileLocation: { uri: `${DATA}/braf.aln` },
      treeFileLocation: { uri: `${DATA}/braf.nh` },
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
