// Regenerates packages/app/public/data/{braf.aln,braf.nh} from scratch: fetches
// the RAF-family sequences from UniProt by accession and aligns them with
// ClustalW. This is the data the BRAF V600E genome-browser example aligns; the
// link itself is built by generate.mjs, which reads braf.aln to locate the V600
// column (so the two stay in sync — no hand-maintained column index).
//
// Usage:  node scripts/braf-protein-link/build-alignment.mjs
// Requires: clustalw on PATH, and network access to rest.uniprot.org.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const work = join(here, 'work')
const dataDir = join(here, '..', '..', 'packages', 'app', 'public', 'data')

// RAF family: the three human paralogs + BRAF in mouse/chicken + the Drosophila
// ortholog, keyed by UniProt entry name -> reviewed (Swiss-Prot) accession. The
// entry name becomes the FASTA/alignment row name (BRAF_HUMAN is the query row
// the protein<->genome link maps to RefSeq NM_004333.6).
const SEQUENCES = {
  BRAF_HUMAN: 'P15056',
  BRAF_MOUSE: 'P28028',
  BRAF_CHICK: 'Q04982',
  ARAF_HUMAN: 'P10398',
  RAF1_HUMAN: 'P04049',
  KRAF1_DROME: 'P11346',
}

mkdirSync(work, { recursive: true })

const fasta = Object.entries(SEQUENCES)
  .map(([name, acc]) => {
    const res = execFileSync('curl', [
      '-sf',
      `https://rest.uniprot.org/uniprotkb/${acc}.fasta`,
    ])
    const seq = res
      .toString()
      .split('\n')
      .filter(l => l && !l.startsWith('>'))
      .join('')
    console.error(`${name} (${acc}): ${seq.length} aa`)
    return `>${name}\n${seq.replace(/(.{60})/g, '$1\n').replace(/\n$/, '')}`
  })
  .join('\n')

const inFile = join(work, 'raf-family.fa')
writeFileSync(inFile, fasta + '\n')

// ClustalW writes the alignment (clustal format) and a Newick guide tree (.dnd)
const alnFile = join(work, 'raf-family.aln')
const dndFile = join(work, 'raf-family.dnd')
execFileSync(
  'clustalw',
  [`-infile=${inFile}`, `-outfile=${alnFile}`, '-output=clustal'],
  { stdio: 'inherit' },
)

writeFileSync(join(dataDir, 'braf.aln'), readFileSync(alnFile))
// braf.nh is the .dnd guide tree collapsed to a single line
const tree = readFileSync(dndFile, 'utf8').replace(/\s+/g, '') + '\n'
writeFileSync(join(dataDir, 'braf.nh'), tree)
console.error(`wrote ${dataDir}/braf.aln and braf.nh`)
