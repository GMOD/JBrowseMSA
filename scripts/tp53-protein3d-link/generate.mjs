// Builds the flagship three-view example on the "Genome browser" docs page: the
// human TP53 gene on hg38, the p53 ortholog alignment, AND the AlphaFold p53
// structure (jbrowse-plugin-protein3d), all connected to one genome view and
// opened with the p53 DNA-binding domain highlighted across all three at once —
// magenta in the 3D structure, a band on the genome, and a column band in the
// alignment. The pathogenic/conserved hotspot R248 (the TP53 R248 example) sits
// inside this very domain, so the three figures tell one story.
//
// The whole relationship is declarative — a single JBrowse session spec in the
// URL, no clicks:
//   - a LinearGenomeView with a pinned `id` (lgv-tp53-3d), RefSeq + ClinVar.
//   - an MsaView `connectedViewId`-linked to it (the p53 ortholog alignment +
//     tree), with `highlightColumns` lighting the DNA-binding-domain columns.
//   - a ProteinView `connectedViewId`-linked to the SAME genome view, carrying
//     the AlphaFold structure URL, the transcript `feature` (codon mapping),
//     the translated protein sequence, and `initialSelection` — the new
//     protein3d prop (≥ next release) that pre-lights a domain on load exactly
//     as a domain click would.
//
// Like the SRC/BRAF/TP53 scripts, every coordinate is derived reproducibly from
// public sources rather than pasted in as an opaque blob:
//   - the transcript model (connectedFeature / ProteinView feature) from the
//     same public RefSeq GFF the gene track uses (via tabix),
//   - the DNA-binding-domain residue range from the EBI UniProt features API
//     (the same source protein3d's own feature track reads),
//   - the alignment columns from the served FASTA alignment itself.
//
// Usage:  node scripts/tp53-protein3d-link/generate.mjs
// Requires: tabix (htslib) on PATH and network access to EBI.

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
const UNIPROT = 'P04637' // p53_HUMAN, the AlphaFold + UniProt-features accession
const ALPHAFOLD_VERSION = 'v6'
const DATA = 'https://gmod.org/JBrowseMSA/demo/data'
const CONFIG = `${DATA}/jbrowse-msa-combined-config.json`
const CLINVAR_TRACK = 'hg38-tp53-clinvar-pathogenic'
const JBROWSE = 'https://jbrowse.org/code/jb2/webgl-poc/'

// --- the alignment row (protein sequence + residue->column map) --------------
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
if (!queryRow) {
  throw new Error(`row ${QUERY_SEQ} not found in tp53-p53-orthologs.fa`)
}
// the degapped query row is the protein sequence protein3d aligns to the
// AlphaFold structure (= NP_000537.3, the NM_000546.6 translation)
const proteinSeq = queryRow.replaceAll('-', '')

// 0-based aligned column of a given 1-based query residue
function residueToColumn(residue) {
  let residues = 0
  for (let col = 0; col < queryRow.length; col++) {
    if (queryRow[col] !== '-') {
      residues++
      if (residues === residue) {
        return col
      }
    }
  }
  throw new Error(`residue ${residue} not found in ${QUERY_SEQ}`)
}

// --- the DNA-binding domain (residue range from EBI UniProt features) --------
const featuresUrl = `https://www.ebi.ac.uk/proteins/api/features/${UNIPROT}?categories=DOMAINS_AND_SITES`
const featuresJson = await fetch(featuresUrl).then(r => {
  if (!r.ok) {
    throw new Error(`EBI features fetch failed: ${r.status} ${featuresUrl}`)
  }
  return r.json()
})
const dnaBind = featuresJson.features?.find(f => f.type === 'DNA_BIND')
if (!dnaBind) {
  throw new Error(`no DNA_BIND feature for ${UNIPROT} at ${featuresUrl}`)
}
// EBI begin/end are 1-based inclusive
const DOMAIN_START = Number(dnaBind.begin)
const DOMAIN_END = Number(dnaBind.end)
console.error(
  `${UNIPROT} DNA-binding domain: residues ${DOMAIN_START}-${DOMAIN_END}`,
)

