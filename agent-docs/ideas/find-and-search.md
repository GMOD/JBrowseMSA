# Find / search — the most-missed everyday feature

The viewer has no search of any kind: no row-name search, no "jump to column N",
no motif or regex or IUPAC pattern search. `featureFilters` filters annotation
_types_, not rows, so nothing covers this. It is the first thing a user reaches
for on a 230k-row tree.

The overlay that would show hits already exists and already persists, so a motif
hit becomes a shareable link via `highlightColumns` for free. Row-name search
should reuse `showOnly` and `collapsed` rather than invent a third
row-visibility mechanism.
