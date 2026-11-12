# Scales and guides

`resolveScale` in `packages/lib/src/scales.ts` reads the color object,
`ColorSpec`, through an ordinal, linear, log, threshold or identity scale, and
`encodings`, the row panels and every column track read it, so a dN/dS bar takes
its color from its value. The cell fill reads `residueColor`, the residue mark's
color object. The viewer adopts the color object jbrowse-components' displays
declare, with the continuous and threshold scales it names, a guide for every
scale, a legend or an axis, and the marks those unlock.
[panels-and-marks](panels-and-marks.md) holds the vocabulary of panels, marks
and channels this builds on.

## Vocabulary

- **Color object.** The members a channel declares to read a field into a color:
  `field`,
  `scale: {type, domain, range, scheme, domainMin, domainMax, domainMid, domainQuantile, reverse}`
  and `legend: {title, labels, missingLabel}`. jbrowse-components spells it this
  way on every display (`packages/core/src/util/colorScale.ts` there, its
  `config_guides/mark_display.md`, and its ADR-238 and ADR-240).
- **Scale kind.** `scale.type`: `ordinal`, `linear`, `log`, `threshold` or
  `identity`. An ordinal scale hands a `range` color to each distinct value. A
  linear or log scale samples a ramp between `domainMin` and `domainMax`. A
  threshold scale cuts the number line at the values `domain` lists and hands
  `range` one color per interval, so `range` is one longer than `domain`. An
  identity scale reads each value as the CSS color it names.
- **Value scale.** The scale a bar or point mark reads its value through into a
  length: `{type, domainMin, domainMax, domainQuantile}`, spelled
  `encoding.y.scale` on a column track and `encoding.x.scale` on a row panel,
  the axis each one draws along.
- **Guide.** What a reader checks a scale against. A color scale has a legend, a
  value scale has an axis. A guide derives from its scale and takes no record of
  its own.
- **Declaration.** The members of a scale as written, with `field` left out. Two
  records whose declarations match read one scale over the union of their
  fields' values and list one legend. This is Vega-Lite's shared `resolve` and
  ggplot2's one scale per aesthetic, and jbrowse-components' rule in ADR-136.

## The color object's members

A color object is unset, one color as `value`, or a field read through `scale`,
the three states of jbrowse-components' ADR-241. A column track's one color is
`encoding.color.value`, with `color` kept as the shorthand, and a scale takes
the `linear`, `log` and `threshold` kinds, a ramp `scheme`, the domain ends,
`reverse`, `labels` and `missingLabel`.

`range` takes a list of colors, and `scheme` a palette name. The names stay
`ggplot`, `set1`, `dark2`, `okabeito` and `tableau`, and `okabeIto` and
`tableau10` read as aliases, since those are the names jbrowse-components'
`paletteFromSpec` accepts. On a linear scale `scheme` names a ramp from the
table jbrowse-components bakes: `viridis`, `magma`, `inferno`, `cividis`,
`reds`, `blues`, `redblue` and `purpleorange`. A linear scale with neither
`range` nor `scheme` samples `viridis`.

## Decisions

### One color object on every channel

The object above is the type of every color channel: an `encodings` entry, a
strip's `encoding.fill`, a `features` panel's `encoding.fill`, a column track's
`encoding.color` and a `bar` or `point` row panel's `encoding.color`. A channel
nests its `scale` and its `legend`, as jbrowse-components' ADR-238 and ADR-240
do, so `encoding.fill` is `{field, scale: {scheme: "set1"}}`.

`scale.type` left unset is `ordinal`, which is what every record written so far
means. A field whose every value parses as a number still takes ordinal colors
until the record says `scale: {type: "linear"}`, and its legend carries a note
saying so, the way jbrowse-components' `CategoricalScale.note` does, so a
producer who meant a ramp sees which member to write. A preset table keyed by
field name, jbrowse-components' `score` to `linear` and `strand` to red and
blue, is declined below.

`resolveScale(spec, values)` returns a `ResolvedScale` of `kind`, `colorOf` and
the legend `items`. `colorOf` takes the string the field holds, and the
continuous kinds parse it, so `rowData`'s string coercion and GFF attributes
need no change. A value that fails to parse falls under `missingLabel`, grey in
the legend.

### A categorical scale over several records resolves one domain

Two strips resolving one palette apart give a value both fields hold two colors.
With the two-strip example in `docs/layers.md`, PB2 over `am2.2, am4` and PB1
over `am4, eu1` through `set1`, `am4` would be `#377eb8` in the first strip and
`#e41a1c` in the second, and a legend merging the entries by id would show a
color the second strip never draws. A test in `rowPanels.test.ts` pins the
two-strip case.

