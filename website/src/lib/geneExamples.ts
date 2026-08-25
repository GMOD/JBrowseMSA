import type { Species } from './speciesGenes'

export interface Example {
  symbol: string
  note: string
}

// Curated per species. Human picks all sit in the 100-way index and span tumour
// suppressors, drug targets, disease genes, and size extremes (tiny HBB vs.
// titin). The others are textbook genes for each organism, chosen to resolve in
// NCBI and carry an AlphaFold structure.
const EXAMPLES_BY_TAXON: Record<number, Example[]> = {
  9606: [
    {
      symbol: 'TP53',
      note: 'Tumour suppressor — mutated in ~half of all cancers',
    },
    {
      symbol: 'KRAS',
      note: 'Oncogene — small and almost invariant across vertebrates',
    },
    { symbol: 'BRAF', note: 'Melanoma V600E kinase' },
    { symbol: 'EGFR', note: 'Receptor tyrosine kinase and major drug target' },
    { symbol: 'PTEN', note: 'Tumour-suppressor phosphatase' },
    {
      symbol: 'BRCA1',
      note: 'Hereditary breast/ovarian cancer — large multi-exon gene',
    },
    { symbol: 'CFTR', note: 'Cystic fibrosis chloride channel' },
    { symbol: 'HBB', note: 'β-globin (sickle cell) — tiny 3-exon gene' },
    {
      symbol: 'TTN',
      note: 'Titin — the largest human gene, extreme intron collapse',
    },
    { symbol: 'SOD1', note: 'ALS — small and highly conserved' },
  ],
  10090: [
    { symbol: 'Trp53', note: 'p53 tumour suppressor — the mouse orthologue' },
    { symbol: 'Shh', note: 'Sonic hedgehog — limb and neural patterning' },
    { symbol: 'Brca1', note: 'Breast-cancer susceptibility gene' },
    { symbol: 'Mecp2', note: 'Rett syndrome — X-linked chromatin regulator' },
    { symbol: 'Pax6', note: 'Master eye-development transcription factor' },
    { symbol: 'Cftr', note: 'Cystic fibrosis chloride channel' },
  ],
  7955: [
    {
      symbol: 'shha',
      note: 'Sonic hedgehog a — fin and floor-plate signalling',
    },
    { symbol: 'pax6a', note: 'Eye-development transcription factor' },
    { symbol: 'tp53', note: 'p53 tumour suppressor' },
    { symbol: 'myca', note: 'MYC proto-oncogene a' },
    { symbol: 'sox2', note: 'Stem-cell / neural transcription factor' },
  ],
  7227: [
    { symbol: 'Antp', note: 'Antennapedia — Hox homeotic gene' },
    { symbol: 'Ubx', note: 'Ultrabithorax — Hox gene' },
    { symbol: 'wg', note: 'wingless — founding Wnt ligand' },
    { symbol: 'N', note: 'Notch — receptor of the Notch pathway' },
    { symbol: 'dpp', note: 'decapentaplegic — a BMP morphogen' },
    { symbol: 'w', note: 'white — the classic eye-colour gene' },
  ],
  6239: [
    { symbol: 'lin-12', note: 'Notch-family receptor — cell-fate decisions' },
    { symbol: 'unc-54', note: 'Muscle myosin heavy chain' },
    { symbol: 'daf-16', note: 'FOXO transcription factor — lifespan' },
    { symbol: 'let-60', note: 'Ras orthologue — vulval induction' },
  ],
  3702: [
    { symbol: 'AG', note: 'AGAMOUS — floral organ identity (MADS-box)' },
    { symbol: 'LFY', note: 'LEAFY — floral meristem identity' },
    { symbol: 'AP1', note: 'APETALA1 — floral organ identity' },
    { symbol: 'CO', note: 'CONSTANS — photoperiodic flowering' },
    { symbol: 'PHYB', note: 'Phytochrome B — red-light photoreceptor' },
  ],
  559292: [
    {
      symbol: 'CDC28',
      note: 'Cyclin-dependent kinase — the cell-cycle engine',
    },
    { symbol: 'ACT1', note: 'Actin — highly conserved cytoskeleton' },
    { symbol: 'GAL4', note: 'Transcriptional activator (two-hybrid fame)' },
    { symbol: 'RAD51', note: 'Homologous-recombination recombinase' },
    { symbol: 'TUB1', note: 'Alpha-tubulin' },
  ],
}

export function examplesFor(species: Species): Example[] {
  return EXAMPLES_BY_TAXON[species.taxId] ?? []
}
