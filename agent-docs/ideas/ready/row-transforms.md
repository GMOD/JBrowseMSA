---
name: row-transforms
description:
  Filter, sort and facet the rows by a rowData field through one rowTransform
  record; with a tree, only the filter and clade-shaped facet bands apply.
---

# Row transforms

The rows take three transforms over `rowData`, the fields a host supplied. The
viewer reorders, drops and labels rows by those fields, and computes nothing
from the sequences.

## One record on the row axis

`rowTransform` is a top-level property of the `MsaView` model, beside `clades`
and `rowPanels`:

```json
"rowTransform": {
  "filter": [{ "field": "host", "oneOf": ["chicken", "duck"] }],
  "sort": [{ "field": "date", "order": "descending" }],
  "facet": { "field": "clade", "sort": ["2.3.4.4b"] }
}
```

It is one record because the three act on the one row order every panel reads:
the tree, the labels, the strips, the features panels and the alignment. A
panel's own `transform`, such as `align`, moves marks inside that panel. The
spelling follows jbrowse-components' ADR-257, where the row axis holds `sort`
and `filter`, and ADR-247, where a facet on a row attribute bands the rows.
`filter` predicates are Vega-Lite's `oneOf` and `range`, ANDed, and a row with
no value fails every one. `sort` is Vega-Lite's list of `{field, order}`, in
natural order (`compareGroupKeys`, the order a scale's domain takes), rows with
no value last. A facet's `sort` lists band values first and the rest follow in
natural order, with the no-value rows last and unlabelled.

The property is not named `rows`, because the model's `rows` getter is public
API that downstream plugins read.

## With a tree

- **Filter** prunes the tree to the kept tips, the way `showOnly` narrows it: a
  tip that fails drops, and an internal node left with no children drops with
  it. A node left with one child stays, so `collapsed` and `rotated` ids still
  name it. Clades resolve against the whole tree, as under a focus. A filter
  keeping no row is not applied, and a data warning names it.
- **Sort** has no effect, and a data warning says the tree sets the order. A
  hidden tree (`drawTree: false`) still sets it, because collapses, focus,
  clade marks and the `branch` channel all resolve against the tree, and a sort
  would put a clade's rows apart.
- **Facet** labels each band whose rows are one clade of the filtered tree, the
  test ADR-169 applies: the common ancestor of the band's tips has no other
  tips. A band that is not a clade draws nothing, and a data warning counts
  them. The facet never reorders rows under a tree. Moving rows into bands
  would mean dropping the tree drawing whenever one row sits outside its
  group's clade, and a reader who asked for a tree would lose it. An author who
  wants bands over a tree that disagrees with the field leaves the tree out.

Without a tree the rows are a flat list: filter, then sort, then group into
bands, each band keeping the sorted order.

## Band labels and the export

A band is a `bracket` clade: `facetClades` writes one record per band, `mrca`
over its tips under a tree and `range` over its first and last row without
one, and `resolvedClades` resolves them with the `clades` records.
`cladeBrackets.ts` sizes the gutter from both, the canvas draws the bars,
`CladeLabels.tsx` draws the labels on screen and `CladeLabelsSVG` in the
export. The SVG export therefore carries the bands with no code of its own.
Bands abut with no gap, because every row reader assumes one row pitch.

## The shared URL

The URL stores `rowTransform` as written: field names and values, no node ids
and no row order. A reroot leaves it valid, so `clearNodeState` does not touch
it, and a changed `rowData` reapplies it.
