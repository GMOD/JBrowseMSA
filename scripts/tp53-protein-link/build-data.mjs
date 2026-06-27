// Regenerates the TP53 example data under packages/app/public/data/:
//   tp53-p53-orthologs.fa  — p53 protein alignment across 13 vertebrates
//   tp53-p53.nh            — its ClustalW guide tree
//   tp53-clinvar-pathogenic.vcf.gz(.tbi) — ClinVar pathogenic/likely-pathogenic
//                            variants across the TP53 locus
//
// This is the data the BRAF/SRC-style protein<->genome link uses (built by
// generate.mjs). The `human` row is RefSeq NP_000537.3, the protein of the
// transcript the link maps to (NM_000546.6), so residue i lines up with codon i.
//
// Usage:  node scripts/tp53-protein-link/build-data.mjs
// Requires: clustalw, tabix, bgzip, curl on PATH; network access to NCBI.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const work = join(here, 'work')
const dataDir = join(here, '..', '..', 'packages', 'app', 'public', 'data')

// One p53 ortholog per species, keyed by the display name that becomes the
// alignment row. `human` is the canonical RefSeq protein NP_000537.3 (= the
// product of NM_000546.6, the transcript the genome link maps to); the rest are
// the current NCBI RefSeq proteins for representative vertebrates spanning ~430
// Myr, chosen to show how deeply p53's DNA-binding core (and R248) is conserved.
const SPECIES = {
  human: 'NP_000537.3',
  macaque: 'XP_045231359.1',
  cow: 'XP_027375188.1',
  pig: 'XP_047612858.1',
  horse: 'NP_001189334.1',
  dog: 'XP_025284307.1',
  elephant: 'XP_010594888.1',
  mouse: 'XP_030101782.1',
  opossum: 'XP_056673571.1',
  chicken: 'NP_990595.1',
  zebrafish: 'XP_073805887.1',
  frog: 'NP_001001903.1',
  anole: 'XP_062840611.1',
}

// TP53 locus on GRCh38 (the ClinVar window the figure pulls from)
const CLINVAR =
  'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'
const REGION = '17:7668134-7687471'

mkdirSync(work, { recursive: true })

const efetch = id =>
  execFileSync('curl', [
    '-sf',
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=${id}&rettype=fasta&retmode=text`,
  ]).toString()

const fasta = Object.entries(SPECIES)
  .map(([name, acc]) => {
    const seq = efetch(acc)
      .split('\n')
      .filter(l => l && !l.startsWith('>'))
      .join('')
    console.error(`${name} (${acc}): ${seq.length} aa`)
    return `>${name}\n${seq.replace(/(.{60})/g, '$1\n').replace(/\n$/, '')}`
  })
  .join('\n')

const inFile = join(work, 'p53.fa')
writeFileSync(inFile, fasta + '\n')

const alnFile = join(work, 'p53.aln.fa')
execFileSync(
  'clustalw',
  [`-infile=${inFile}`, `-outfile=${alnFile}`, '-output=fasta'],
  { stdio: 'inherit' },
)
// Neighbor-joining tree from the alignment (.ph), not the .dnd progressive guide
execFileSync('clustalw', [`-infile=${alnFile}`, '-tree'], { stdio: 'inherit' })
writeFileSync(join(dataDir, 'tp53-p53-orthologs.fa'), readFileSync(alnFile))
writeFileSync(
  join(dataDir, 'tp53-p53.nh'),
  readFileSync(join(work, 'p53.aln.ph'), 'utf8').replace(/\s+/g, '') + '\n',
)

// ClinVar: keep the VCF header + only variants whose primary germline
// classification is Pathogenic or Likely_pathogenic (drops Benign / Uncertain /
// Conflicting), so the genome track shows the disease-variant pileup.
const vcf = execFileSync('tabix', ['-h', CLINVAR, REGION], {
  encoding: 'utf8',
  maxBuffer: 1 << 28,
})
const kept = vcf.split('\n').filter(line => {
  const keepHeader = line.startsWith('#')
  const m = /CLNSIG=([^;]+)/.exec(line)
  const sig = m?.[1] ?? ''
  const pathogenic =
    sig === 'Pathogenic' ||
    sig === 'Likely_pathogenic' ||
    sig.startsWith('Pathogenic/Likely_pathogenic')
  return keepHeader || pathogenic
})
const filtered = join(work, 'tp53-clinvar-pathogenic.vcf')
writeFileSync(filtered, kept.join('\n'))
const out = join(dataDir, 'tp53-clinvar-pathogenic.vcf.gz')
execFileSync('bash', [
  '-c',
  `bgzip -c ${filtered} > ${out} && tabix -p vcf -f ${out}`,
])

const variantCount = kept.filter(l => l && !l.startsWith('#')).length
console.error(
  `wrote ${dataDir}: alignment + tree + ${variantCount} ClinVar variants`,
)