Resolution keys on the declaration. `resolvedScales` groups every record's color
object by its members with `field` left out, resolves each group once over the
union of its fields' values, and hands each record the group's `colorOf`. Two
strips over `{scale: {scheme: "set1"}, legend: {title: "segment lineage"}}`
color `am4` alike, and two strips over `{scale: {scheme: "set1"}}` with no title
are two fields, two legends and two scales, which is what their two legends say.
`domain` on the object lists values in legend order and spends `range` from the
first entry, so a producer who wants a fixed order writes it once.

A top-level `scales` map with named entries, Vega-Lite's shared scale by name,
was considered and declined. jbrowse-components refused a display-level
`scales.color` on 2026-09-23 because marks declaring a scale alike already share
one and a named map is a second spelling for it. The same holds here.

### An open ramp is per record, and a pinned one shares

A linear or log scale with an end unset takes that end from the record's own
values, clipped at `domainQuantile`, and a ramp whose domain follows its own
data cannot share a legend with another record's. A ramp pinned at both ends is
its declaration, so two strips over
`{scale: {type: "linear", scheme: "viridis", domainMin: 2019, domainMax: 2023}}`
share one gradient legend. This is jbrowse-components' rule in ADR-136 as
amended 2026-09-23, and it means a figure pins both ends. A pinned ramp and a
threshold scale leave the table out of their key too (`declarationKey`), so a
row panel and a column track declaring one share it across the row and column
tables.

`domainQuantile` defaults to 1, the loaded values' extremes. Below 1 each end
clips its own tail, the value past the clip draws at the end color, and the
legend prints the clipped ends. jbrowse-components settled this in ADR-179 after
checking ggplot2, Vega-Lite, Observable Plot and GenomeSpy, none of which name a
robust domain; it is here because one outlier date or one huge genome flattens a
strip to one color.

### Domain order is natural sort, listed values first

The domain order is the one jbrowse-components' `compareGroupKeys` states
(`groupKeys.ts`), where `localeCompare` would put `10` before `2` and `chr10`
before `chr2`: the values `domain` lists first in that order, then numbers by
value, then every other value run by run with digit runs compared by magnitude,
so `2.3.4.4b` sorts after `2.3.2.1a` and `H5N1` before `H5N8`. A value the field
lacks takes no row, and `missingLabel` names the grey row for a row with no
value. The comparator is about forty lines and is copied, with its source path
in the comment, under the rule below.

### The legend is a `LegendSpec`

`legendSpec.ts` holds jbrowse-components' `LegendSpec` shape from
`packages/core/src/ui/legendSpec.ts` there: a section is
`{id, title, note, items}`, an item is `{value, label, color}` or
`{label, gradient}`, and a gradient is `{stops, minLabel, maxLabel}`.
`legendEntries` flattens the sections for `AnnotationLegend.tsx` and
`LegendSVG`, with a gradient row and a note row. On screen a gradient row is a
CSS `linear-gradient` over the stops; in the export it is a `<linearGradient>`
in `<defs>` and a `<rect>` filled by it, which the React half of
`renderToSvg.tsx` emits, so `packages/svgcanvas` still draws no gradient. A
legend past twenty rows lists the twenty and a `+N more` note,
jbrowse-components' `MAX_LEGEND_ITEMS`.

Every scale from a color object lists one legend section keyed by its
declaration and titled by `legend.title`, else by `field`. The domain overlay's
accession key stays the one producer with no field.

### Every scale reports its problems

`scaleProblems` on the model (`scaleProblems.ts`) lists, per record, the
combinations no single member can refuse: `domainMax` below `domainMin`, a
threshold whose `domain` is unsorted or whose `range` is not one longer, a
`domainQuantile` outside 0.5 to 1, `labels` of a different length from `domain`,
a `scheme` no table holds. The legend carries the first as its section's note,
the CLI's `export-svg --spec` prints them all to stderr, and `MSAViewer` exposes
them through `ref` and `onModel`, the way it exposes `residueMappingProblems`.
The rules and their messages are jbrowse-components' `colorProblems` and
`scaleEndProblems`, copied.

### A legend row hides its category