// ProteinView selection is a 0-based half-open *structure*-residue range; the
// AlphaFold model is the full-length protein, so structure index = residue - 1.
const initialSelection = { start: DOMAIN_START - 1, end: DOMAIN_END }

// MSA highlight: the contiguous alignment-column span covering the domain, so
// it reads as one solid band (gaps within are included for a clean band).
const colStart = residueToColumn(DOMAIN_START)
const colEnd = residueToColumn(DOMAIN_END)
const highlightColumns = []
for (let c = colStart; c <= colEnd; c++) {
  highlightColumns.push(c)
}
console.error(
  `domain alignment columns: ${colStart}-${colEnd} (${highlightColumns.length} cols)`,
)

// --- the transcript model (connectedFeature) from public RefSeq GFF ----------
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

const connectedFeature = {
  // protein3d wraps this in `new SimpleFeature(feature)`, which requires a
  // uniqueId; the MSA mapping tolerates its absence, protein3d does not
  uniqueId: TRANSCRIPT,
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

// Walk the CDS in translation order to find the genomic span of the domain
// (residues DOMAIN_START..DOMAIN_END), so the genome view frames it.
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
const domainCodingStart = (DOMAIN_START - 1) * 3
const domainCodingEnd = DOMAIN_END * 3 // exclusive (past the last codon)
const domainPositions = codingPositions.slice(domainCodingStart, domainCodingEnd)
const domainGenomeStart = Math.min(...domainPositions) // 0-based interbase
const domainGenomeEnd = Math.max(...domainPositions) + 1
const refName = connectedFeature.refName
console.error(
  `domain genomic span -> ${refName}:${domainGenomeStart + 1}-${domainGenomeEnd}`,
)

const pad = 500
const fmt = n => n.toLocaleString('en-US')
const spec = {
  views: [
    {
      type: 'LinearGenomeView',
      // pinned id so the MsaView and ProteinView below both connect here
      id: 'lgv-tp53-3d',
      assembly: 'hg38',
      loc: `${refName}:${fmt(domainGenomeStart + 1 - pad)}-${fmt(domainGenomeEnd + pad)}`,
      colorByCDS: true,
      tracks: ['hg38-ncbiRefSeqSelect', CLINVAR_TRACK],
    },
    {
      type: 'MsaView',
      connectedViewId: 'lgv-tp53-3d',
      connectedFeature,
      querySeqName: QUERY_SEQ,
      highlightColumns,
      msaFileLocation: { uri: `${DATA}/tp53-p53-orthologs.fa` },
      treeFileLocation: { uri: `${DATA}/tp53-p53.nh` },
      colorSchemeName: 'clustalx_protein_dynamic',
      labelsAlignRight: true,
      treeAreaWidth: 200,
    },
    {
      type: 'ProteinView',
      // connect to the SAME genome view (full-form launch: url + feature +
      // sequence supplied, so no own LGV is created)
      connectedViewId: 'lgv-tp53-3d',
      url: `https://alphafold.ebi.ac.uk/files/AF-${UNIPROT}-F1-model_${ALPHAFOLD_VERSION}.cif`,
      feature: connectedFeature,
      userProvidedTranscriptSequence: proteinSeq,
      // keep the genome at the gene-wide framing so the domain shows as a
      // highlighted sub-region rather than zooming to base level
      zoomToBaseLevel: false,
      height: 500,
      // the declarative domain pre-selection (protein3d initialSelection)
      initialSelection,
    },
  ],
  // side-by-side workspaces layout: genome + alignment stacked on the left, the
  // 3D structure on the right, so the structure is prominent rather than buried
  // below a tall vertical stack
  layout: {
    direction: 'horizontal',
    children: [
      { views: [0, 1], size: 58 },
      { views: [2], size: 42 },
    ],
  },
}

const url =
  JBROWSE +
  '?config=' +
  encodeURIComponent(CONFIG) +
  '&session=spec-' +
  encodeURIComponent(JSON.stringify(spec))

console.log(url)
