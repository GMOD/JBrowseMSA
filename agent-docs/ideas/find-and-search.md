# Find / search

The viewer has no search of any kind: no row-name search, no "jump to column N",
no motif or regex or IUPAC pattern search. `featureFilters` filters annotation
_types_, not rows, so no existing control covers this. On a 230k-row tree, a
user has no other way to find a row.

The overlay that would show hits already exists and already persists, so a motif
hit becomes a shareable link via `highlightColumns` with no extra work. Row-name
search should reuse `showOnly` and `collapsed` rather than invent a third
row-visibility mechanism.