A click on a row of an ordinal or identity scale's legend hides that value, as
jbrowse-components' ADR-246 has its key rows do. The model keeps the hides as
`hiddenCategories`, a list of `{field, value}` under ADR-246's name, and the
list persists in the snapshot and the shared URL. `activeHiddenCategories`
applies a hide wherever a categorical scale in the row table, the feature table
or the node table reads its field, and holds it unapplied while none does, so a
palette edit keeps a hide and a removed encoding leaves it waiting.

A hidden feature value drops the features from `filteredAnnotations` and from a
`features` track's spans, so the overlay, the panels, the tracks and their
tooltips all lose them. A hidden row value leaves the row's marks unpainted and
keeps the row: the strip cell, the label color, the branch color and the tint
go, and the tree and the alignment keep their rows. Dropping the row would
reflow every panel from a click on one strip of eight, and a `rowTransform`
filter already drops rows by field. The on-screen legend strikes a hidden row
through, and `exportLegendEntries` leaves it out, since the figure draws none of
it.

The accession key, the overlay's palette where no `featureFill` names a field,
toggles `turnedOffFeatures` through `setFilter`, the state the filter dialog
writes, so a feature type has one switch. Its legend keeps a type the user
turned off, struck through, and leaves out a type that starts hidden, such as a
Stockholm `#=GR` line, which the dialog turns on.

### An axis is the guide of a value scale

A `features` panel with `x: "position"` maps each row's residue positions onto
the panel width through a linear scale and draws no ruler, so a gene
neighbourhood carries no kilobase scale. A `bar` or `point` row panel has the
same scale along its width. `drawAxis` in `components/axis.ts` takes a value
scale, a pixel extent and an orientation and draws the ticks and labels, on a
canvas or the svgcanvas Context, with the 1/2/5 tick ladder the tree scale bar
uses (`ladderStepBelow` in `components/tree/scaleBar.ts`). A row panel draws its
axis at the foot of the header band (`headerLayout.ts`), so the band's height
holds and the panel's header is the axis title. The tree scale bar and the
position ruler stay as they are; they are the axes of the branch-length and
column scales and already derive from them.

`encoding.y.scale` on a column track and `encoding.x.scale` on a row panel carry
`type` (`linear` or `log`), `domainMin`, `domainMax` and `domainQuantile`
(`ValueScaleSpec`, resolved by `resolveValueScale` in `valuePanels.ts`). A bar
with no `domainMax` draws `values` as fractions of 1.

### New marks on both axes

Both axes share one kind vocabulary, and the scales above give each kind its
channels.

- **`bar` and `point` row panels** over a numeric `rowData` field, the value
  along the panel width through `encoding.x.scale`, with an optional
  `encoding.color` over the same or another field. This is ggtree's
  `geom_facet(geom_col)` and `geom_facet(geom_point)`: genome size, sampling
  date, a trait. `width` defaults to 80.
- **A `text` row panel** prints a `rowData` field beside the tips, the way a
  tip-aligned table does, in the panel's width.
- **A `strip` column track** (`columnTrackColor.ts`): one cell per column
  colored from `values` through `encoding.color`, a heatmap row. pLDDT per
  residue, disorder, a hydropathy scale. It is the column twin of the row strip
  and shares its legend machinery.
- **`encoding.color` on a `bar` column track** over `values`, so a threshold
  scale at 1 colors dN/dS.
- **`nodePoint` in `encodings`**, reading each internal node's support value
  through a color object and filling the node bubble. ggtree's
  `geom_nodepoint(aes(color = support))`. The `nodes` table's one field,
  `support`, is the Newick label msa-parsers keeps as an internal node's name
  (`nodeField` in `treeDisplay.ts`).
- **`rowLabel` in `encodings`**, naming the `rowData` field drawn as the tip
  label, with `genome` the field read where no encoding names one.
  jbrowse-components spells the same thing as a `rows.labels` map.

### Copy the shapes, import nothing new

`@jbrowse/core` 5.0.0-beta.9, the version `packages/lib` pins, ships
`ui/legendSpec`, `ui/colorScale`, `util/colorSchemes`, `util/colorRamp` and
`util/groupKeys`, and does not ship `util/colorScale`, which holds the presets
and the problem rules. The downstream plugin resolves core against the host
jbrowse-web, and the msafam site is on core 3.2, so a new core import is
`undefined` on a deployed host, the rule `CLAUDE.md` states under
`@jbrowse/core` externals. The types, the comparator, the scheme stop tables and
the problem rules are copied into `packages/lib/src` with the source path in a
comment, the way `statusMessageText` and `renderToStaticMarkup` were. A later
core release that every host runs can replace the copies with imports in one
commit.

### Declined

