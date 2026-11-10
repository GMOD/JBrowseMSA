# msa-coordinates

Conversions between the three coordinate systems of a multiple sequence
alignment:

- **Global column:** a column of the full alignment.
- **Visible column:** a column left once a sorted list of hidden columns is
  removed, such as the gappy columns a viewer hides.
- **Sequence position:** a residue of one row, 0-based, counting only non-gap
  characters (`-` and `.` are gaps).

Part of [react-msaview](../) (JBrowseMSA). No dependencies.

## Installation

```bash
pnpm add msa-coordinates
```

## Usage

`buildSeqPosIndex` lists the column of each residue of a row once, and the
lookups binary-search it.

```typescript
import {
  buildSeqPosIndex,
  residuesBefore,
  seqPosOfGlobalCol,
} from 'msa-coordinates'

const index = buildSeqPosIndex('A-TG-C') // [0, 2, 3, 5]
index[2] // 3, the column of the G
seqPosOfGlobalCol(index, 3) // 2, the G
seqPosOfGlobalCol(index, 4) // undefined, a gap
residuesBefore(index, 4) // 3
```

`visibleColToGlobalCol`, `globalColToVisibleCol` and `visibleColsBefore` convert
between global and visible columns:

```typescript
import {
  globalColToVisibleCol,
  visibleColToGlobalCol,
  visibleColsBefore,
} from 'msa-coordinates'

const hidden = [2, 5]
visibleColToGlobalCol(hidden, 2) // 3
globalColToVisibleCol(hidden, 3) // 2
globalColToVisibleCol(hidden, 5) // undefined, a hidden column
visibleColsBefore(hidden, 5) // 4, where the hidden column collapses to
```

## License

MIT
