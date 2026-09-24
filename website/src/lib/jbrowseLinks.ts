// Self-contained JBrowse session URLs for the tutorials/jbrowse_integration
// page, written by hand. Since jbrowse-plugin-msaview 3.5 a spec names the
// transcript (`connectedTranscript`), and the plugin looks the exon model up in
// the genome view's own gene track at launch. protein3d's `transcriptId` does
// the same for a ProteinView.
const HUB_HG38 = 'https://jbrowse.org/ucsc/hg38/config.json'
const DATA = 'https://gmod.org/JBrowseMSA/demo/data'
// hg38 with the RefSeq Select gene track and the BRAF and TP53 ClinVar tracks
const COMBINED_CONFIG = `${DATA}/jbrowse-msa-combined-config.json`

function specUrl(spec: Record<string, unknown>, config = HUB_HG38) {
  return `https://jbrowse.org/code/jb2/main/?config=${encodeURIComponent(config)}&session=spec-${encodeURIComponent(JSON.stringify(spec))}`
}

const tp53Genome = {
  type: 'LinearGenomeView',
  id: 'lgv-tp53',
  assembly: 'hg38',
  loc: 'chr17:7,668,000-7,688,000',
  tracks: ['hg38-ncbiRefSeqCurated'],
}

// TP53's UniRef50 cluster: every reference-proteome entry in UniProtKB within
// 50% identity of p53, aligned to the transcript's translation in the browser.
// It submits no job to any service, so it opens in seconds.
export const tp53UnirefBrowser = specUrl({
  views: [
    tp53Genome,
    {
      type: 'MsaView',
      connectedViewId: 'lgv-tp53',
      connectedTranscript: 'NM_000546.6',
      placement: 'splitRight',
      allowedGappyness: 50,
      orthologParams: {
        taxId: 9606,
        geneCandidates: ['TP53'],
        source: 'uniref',
        msaAlgorithm: 'browser',
        maxSpecies: 100,
      },
    },
  ],
})

// The same gene through a phmmer search of UniProt's representative proteomes
// at 15% similarity (rp15), the widest net EBI offers: p53's remote relatives
// across the tree of life, including p63/p73 and invertebrate p53 family
// members a 50% cluster cannot reach. The wait is EBI's queue.
export const tp53PhmmerRp15 = specUrl({
  views: [
    tp53Genome,
    {
      type: 'MsaView',
      connectedViewId: 'lgv-tp53',
      connectedTranscript: 'NM_000546.6',
      placement: 'splitRight',
      allowedGappyness: 50,
      searchParams: {
        searchProgram: 'phmmer',
        blastDatabase: 'rp15',
        maxHits: 100,
      },
    },
  ],
})

// The sessions below load their alignments from files and open the RefSeq
// Select track, one transcript per gene, which holds the connected transcript.
const alignmentDisplay = {
  colorSchemeName: 'clustalx_protein_dynamic',
  labelsAlignRight: true,
  treeAreaWidth: 200,
}

// The Src-family kinases beside SRC. The Select transcript NM_198291.3 has the
// CDS of NM_005417.5, whose 536-residue translation is the SRC_HUMAN row
// (UniProt P12931).
export const proteinLinked = specUrl(
  {
    views: [
      {
        type: 'LinearGenomeView',
        id: 'lgv-src',
        assembly: 'hg38',
        loc: 'chr20:37,344,685-37,406,050',
        colorByCDS: true,
        tracks: ['hg38-ncbiRefSeqSelect'],
      },
      {
        type: 'MsaView',
        connectedViewId: 'lgv-src',
        connectedTranscript: 'NM_198291.3',
        querySeqName: 'SRC_HUMAN',
        msaFileLocation: { uri: `${DATA}/kinase.aln` },
        treeFileLocation: { uri: `${DATA}/kinase.nh` },
        ...alignmentDisplay,
      },
    ],
  },
  COMBINED_CONFIG,
)

