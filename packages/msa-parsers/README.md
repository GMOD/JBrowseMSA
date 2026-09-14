# msa-parsers

A TypeScript library for parsing multiple sequence alignment (MSA) files and
related formats.

Part of [react-msaview](../) (JBrowseMSA).

## Installation

```bash
pnpm add msa-parsers
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

`parseMSA` sniffs the format from the content, not from the file name. FASTA and
A3M share a leading `>`, so telling them apart is heuristic; pass a format as the
third argument to override the guess:

```typescript
import { parseMSA } from 'msa-parsers'

const msa = parseMSA(fileContents)
const stockholm = parseMSA(fileContents, 0, 'stockholm')

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
// a Stockholm file can hold several alignments; the second argument picks one
const stockholm = new StockholmMSA(stockholmContents, 0)
const clustal = new ClustalMSA(clustalContents)
```

### Parsing Newick trees

```typescript
import { parseNewick, generateNodeIds } from 'msa-parsers'

const tree = parseNewick('(A:0.1,B:0.2,(C:0.3,D:0.4):0.5);')
const treeWithIds = generateNodeIds(tree)
```

### GFF and InterProScan utilities

Every source of overlay annotations converts to one flat list of `Annotation` (a
row name, an accession, a name, a description and a 1-based inclusive interval),
and the viewer draws that list.

```typescript
import {
  annotationsToGFF,
  gffToAnnotations,
  interProScanResponseToAnnotations,
  parseGFF,
} from 'msa-parsers'

// GFF3 (including InterProScan's own output) to annotations
const annotations = gffToAnnotations(parseGFF(gffContents))

// an InterProScan JSON response to the same shape
const fromScan = interProScanResponseToAnnotations(response)

// and back out as GFF3, with optional `#` header lines
const gffString = annotationsToGFF(annotations, ['written by my pipeline'])
```

## License

MIT
