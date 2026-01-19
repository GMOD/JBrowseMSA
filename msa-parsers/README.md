# msa-parsers

A TypeScript library for parsing multiple sequence alignment (MSA) files and related formats.

Part of [react-msaview](../) (JBrowseMSA).

## Installation

```bash
npm install msa-parsers
# or
yarn add msa-parsers
```

## Supported formats

### MSA formats

- **Stockholm** - Stockholm format (used by Pfam, Rfam)
- **FASTA** - Aligned FASTA format
- **Clustal** - ClustalW/ClustalX format
- **A3M** - A3M format (used by HHsuite)
- **EMF** - Ensembl Multi Format

### Other formats

- **Newick** - Phylogenetic tree format
- **GFF** - General Feature Format (with InterProScan conversion utilities)

## Usage

### Parsing MSA files

The `parseMSA` function auto-detects the format:

```typescript
import { parseMSA } from 'msa-parsers'

const msa = parseMSA(fileContents)

// Get sequence names
const names = msa.getNames()

// Get a specific row
const sequence = msa.getRow('sequence_name')

// Get alignment width
const width = msa.getWidth()

// Get phylogenetic tree (if available)
const tree = msa.getTree()
```

### Using specific parsers

```typescript
import { FastaMSA, StockholmMSA, ClustalMSA } from 'msa-parsers'

const fasta = new FastaMSA(fastaContents)
const stockholm = new StockholmMSA(stockholmContents)
const clustal = new ClustalMSA(clustalContents)
```

### Parsing Newick trees

```typescript
import { parseNewick, generateNodeIds } from 'msa-parsers'

const tree = parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);')
const treeWithIds = generateNodeIds(tree)
```

### GFF and InterProScan utilities

```typescript
import { parseGFF, gffToInterProResults, interProToGFF } from 'msa-parsers'

// Parse GFF file
const records = parseGFF(gffContents)

// Convert between GFF and InterProScan formats
const interProResults = gffToInterProResults(records)
const gffString = interProToGFF(interProResults, seqId)
```

## License

MIT
