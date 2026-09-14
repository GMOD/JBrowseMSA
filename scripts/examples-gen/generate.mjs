/**
 * Builds the real-data phylogeny examples from datasets/*.tsv:
 *   1. fetch: download each UniProt sequence by accession and write a FASTA
 *      with the row labels datasets/<name>.tsv maps each accession to.
 *   2. align: run ClustalW.
 *   3. tree: run ClustalW again on the alignment to infer a neighbor-joining
 *      tree (Newick).
 * The aligned FASTA and Newick for every dataset go to
 * ../../packages/examples/data as plain files, which the gallery, the figures
 * and the screenshot specs read.
 *
 * Prerequisites: clustalw on PATH (Debian/Ubuntu: `apt install clustalw`;
 * macOS: `brew install clustal-w`) and network access to rest.uniprot.org.
 *
 * Usage:
 *   node scripts/examples-gen/generate.mjs            # all datasets
 *   node scripts/examples-gen/generate.mjs myd88 ace2 # a subset
 *
 * Intermediate files go to build/<name>/ (gitignored). This script copies the
 * committed datasets/<name>-domains.gff but does not produce it; README.md
 * documents the `react-msaview-cli interpro` command that does.
 *
 * RNA structural datasets (kind: 'rna-stockholm', e.g. trna) skip fetch and
 * align: the committed Rfam seed subset (datasets/<name>.stock) already carries
 * #=GC SS_cons, so the script keeps it verbatim and embeds an inferred tree as
 * #=GF NH. See README.md ("RNA structural alignments").
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(here, 'build')
const outDir = path.resolve(here, '../../packages/examples/data')

const datasets = [
  { name: 'myd88' },
  { name: 'globin' },
  { name: 'ace2' },
  { name: 'opsins' },
  { name: 'histone_h4' },
  { name: 'cytochrome_c' },
  { name: 'prestin' },
  { name: 'p53' },
  { name: 'ef1a' },
  { name: 'insulin' },
  { name: 'aquaporin' },
  { name: 'hox' },
  { name: 'nlrp1' },
  { name: 'kinase' },
  // Rfam seed subsets with #=GC SS_cons; re-aligning would break the SS_cons
  // column correspondence, so only a tree is inferred and embedded as #=GF NH.
  { name: 'trna', kind: 'rna-stockholm' },
  { name: 'hammerhead', kind: 'rna-stockholm' },
  { name: 'corona_fse', kind: 'rna-stockholm' },
]

function readDataset(name) {
  const tsv = fs.readFileSync(
    path.join(here, 'datasets', `${name}.tsv`),
    'utf8',
  )
  return tsv
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const [accession, label] = l.split('\t')
      return { accession, label }
    })
}

async function fetchFasta(rows) {
  const parts = []
  for (const { accession, label } of rows) {
    const res = await fetch(
      `https://rest.uniprot.org/uniprotkb/${accession}.fasta`,
    )
    if (!res.ok) {
      throw new Error(`fetch ${accession} failed: ${res.status}`)
    }
    const seq = (await res.text()).split('\n').slice(1).join('')
    if (!seq) {
      throw new Error(`empty sequence for ${accession}`)
    }
    parts.push(`>${label}\n${seq}`)
    console.log(`  fetched ${label} (${accession}, ${seq.length} aa)`)
  }
  return `${parts.join('\n')}\n`
}

function clustalw(args, cwd) {
  execFileSync('clustalw', args, { cwd, stdio: 'pipe' })
}

// ClustalW wraps FASTA at 60 columns; the committed file has one sequence line
// per row.
function unwrapFasta(afa) {
  const records = []
  let cur = null
  for (const line of afa.split('\n')) {
    if (line.startsWith('>')) {
      cur = { head: line, seq: '' }
      records.push(cur)
    } else if (cur) {
      cur.seq += line.trim()
    }
  }
  return `${records.map(r => `${r.head}\n${r.seq}`).join('\n')}\n`
}

function buildOne({ name }) {
  const dir = path.join(buildDir, name)
  // the caller writes input.fasta
  clustalw(
    [
      '-INFILE=input.fasta',
      '-ALIGN',
      '-TYPE=PROTEIN',
      '-OUTPUT=FASTA',
      '-OUTFILE=aligned.afa',
    ],
    dir,
  )
  // writes aligned.ph (Newick)
  clustalw(
    ['-INFILE=aligned.afa', '-TREE', '-TYPE=PROTEIN', '-OUTPUTTREE=phylip'],
    dir,
  )

  const msa = unwrapFasta(
    fs.readFileSync(path.join(dir, 'aligned.afa'), 'utf8'),
  )
  const tree = fs
    .readFileSync(path.join(dir, 'aligned.ph'), 'utf8')
    .replace(/\s+/g, '')
  const nSeqs = (msa.match(/^>/gm) || []).length
  const width = msa.split('\n')[1].length
  console.log(`  aligned ${nSeqs} sequences, ${width} columns`)
  return { msa, tree }
}

// Keeps datasets/<name>.stock verbatim and adds a ClustalW (-TYPE=DNA)
// neighbor-joining tree as #=GF NH. The tree input maps U to T and Rfam insert
// gaps (.) to -; the written alignment keeps its RNA letters and SS_cons.
function buildRnaStockholm({ name }) {
  const dir = path.join(buildDir, name)
  const src = fs.readFileSync(
    path.join(here, 'datasets', `${name}.stock`),
    'utf8',
  )
  const lines = src.split('\n')
  const seqRows = lines
    .filter(l => l && !l.startsWith('#') && l !== '//')
    .map(l => {
      const i = l.search(/\s/)
      return { id: l.slice(0, i), seq: l.slice(i).replace(/\s/g, '') }
    })
  const treeFasta = seqRows
    .map(r => `>${r.id}\n${r.seq.replace(/\./g, '-').replace(/[Uu]/g, 'T')}`)
    .join('\n')
  fs.writeFileSync(path.join(dir, 'input.fasta'), `${treeFasta}\n`)
  clustalw(
    ['-INFILE=input.fasta', '-TREE', '-TYPE=DNA', '-OUTPUTTREE=phylip'],
    dir,
  )
  const tree = fs
    .readFileSync(path.join(dir, 'input.ph'), 'utf8')
    .replace(/\s+/g, '')
  // StockholmMSA.getTree reads #=GF NH from right after the header
  const out = lines.flatMap((l, i) => (i === 0 ? [l, `#=GF NH ${tree}`] : [l]))
  const msa = out.join('\n')
  console.log(`  ${seqRows.length} sequences, ${seqRows[0].seq.length} columns`)
  return { msa }
}

// --fetch re-downloads sequences from UniProt and overwrites the committed
// datasets/<name>.fasta snapshot. Without it the script aligns the snapshot, so
// regeneration is deterministic and offline.
const doFetch = process.argv.includes('--fetch')
const selected = process.argv.slice(2).filter(a => !a.startsWith('--'))
const todo = selected.length
  ? datasets.filter(d => selected.includes(d.name))
  : datasets

fs.mkdirSync(outDir, { recursive: true })

function write(file, content) {
  fs.writeFileSync(path.join(outDir, file), content)
  console.log(`  wrote data/${file} (${content.length} bytes)`)
}

for (const d of todo) {
  const dir = path.join(buildDir, d.name)
  fs.mkdirSync(dir, { recursive: true })
  if (d.kind === 'rna-stockholm') {
    console.log(`\n[${d.name}] inferring tree from datasets/${d.name}.stock`)
    write(`${d.name}.stock`, buildRnaStockholm(d).msa)
    continue
  }
  const fastaPath = path.join(here, 'datasets', `${d.name}.fasta`)
  let inputFasta
  if (doFetch || !fs.existsSync(fastaPath)) {
    const rows = readDataset(d.name)
    console.log(`\n[${d.name}] fetching ${rows.length} sequences from UniProt`)
    inputFasta = await fetchFasta(rows)
    fs.writeFileSync(fastaPath, inputFasta)
  } else {
    console.log(
      `\n[${d.name}] aligning committed datasets/${d.name}.fasta (use --fetch to refresh)`,
    )
    inputFasta = fs.readFileSync(fastaPath, 'utf8')
  }
  fs.writeFileSync(path.join(dir, 'input.fasta'), inputFasta)
  const { msa, tree } = buildOne(d)
  write(`${d.name}.aln`, msa)
  write(`${d.name}.nh`, `${tree}\n`)
  // `react-msaview-cli interpro` produces the domain GFF (see README.md); its
  // seq_ids are the row labels.
  const gffPath = path.join(here, 'datasets', `${d.name}-domains.gff`)
  if (fs.existsSync(gffPath)) {
    write(
      `${d.name}-domains.gff`,
      fs.readFileSync(gffPath, 'utf8').replace(/\s*$/, '\n'),
    )
  }
}

console.log(`\ndone: ${todo.length} dataset(s) in ${outDir}`)
