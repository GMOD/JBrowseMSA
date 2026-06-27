// Regenerates the BRAF ClinVar track data under packages/app/public/data/:
//   braf-clinvar-pathogenic.vcf.gz(.tbi) — ClinVar pathogenic/likely-pathogenic
//                            variants across the BRAF locus
//
// Mirrors scripts/tp53-protein-link/build-data.mjs (ClinVar portion): the BRAF
// genome-link example (generate.mjs) shows this track in the LinearGenomeView so
// the V600E pathogenic-variant pileup sits over the same codon the conserved
// alignment column marks. The BRAF alignment + tree are built separately by
// build-alignment.mjs.
//
// Usage:  node scripts/braf-protein-link/build-clinvar.mjs
// Requires: tabix, bgzip on PATH; network access to NCBI.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const work = join(here, 'work')
const dataDir = join(here, '..', '..', 'packages', 'app', 'public', 'data')

const CLINVAR =
  'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz'
// BRAF locus on GRCh38 (ClinVar uses bare refNames, no "chr")
const REGION = '7:140713328-140924929'

mkdirSync(work, { recursive: true })

// Keep the VCF header + only variants whose primary germline classification is
// Pathogenic or Likely_pathogenic (drops Benign / Uncertain / Conflicting), so
// the genome track shows the disease-variant pileup — same filter as TP53.
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
const filtered = join(work, 'braf-clinvar-pathogenic.vcf')
writeFileSync(filtered, kept.join('\n'))
const out = join(dataDir, 'braf-clinvar-pathogenic.vcf.gz')
execFileSync('bash', [
  '-c',
  `bgzip -c ${filtered} > ${out} && tabix -p vcf -f ${out}`,
])

const variantCount = kept.filter(l => l && !l.startsWith('#')).length
console.error(`wrote ${out}: ${variantCount} ClinVar pathogenic variants`)
