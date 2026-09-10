# Data layers

The snapshot is the API. Every field below is a property of the `MsaView` model,
so it can be written into the standalone app's `?data=` URL, passed to
`MSAModelF().create`, set through `MSAViewer` props, or given to the R widget,
and the viewer draws it without computing anything. It travels in a shared URL
and the SVG export draws it. Wherever a row is named, positions are that row's
residues, 1-based and inclusive, as in GFF; the viewer projects them through the
alignment's gaps. Without a row they are alignment columns.

## columnTracks

A track above the alignment, supplied as data. `kind: "bar"` draws one bar per
column from `values`, scaled by `max` (default 1) and clamped to that range.
`kind: "text"` draws one character per column from `data`, colored by `colors`.
`kind: "arc"` joins pairs of positions from `arcs`, each `{start, end}` drawn as
a curve whose height grows with how far it reaches. `row` makes `values`, `data`
or the ends of an arc index that row's residues instead of columns, so the first
value is residue 1 and gaps in the alignment are filled in. A data track appears
in the Tracks menu, toggles like any other, and exports to SVG.

```json
{
  "type": "MsaView",
  "data": { "msa": ">human\nMKAANSE\n>mouse\nMKA-NSE" },
  "columnTracks": [
    {
      "id": "dnds",
      "name": "dN/dS",
      "kind": "bar",
      "values": [0.1, 0.4, 1.8, 0.2, 0.3, 0.1],
      "max": 2,
      "color": "#6a51a3",
      "row": "human"
    },
    {
      "id": "frame",
      "name": "Codon frame",
      "kind": "text",
      "data": "1231231",
      "colors": { "1": "#ddd", "2": "#bbb", "3": "#999" }
    },
    {
      "id": "disulfides",
      "name": "Disulfide bonds",
      "kind": "arc",
      "arcs": [
        { "start": 31, "end": 96 },
        { "start": 43, "end": 109 }
      ],
      "color": "#b8860b",
      "row": "human"
    }
  ]
}
```

