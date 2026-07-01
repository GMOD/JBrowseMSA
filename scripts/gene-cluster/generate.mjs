/**
 * Generate the gene-arrow-map demo: a small, illustrative gene cluster aligned
 * across several genomes, in the spirit of the gggenes R package's own
 * `example_genes` dataset (which is likewise synthetic, "for example purposes
 * only"). It exists to exercise react-msaview's strand-aware gene-arrow
 * rendering — the same overlay machinery that draws InterProScan domains and the
 * F12 exon structure, but with gene-level features that carry a strand.
 *
 * What it shows, and why each piece is here:
 *  - consistent color per gene down the columns (Name=<gene>, like F12 exons),
 *  - +/- strand drawn as a left/right arrowhead (genC, genE point left),
 *  - two inversions (genC in Genome_4, genE in Genome_6) -> the arrow flips,
 *  - one deletion (genB in Genome_5) -> the gene's columns become a gap and the
 *    gene drops out, yet the *downstream* genes stay column-aligned. That last
 *    point is the whole reason to do this aligned rather than as free-floating
 *    gggenes facets: vertical homology is exact, not a cosmetic shift.
 *
 * Deterministic (seeded PRNG), so re-running reproduces byte-identical output.
 * Run:  node scripts/gene-cluster/generate.mjs
 * Writes the MSA (Stockholm + embedded tree) and the gene GFF next to this file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// deterministic PRNG so the demo data never drifts between runs
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(0x5eed)

const BASES = ['A', 'C', 'G', 'T']
const COMPLEMENT = { A: 'T', C: 'G', G: 'C', T: 'A', '-': '-' }
const randomBase = () => BASES[Math.floor(rng() * 4)]

// reference cluster: gene order is conserved across genomes (colinear), which is
// exactly the regime where an alignment-anchored arrow map is meaningful
const SPACER = 24
const GENES = [
  { name: 'genA', strand: 1, len: 180 },
  { name: 'genB', strand: 1, len: 120 },
  { name: 'genC', strand: -1, len: 150 },
  { name: 'genD', strand: 1, len: 210 },
  { name: 'genE', strand: -1, len: 90 },
]

// lay genes out along the reference with intergenic spacers; record each gene's
// [colStart, colEnd) so every genome shares the same columns for the same gene
const layout = []
let col = SPACER
for (const g of GENES) {
  layout.push({ ...g, colStart: col, colEnd: col + g.len })
  col += g.len + SPACER
}
const totalCols = col

const reference = Array.from({ length: totalCols }, randomBase)

// per-genome variation. `mut` = substitution rate; `ops` rewrites a gene in this
// genome (invert = reverse-complement + flip strand; delete = gap it out).
const GENOMES = [
  { name: 'Genome_1', mut: 0, ops: {} },
  { name: 'Genome_2', mut: 0.06, ops: {} },
  { name: 'Genome_3', mut: 0.08, ops: {} },
  { name: 'Genome_4', mut: 0.07, ops: { genC: 'invert' } },
  { name: 'Genome_5', mut: 0.08, ops: { genB: 'delete' } },
  { name: 'Genome_6', mut: 0.09, ops: { genE: 'invert' } },
]

function nonGapCount(arr, end) {
  let n = 0
  for (let i = 0; i < end; i++) {
    if (arr[i] !== '-') {
      n += 1
    }
  }
  return n
}

const msaRows = []
const gffLines = [
  '##gff-version 3',
  '# gene-arrow-map demo: a synthetic colinear gene cluster across 6 genomes — ' +
    'see scripts/gene-cluster/generate.mjs (gggenes-style, for illustration)',
]

for (const genome of GENOMES) {
  const row = reference.slice()
  for (let i = 0; i < row.length; i++) {
    if (rng() < genome.mut) {
      let b = randomBase()
      while (b === row[i]) {
        b = randomBase()
      }
      row[i] = b
    }
  }

  for (const gene of layout) {
    const op = genome.ops[gene.name]
    if (op === 'delete') {
      for (let i = gene.colStart; i < gene.colEnd; i++) {
        row[i] = '-'
      }
    } else if (op === 'invert') {
      const seg = row
        .slice(gene.colStart, gene.colEnd)
        .reverse()
        .map(b => COMPLEMENT[b])
      for (let i = 0; i < seg.length; i++) {
        row[gene.colStart + i] = seg[i]
      }
    }
  }

  for (const gene of layout) {
    const op = genome.ops[gene.name]
    if (op !== 'delete') {
      const start = nonGapCount(row, gene.colStart) + 1
      const len = gene.colEnd - gene.colStart
      const strand =
        op === 'invert'
          ? gene.strand === 1
            ? '-'
            : '+'
          : gene.strand === 1
            ? '+'
            : '-'
      gffLines.push(
        `${genome.name}\tdemo\tgene\t${start}\t${start + len - 1}\t.\t${strand}\t.\t` +
          `ID=${genome.name}.${gene.name};Name=${gene.name}`,
      )
    }
  }

  msaRows.push({ name: genome.name, seq: row.join('') })
}

const tree =
  '((Genome_1:0.05,Genome_2:0.06):0.03,((Genome_3:0.04,Genome_4:0.05):0.02,' +
  '(Genome_5:0.07,Genome_6:0.06):0.03):0.02);'

const pad = Math.max(...msaRows.map(r => r.name.length)) + 2
const stockholm = [
  '# STOCKHOLM 1.0',
  `#=GF NH ${tree}`,
  ...msaRows.map(r => `${r.name.padEnd(pad)}${r.seq}`),
  '//',
].join('\n')
const gff = gffLines.join('\n')

fs.writeFileSync(path.join(here, 'gene-cluster.stock'), `${stockholm}\n`)
fs.writeFileSync(path.join(here, 'gene-cluster.gff'), `${gff}\n`)
console.log(
  `wrote gene-cluster.stock (${stockholm.length} B, ${totalCols} cols) and ` +
    `gene-cluster.gff (${gffLines.length - 2} gene features)`,
)
