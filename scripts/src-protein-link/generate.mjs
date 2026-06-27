// Builds the PROTEIN example used on the "Genome browser" docs page: the
// Src-family kinase alignment connected to the human SRC gene on hg38, so the
// MsaView and the LinearGenomeView share coordinates — clicking a residue
// navigates the genome via the codon map, and hovering the genome highlights the
// MSA column.
//
// The link is a single declarative JBrowse session spec. The only piece that
// can't be a bare file URL is `connectedFeature` (the transcript model used for
// the protein<->genome codon mapping), so we derive it reproducibly here from
// the same public RefSeq GFF the gene track uses, rather than pasting an opaque
// blob. Same philosophy as scripts/f12-cetacean/ and scripts/examples-gen/.
//
// Usage:  node scripts/src-protein-link/generate.mjs
// Requires: tabix (htslib) on PATH for the remote RefSeq fetch.

import { execFileSync } from 'node:child_process'

// Public RefSeq GFF (CSI-indexed) — the same source as the hg38-ncbiRefSeq track
const GFF = 'https://jbrowse.org/ucsc/hg38/ncbiRefSeq.gff.gz'
// SRC (NM_005417.5 -> NP_005408.1, canonical 536 aa c-Src), hg38 chr20, + strand
const TRANSCRIPT = 'NM_005417.5'
const REGION = 'chr20:37340000-37410000'
const QUERY_SEQ = 'SRC_HUMAN' // the matching row in kinase.aln (UniProt P12931, 536 aa)
const DATA = 'https://gmod.org/JBrowseMSA/demo/data'
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

const spec = {
  views: [
    {
      type: 'LinearGenomeView',
      // pinned id so the MsaView below can connect to this view declaratively
      // (requires jbrowse LaunchView-LinearGenomeView id forwarding)
      id: 'lgv-src',
      assembly: 'hg38',
      loc: 'chr20:37,344,685-37,406,050',
      tracks: ['hg38-ncbiRefSeq'],
    },
    {
      type: 'MsaView',
      connectedViewId: 'lgv-src',
      connectedFeature,
      querySeqName: QUERY_SEQ,
      msaFileLocation: { uri: `${DATA}/kinase.aln` },
      treeFileLocation: { uri: `${DATA}/kinase.nh` },
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