// The RAF family on BRAF V600. The BRAF_HUMAN row (UniProt P15056) is the
// translation of NM_004333.6, whose codon 600 is chr7:140,753,335-140,753,337.
export const brafV600 = specUrl(
  {
    views: [
      {
        type: 'LinearGenomeView',
        id: 'lgv-braf',
        assembly: 'hg38',
        loc: 'chr7:140,753,295-140,753,377',
        highlight: ['chr7:140,753,335-140,753,337'],
        colorByCDS: true,
        tracks: ['hg38-ncbiRefSeqSelect', 'hg38-braf-clinvar-pathogenic'],
      },
      {
        type: 'MsaView',
        connectedViewId: 'lgv-braf',
        connectedTranscript: 'NM_004333.6',
        querySeqName: 'BRAF_HUMAN',
        highlights: [
          { row: 'BRAF_HUMAN', start: 600, end: 600, label: 'V600' },
        ],
        msaFileLocation: { uri: `${DATA}/braf.aln` },
        treeFileLocation: { uri: `${DATA}/braf.nh` },
        ...alignmentDisplay,
      },
    ],
  },
  COMBINED_CONFIG,
)

// p53 across vertebrates on R248. The `human` row is NP_000537.3, the
// translation of NM_000546.6, whose codon 248 is chr17:7,674,219-7,674,221.
export const tp53R248 = specUrl(
  {
    views: [
      {
        type: 'LinearGenomeView',
        id: 'lgv-tp53',
        assembly: 'hg38',
        loc: 'chr17:7,674,189-7,674,251',
        highlight: ['chr17:7,674,219-7,674,221'],
        colorByCDS: true,
        tracks: ['hg38-ncbiRefSeqSelect', 'hg38-tp53-clinvar-pathogenic'],
      },
      {
        type: 'MsaView',
        connectedViewId: 'lgv-tp53',
        connectedTranscript: 'NM_000546.6',
        querySeqName: 'human',
        highlights: [{ row: 'human', start: 248, end: 248, label: 'R248' }],
        msaFileLocation: { uri: `${DATA}/tp53-p53-orthologs.fa` },
        treeFileLocation: { uri: `${DATA}/tp53-p53.nh` },
        ...alignmentDisplay,
      },
    ],
  },
  COMBINED_CONFIG,
)

// TP53, the p53 alignment and the AlphaFold structure, opened on the nuclear
// export signal: residues 339-350 in UniProt P04637's MOTIF features, codons
// chr17:7,670,659-7,670,694. `initialSelection` is the same range in 0-based
// half-open structure residues. The ProteinView connects to the genome view
// its `connectedViewId` names and searches the tracks of `connectedView` for
// `transcriptId`.
const tp53MotifGenome = {
  assembly: 'hg38',
  loc: 'chr17:7,670,259-7,671,094',
  tracks: ['hg38-ncbiRefSeqSelect', 'hg38-tp53-clinvar-pathogenic'],
}
export const tp53Protein3d = specUrl(
  {
    views: [
      {
        type: 'LinearGenomeView',
        id: 'lgv-tp53-3d',
        ...tp53MotifGenome,
        colorByCDS: true,
      },
      {
        type: 'MsaView',
        connectedViewId: 'lgv-tp53-3d',
        connectedTranscript: 'NM_000546.6',
        querySeqName: 'human',
        highlights: [
          {
            row: 'human',
            start: 339,
            end: 350,
            label: 'Nuclear export signal',
          },
        ],
        msaFileLocation: { uri: `${DATA}/tp53-p53-orthologs.fa` },
        treeFileLocation: { uri: `${DATA}/tp53-p53.nh` },
        ...alignmentDisplay,
      },
      {
        type: 'ProteinView',
        connectedViewId: 'lgv-tp53-3d',
        connectedView: tp53MotifGenome,
        transcriptId: 'NM_000546.6',
        url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
        zoomToBaseLevel: false,
        height: 500,
        initialSelection: { start: 338, end: 350 },
      },
    ],
    layout: {
      direction: 'horizontal',
      children: [
        { views: [0, 1], size: 58 },
        { views: [2], size: 42 },
      ],
    },
  },
  COMBINED_CONFIG,
)