- **A preset per field name.** jbrowse-components reads `score` through a ramp
  and `strand` through red and blue before a config says so. No field of
  `rowData` or a GFF has one meaning across figures, and `strand` already picks
  the arrow glyph. A record writes `scale: {type: "linear"}`.
- **`jexl` channels.** A derived value is computed by the agent that wrote the
  table and stored in a field, under `viewer-not-analysis-tool`.
- **A top-level `scales` map.** See the declaration rule above.
- **`opacity` and `size` channels on the span mark.** No figure has asked.
  `size` on a `point` row panel takes a number, one diameter per record.
- **A per-cell color matrix.** See `data-layers.md`.

### One color object for the residue mark

`residueColor` in `packages/lib/src/residueColor.ts` is the residue mark's color
object, `{channel, field, scale}`, and it is the `MSAViewer` prop, the MST
property and the shared-URL key alike.

- `channel` names what the color paints: `fill`, the default, colors the cell,
  and `color` colors the letter and leaves the cell plain.
- `field` names what a cell reads: `residue`, its letter through `scale`, or
  `feature`, the default, the color the annotation overlay gives the span
  covering it. Under `feature` the residue scale fills the cells wherever the
  overlay draws no span, so an alignment with no annotations keeps its scheme
  and a loaded GFF takes the cells it covers. The `color` channel reads the
  residue, and the spans draw as bars under the rows.
- `scale` holds `scheme`, a built-in scheme name with `maeditor` where unset, or
  `domain` and `range`, a color per residue letter. A `domain` wins over
  `scheme` and leaves every letter it does not list uncolored, so clearing it
  returns the cells to `scheme`.

Three scheme names resolve to a function of the column and the letter in place
of a letter table: `clustalx_protein_dynamic`, `blosum62_dynamic` and
`percent_identity_dynamic` color a residue from its column's statistics, so one
letter takes a different color in each column. They are no ordinal scale, and
`scheme` names them anyway, the way jbrowse-components' `scheme` names a ramp
the scale samples. `dynamicColorSchemeName` is the test for one, and is
undefined while a `domain` wins.

The domains own the fill as `field: "feature"`, the table the overlay reads, and
the color of a span stays with `featureFill`, a GFF `color=` and the accession
palette, which color it under every layout: a filled box, a bar under the row, a
sub-row, a panel. A feature field named on the residue channel, such as
`field: "type"` through its own scale, was declined, because it would give one
span two colors, one in the cell and another in its bar.

The prop replaces `colorScheme` and `residueEncoding`. `preProcessSnapshot`
reads the four keys a snapshot held before into `residueColor`
(`liftResidueColor`): `bgColor: false` is `channel: "color"`,
`domainFill: false` is `field: "residue"`, `colorSchemeName` is `scale.scheme`,
and a `customColorScheme` map is `scale.domain` and `scale.range`. A
`residueColor` in the same snapshot wins member by member. The lift exists for
links already shared; every producer in the repository writes `residueColor`.
`msaRaster.ts` keys its tile cache on the object, the menus and the settings
panel write it through `setResidueColor` and `setCellFill`, the Python widget's
`residue_color` trait carries it whole, and ggmsaview's `residue_color` argument
and `scale_residue_color()` layer write it.

### Revisited: `identity` as a scale kind

This document first declined `identity`, because a GFF `color=` attribute
already colors its own feature ahead of any scale and the word named what
already happened. jbrowse-components adopted it on 2026-10-25 in ADR-243, and
two cases the GFF path does not cover decided it here. A `rowData` field of
colors an agent computed had no way to paint a strip or a tip label, and a GFF's
own colors had no legend, since the legend lists a scale's rows and `color=`
declared none. `scale: {type: "identity"}` paints each value as the color it
names, and its `domain` and `legend.labels` list and name the colors, so
`featureFill` over `color` keys a GFF's own colors. Without a `domain` the
legend lists nothing, ADR-243 as its ADR-265 amends it.

## Open edges

- A column track's value scale draws no axis. The `left` orientation of
  `drawAxis` waits on a canvas in the track label gutter, where `TrackLabels`
  and `TrackLabelsSVG` draw the name.
- An arc's stroke width reads no `encoding.size` over its value until a figure
  needs one.
- The tree overview draws no node points.
- jbrowse-components' `agent-docs/reference/GRAMMAR_OF_GRAPHICS.md` reads clade
  focus, branch lengths and clade collapse as missing from react-msaview in its
  row-panel table; all three exist (`clades` with `focus` and `collapse`,
  `showBranchLen`).
