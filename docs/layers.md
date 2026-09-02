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
`row` makes `values` or `data` index that row's residues instead of columns, so
the first value is residue 1 and gaps in the alignment are filled in. A data
track appears in the Tracks menu, toggles like any other, and exports to SVG.

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
| `row`    | both | Row name whose residues the values or characters index              |
| `height` | both | Pixel height (default: the conservation track's, or the row height) |

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