| Field    | Kind | Meaning                                                             |
| -------- | ---- | ------------------------------------------------------------------- |
| `id`     | both | Unique key. The Tracks menu and `turnedOffTracks` use it            |
| `name`   | both | Label beside the track                                              |
| `values` | bar  | One number per column, or per residue of `row`                      |
| `max`    | bar  | Value drawn at full height (default 1)                              |
| `color`  | bar  | Bar fill (default gray)                                             |
| `data`   | text | One character per column, or per residue of `row`                   |
| `colors` | text | Character to background color; the active color scheme otherwise    |
| `arcs`   | arc  | `{start, end, color?}` pairs; each end is a column or a residue     |
| `row`    | both | Row name whose residues the values or characters index              |
| `height` | both | Pixel height (default: the conservation track's, or the row height) |

An arc is a relationship between two positions, which is what the other kinds
cannot express: a base pair, a disulfide bond, a residue contact. Its two ends
follow the same rule as everything else here — alignment columns, or residues of
`row` — so a contact map computed in a protein's own numbering lands on the
alignment without being recomputed. Arcs are drawn on one baseline in the order
given, and `color` on an individual arc overrides the track's, which is how one
track distinguishes classes of pair (nested helices from a pseudoknot, say).

An RNA Stockholm needs none of this: `#=GC SS_cons` already pairs the columns,
so the viewer draws a **Base pairs** track from it, coloring a pseudoknot — a
pair WUSS writes as `A`/`a` because it crosses a helix instead of nesting in it
— differently from the nested pairs it crosses.

The numbers do not have to come from the alignment, and the interesting ones
usually don't: the p53 example carries a count per residue of the missense
variants ClinVar classifies as pathogenic, which is a fact about human disease
that no alignment contains. Computing it belongs wherever the data lives; the
viewer's part is to put it on the right columns.

A track over 50 kB serialized stays in the live model but leaves the snapshot,
the same rule that keeps a large inline alignment out of a shared URL. Point a
large alignment at a URL and keep the track under that size, or host the values
and set them at runtime with `model.setColumnTracks(...)`.

## highlights

A labeled band over a column range or a residue range, or a tint over a set of
rows. `label` and `color` are optional; `color` is any CSS color and paints the
band, its border, or the row tint.

```json
"highlights": [
  { "row": "human", "start": 248, "end": 248, "label": "R248Q · 651/658 R" },
  { "start": 40, "end": 60, "label": "NES", "color": "rgba(0,120,255,0.25)" },
  { "rows": ["beluga", "dolphin"], "label": "frameshift carriers" }
]
```

`row` plus `start`/`end` is a residue range of that row. Without `row` the range
is alignment columns, also 1-based. `rows` marks whole rows across the tree
labels and the alignment, with the label in the tree gutter. A range that lands
entirely on hidden gappy columns draws nothing; one that straddles them shrinks
to what is visible. Row names that match no row are ignored.

React: the `highlights` prop on `MSAViewer`, or `model.setHighlights(list)`. R:
`msaview(highlights = list(list(row = "human", start = 248, end = 248)))`.

A host highlighting something transiently — following a hover in a structure
viewer or a genome browser — wants `model.applyHighlight(owner, list)` and
`model.clearHighlight(owner)` instead. Those take the same shape, draw over the
persisted ones, and stay out of the snapshot, which is right for a hover: it is
not part of the document. The owner key is what lets two sources highlight at
once without either clearing the other's.

## residueMappings

Which residue of which structure a row's residues are. Unlike the layers above,
this one draws nothing — it answers a question, and the reason it is data is
that the viewer cannot work the answer out. Matching a row to a structure by
sequence equality fails for a construct with an expression tag, a truncation, an
engineered residue, or a row that is a subsequence of the entry, and it fails in
the direction that looks like it worked: the highlight lands on a residue, just
not the right one. So the correspondence arrives computed, by whatever knows how
— SIFTS, an AlphaFold model, a curator.

```json
"residueMappings": [
  {
    "row": "HBA_HUMAN/1-142",
    "accession": "P69905",
    "structure": {
      "id": "1A3N",
      "kind": "experimental",
      "asymId": "A",
      "url": "https://files.rcsb.org/download/1A3N.cif"
    },
    "segments": [
      { "rowStart": 1, "rowEnd": 141, "structStart": 2, "structEnd": 142 }
    ],
    "unobserved": [[60, 62]],
    "generated": { "by": "sifts", "date": "2026-09-10" }
  }
]
```

| Field        | Meaning                                                              |
| ------------ | -------------------------------------------------------------------- |
| `row`        | The alignment row this maps                                          |
| `accession`  | The sequence database entry the mapping went through, for provenance |
| `structure`  | `id`, plus optional `kind`, `asymId` (the chain) and `url`           |
| `segments`   | Contiguous runs where the two sides line up 1:1                      |
| `unobserved` | Structure positions declared but not resolved, as `[start, end]`     |
| `generated`  | Who computed it, when, and from what                                 |

Positions are 1-based and inclusive on both sides, as everything else here is.
Structure positions are `label_seq_id`, the index into the entity's SEQRES;
author numbering carries insertion codes, which break integer arithmetic, so it
stays out.

**Segments, not a per-residue array**, because the underlying correspondence is
segment-shaped: a dozen numbers cover what a dense array spends kilobytes on.
That shape also makes the refusal rule structural rather than a vocabulary — **a
position no segment covers is unmapped** — so there is no status field for the
data to disagree with itself about. Three states fall out of it: covered is
mapped and observed, covered but listed in `unobserved` is mapped and not
observed, anything else is unmapped. The middle one is worth having, because
"the crystallographer could not see it" and "this protein has no such residue"
mean different things to a reader.

Two model methods read it:

```ts
model.structureResidue(rowName, seqPos) // -> {structure, position, observed} | undefined
model.rowResidue(structureId, position, asymId?) // -> {rowName, seqPos} | undefined
```

Both return `undefined` rather than guessing, which is the whole point. `asymId`
picks between mappings onto the same entry — a homodimer is two rows on two
chains of one id — and without it the first mapping covering the position wins.
A segment whose two sides disagree in length is skipped the same way an
uncovered position is: it is malformed, and the arithmetic would otherwise
answer anyway, off by however much the sides disagree.

`seqPos` is 1-based, like the rest of this document, and composes directly with
`applyHighlight`. The column helpers on the model (`seqPosToVisibleCol`) take
0-based positions, so a structure hover reaches a column as
`model.seqPosToVisibleCol(rowName, seqPos - 1)`.
