/**
 * Reproducible builder for the real-data phylogeny examples.
 *
 * For each dataset in datasets/*.tsv this does, transparently and from scratch:
 *   1. fetch  — download each UniProt sequence by accession (REST API) and
 *               write a FASTA with clean row labels (datasets/<name>.tsv maps
 *               accession -> label).
 *   2. align  — run ClustalW to produce a multiple sequence alignment.
 *   3. tree   — run ClustalW again on the alignment to infer a neighbor-joining
 *               tree (Newick), so the example ships a real inferred phylogeny
 *               rather than a hand-drawn cladogram.
 * The aligned FASTA + Newick for every dataset are then written as string
 * constants into ../../packages/examples/src/examples/generatedData.ts, which
 * the gallery, figures and screenshot specs all import.
 *
 * Prerequisites: clustalw on PATH (Debian/Ubuntu: `apt install clustalw`;
 * macOS: `brew install clustal-w`) and network access to rest.uniprot.org.
 *
 * Usage:
 *   node scripts/examples-gen/generate.mjs            # all datasets
 *   node scripts/examples-gen/generate.mjs myd88 ace2 # a subset
 *
 * Intermediate files land in build/<name>/ (gitignored). Domain GFFs are NOT
 * produced here — InterProScan is a separate, slow, network step documented in
 * README.md and committed alongside the data.
 *
 * RNA structural datasets (kind: 'rna-stockholm', e.g. trna) skip fetch+align:
 * a committed Rfam seed subset (datasets/<name>.stock) already carries
 * #=GC SS_cons, so it is kept verbatim and only a tree is inferred from it and
 * embedded as #=GF NH. See README.md ("RNA structural alignments").
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(here, 'build')
const outFile = path.resolve(
  here,
  '../../packages/examples/src/examples/generatedData.ts',
)

// Each dataset names the constants it produces and whether the gallery should
// offer a `relativeTo` reference row (the first label in the .tsv, i.e. the
// first row of the alignment).
const datasets = [
  { name: 'myd88', varName: 'myd88', relativeToFirstRow: true },
  { name: 'globin', varName: 'globin', relativeToFirstRow: false },
  { name: 'ace2', varName: 'ace2', relativeToFirstRow: true },
  { name: 'opsins', varName: 'opsin', relativeToFirstRow: false },
  { name: 'histone_h4', varName: 'histoneH4', relativeToFirstRow: true },
  { name: 'cytochrome_c', varName: 'cytochromeC', relativeToFirstRow: false },
  { name: 'prestin', varName: 'prestin', relativeToFirstRow: false },
  { name: 'p53', varName: 'p53', relativeToFirstRow: true },
  { name: 'ef1a', varName: 'ef1a', relativeToFirstRow: false },
  { name: 'insulin', varName: 'insulin', relativeToFirstRow: true },
  // RNA structural alignment: the input is a committed Rfam seed subset
  // (datasets/trna.stock) that already carries #=GC SS_cons. It is NOT
  // re-aligned (that would break the SS column correspondence); only a tree is
  // inferred from it and embedded as #=GF NH. Emits a single Stockholm string.
  { name: 'trna', varName: 'trna', kind: 'rna-stockholm' },
  { name: 'hammerhead', varName: 'hammerhead', kind: 'rna-stockholm' },
]

function readDataset(name) {
  const tsv = fs.readFileSync(path.join(here, 'datasets', `${name}.tsv`), 'utf8')
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

// ClustalW outputs FASTA wrapped at 60 cols; join each record onto one line so
// the committed string is one header + one sequence line per row.
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
  // 1. fetch — handled by caller (async); written to input.fasta
  // 2. align
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
  // 3. neighbor-joining tree from the alignment (writes aligned.ph, Newick)
  clustalw(
    ['-INFILE=aligned.afa', '-TREE', '-TYPE=PROTEIN', '-OUTPUTTREE=phylip'],
    dir,
  )

  const msa = unwrapFasta(fs.readFileSync(path.join(dir, 'aligned.afa'), 'utf8'))
  const tree = fs
    .readFileSync(path.join(dir, 'aligned.ph'), 'utf8')
    .replace(/\s+/g, '')
  const nSeqs = (msa.match(/^>/gm) || []).length
  const width = msa.split('\n')[1].length
  console.log(`  aligned ${nSeqs} sequences, ${width} columns`)
  return { msa, tree }
}

// RNA path: the committed datasets/<name>.stock is already a structural
// alignment with #=GC SS_cons. We keep it verbatim (so SS columns stay aligned)
// and only infer a neighbor-joining tree from its sequences with ClustalW
// (-TYPE=DNA), inject it as #=GF NH, and return the whole Stockholm as the MSA
// constant. U is mapped to T and Rfam insert gaps (.) to - purely for the tree
// inference; the emitted alignment keeps its original RNA letters and SS_cons.
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
  // Inject the inferred tree as #=GF NH right after the STOCKHOLM header, the
  // same place the parser (StockholmMSA.getTree) reads it from.
  const out = lines.flatMap((l, i) =>
    i === 0 ? [l, `#=GF NH ${tree}`] : [l],
  )
  const msa = out.join('\n')
  console.log(`  ${seqRows.length} sequences, ${seqRows[0].seq.length} columns`)
  return { msa }
}

function tsLiteral(s) {
  if (s.includes('`') || s.includes('${')) {
    throw new Error('unexpected backtick/template char in generated data')
  }
  return `\`${s}\``
}

// --fetch re-downloads sequences from UniProt and overwrites the committed
// datasets/<name>.fasta snapshot. By default we align the committed snapshot, so
// regeneration is fully deterministic and offline, and the exact sequences used
// are visible in git rather than being whatever UniProt serves today.
const doFetch = process.argv.includes('--fetch')
const selected = process.argv.slice(2).filter(a => !a.startsWith('--'))
const todo = selected.length
  ? datasets.filter(d => selected.includes(d.name))
  : datasets

const results = {}
for (const d of todo) {
  const dir = path.join(buildDir, d.name)
  fs.mkdirSync(dir, { recursive: true })
  if (d.kind === 'rna-stockholm') {
    console.log(`\n[${d.name}] inferring tree from datasets/${d.name}.stock`)
    results[d.varName] = { ...buildRnaStockholm(d), def: d }
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
  results[d.varName] = { ...buildOne(d), def: d }
}

// Emit / update the generated TS file. When run on a subset, merge with the
// existing file so untouched datasets keep their constants.
const header = `// AUTO-GENERATED by scripts/examples-gen/generate.mjs — do not edit by hand.
// Real protein-family alignments + neighbor-joining trees, built reproducibly
// from UniProt accessions with ClustalW, plus RNA structural alignments from
// Rfam seeds (Stockholm with #=GC SS_cons, tree inferred). See
// scripts/examples-gen/README.md for the full method (which accessions, how they
// are fetched, aligned and the tree inferred) and how to add or regenerate a
// dataset.
`

const blocks = []
for (const [varName, { msa, tree, def }] of Object.entries(results)) {
  // RNA datasets embed their tree in the Stockholm (#=GF NH) and emit only the
  // MSA constant; protein datasets emit a separate Newick Tree constant.
  const src =
    def.kind === 'rna-stockholm'
      ? `// source: scripts/examples-gen/datasets/${def.name}.stock`
      : `// accessions: scripts/examples-gen/datasets/${def.name}.tsv`
  let block = `${src}\nexport const ${varName}MSA = ${tsLiteral(msa)}\n`
  if (tree !== undefined) {
    block += `\nexport const ${varName}Tree = ${tsLiteral(tree)}\n`
  }
  // Optional committed InterProScan domain GFF (produced out-of-band; see
  // README.md). Sequence ids in it match the row labels in datasets/<name>.tsv.
  const gffPath = path.join(here, 'datasets', `${def.name}-domains.gff`)
  if (fs.existsSync(gffPath)) {
    const gff = fs.readFileSync(gffPath, 'utf8').replace(/\s*$/, '\n')
    block += `\nexport const ${varName}DomainsGFF = ${tsLiteral(gff)}\n`
  }
  blocks.push(block)
}

// Preserve constants for datasets not regenerated this run.
let existing = ''
if (fs.existsSync(outFile)) {
  existing = fs.readFileSync(outFile, 'utf8')
}
const keep = []
for (const d of datasets) {
  if (results[d.varName]) {
    continue
  }
  const re = new RegExp(
    `(?:// (?:accessions|source):[^\\n]*\\n)?export const ${d.varName}MSA = \`[\\s\\S]*?\`\\n(?:\\nexport const ${d.varName}Tree = \`[\\s\\S]*?\`\\n)?(?:\\nexport const ${d.varName}DomainsGFF = \`[\\s\\S]*?\`\\n)?`,
  )
  const m = existing.match(re)
  if (m) {
    keep.push(m[0])
  }
}

fs.writeFileSync(outFile, `${header}\n${[...keep, ...blocks].join('\n')}`)
console.log(`\nwrote ${outFile}`)
