# react-msaview-structure

- **In:** a `react-msaview` model, and a row's UniProt accession
- **Out:** the AlphaFold and PDB structures of that row with the residue mapping
  onto each, and a Mol\* panel linked to the alignment

## Find a row's structures

```ts
import { findStructures } from 'react-msaview-structure'

const { candidates, problem } = await findStructures({
  rowName: 'sp|P04637|P53_HUMAN',
  rowSequence: model.rowSequence('sp|P04637|P53_HUMAN') ?? '',
})
model.setResidueMappings([...model.residueMappings, candidates[0].mapping])
```

- The row names its UniProt entry, or the caller passes `accession`
- A row named by an entry name (`HBA_HUMAN`) or a database id UniProt
  cross-references, such as a RefSeq protein (`NP_000549.1`), an Ensembl id or a
  CCDS, is looked up in UniProt by that name, a reviewed entry first, and
  `resolvedFrom` in the result says which name it came from. A RefSeq `WP_`
  protein is left out, since it names one sequence shared by every organism that
  encodes it
- The database ids are p2s_mapper's, so a new kind it recognizes works here
- The row is then checked against the entry it resolved to, so a wrong name gets
  no mapping
- AlphaFold DB and RCSB answer the lookups, both from the browser
- The row is aligned once to the entry's canonical sequence, and each
  candidate's `segments` compose that alignment with the structure's own
  numbering (`label_seq_id`). The canonical sequence comes from the AlphaFold
  model, or from UniProt for an entry AlphaFold DB has no model of
- A row that does not match its entry gets no candidates and a `problem`
- A generated mapping names its chain by the author id RCSB reports

## Search Foldseek for a row with no identifier

```ts
import {
  foldseekCandidates,
  foldseekQuery,
  searchFoldseek,
} from 'react-msaview-structure'

const rowSequence = model.rowSequence('Human_alpha') ?? ''
const hits = await searchFoldseek(foldseekQuery(rowSequence).sequence, {
  onStatus: status => console.log(status),
})
const candidates = foldseekCandidates({
  rowName: 'Human_alpha',
  rowSequence,
  hits,
})
```

- This sends the sequence to `3di.foldseek.com` and `search.foldseek.com` and
  waits for their queue, about 8 s for a 142-residue protein, so a host offers
  it as an explicit action
- Foldseek aligns the query to each hit, and that alignment is the residue
  mapping, so a hit is a structural homolog and its `identity` says how close
- The query is the row's twenty standard amino acids, at most 1200 of them, and
  hits map back to the row's own numbering through the residues left out
- An AlphaFold F1 hit opens from its own file, since it is numbered on the
  UniProt sequence
- A PDB hit is a chain of an RCSB assembly file, such as `1MYI-assembly2.cif`,
  with only the residues that have coordinates. `foldseekCandidates` reads that
  file, finds the chain whose CA atoms match the hit's `tCa` trace, and numbers
  each target position by that chain's `label_seq_id`. The mapping then stores
  the file's URL, about 50 bytes
- Where the file cannot be read or no chain matches the trace, the trace itself
  is drawn, numbered by target position, and travels in the mapping as a `data:`
  URL of several KB

## Superpose rows by the alignment

```ts
import { superposeRows } from 'react-msaview-structure'

const fit = await superposeRows({
  model,
  targets: [
    { row: 'HBA_HUMAN', structureId: 'AF-P69905-F1' },
    { row: 'HBB_HUMAN', structureId: 'AF-P68871-F1' },
  ],
  selection: model.selection,
})
```

- The alignment says which residues correspond: each other row's CA atoms fit
  the first row's where both rows have one, in `selection` when given. Its
  `start` and `end` are 1-based file columns, as `model.selection` holds them
- `matrices` moves each structure into the reference's frame, for the panel's
  `transforms`, and each fit reports its RMSD and the CA pairs it used
- `distanceValues` is the mean CA distance per residue of the reference row
  after the fit. `distanceTrack(fit)` turns it into a `columnTracks` bar on that
  row, with `max` set to the largest distance, since the distances are in Å and
  a bar's `max` is 1 by default
- Fitting a pocket and reading the distances elsewhere shows where the rest of
  the fold departs from it
- A fit sets aside the pairs that sit more than twice the RMSD from it and fits
  again, up to five rounds and never below 40% of the pairs, as PyMOL's `align`
  does, so a loop the alignment mismatched does not pull the core out of
  register. `fitted` of `considered` pairs says how many it kept, and
  `refine: false` keeps them all
- Structure files are read as mmCIF or PDB format, and the first model's CA
  atoms count, on the chain the mapping's `asymIdKind` names
- A row whose file fails to load goes into `skipped` with the reason, and the
  rest still fit
- A column no other row covers reads 0

## Facets: structures side by side

```tsx
import { facetsByRowField } from 'react-msaview-structure'
import { FacetGrid } from 'react-msaview-structure/panel'

const facets = facetsByRowField(model, 'group')
;<FacetGrid
  model={model}
  facets={facets}
  transforms={fit.matrices}
  columns={4}
/>
```

- A facet is the group of rows sharing a value of a row-table field, with the
  structures those rows map onto
- Each facet is its own Mol\* view, so a grid suits a handful of groups
- Pass the matrices of one `superposeRows` fit over every facet's structures, so
  all facets share a frame, and the cameras are tied so turning one turns all
- A structure shows in its facet's color where the alignment covers it and pale
  where it does not, so a disordered tail or an unaligned domain recedes

## Show the structure

```tsx
import { StructurePanel } from 'react-msaview-structure/panel'
;<StructurePanel model={model} structureId="AF-P04637-F1" colorBy="scheme" />
```

- Hovering the alignment lights the mapped structure residue, and hovering the
  structure lights its cell
- Clicking either side focuses the other
- `colorBy` paints the structure with `conservation`, or with the alignment's
  own `scheme`
- `structureIds` shows several structures, each in its own color unless
  `colorBy` is set, and `transforms` places them
- `highlights` (on by default) paints the residues the alignment's `highlights`
  layer marks, on top of the rest, through the rows that map onto the structure
- `fitBy="tm-align"` superposes by the structures' traces alone and reports
  TM-score and RMSD through `onTmAlign`
- `chains="mapped"` draws the chains a row maps onto, with their ligands and
  ions, and skips waters and unmapped chains. It is the default when several
  structures are shown
- A structure whose file fails to load drops out with a note under the view
- The view frames the residues the alignment covers, so a tail does not set the
  zoom
- `molstar` is a peer dependency, and the panel loads it on first mount
