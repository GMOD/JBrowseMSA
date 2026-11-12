# JBrowseMSA user guide

JBrowseMSA draws a phylogenetic tree beside a protein or nucleotide alignment.
It stays responsive up to the 230k-node UCSC SARS-CoV-2 tree.

The guide tours the [live app](https://gmod.org/JBrowseMSA/demo/). **Click any
figure to open the app in that state.**

## Getting started

Open the app and you land on the **import form**.

[![](media/import-form.png)][live-import-form]

Click a preloaded example, or open your own data below. An alignment, a tree or
both will do; with both, the rows follow the tree.

## Loading your own data

The import form takes a local file or a URL for the alignment, the tree and,
optionally, domain annotations. The
[tutorials](https://gmod.org/JBrowseMSA/tutorials) build those files from
sequences.

| Input         | Formats                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Alignment** | FASTA (gaps already inserted), Stockholm (`.stock`, single or multi-alignment, may embed a tree and SS), Clustal (`.aln`), A3M, EMF |
| **Tree**      | Newick (`.nh`), or the tree embedded in a Stockholm/EMF file                                                                        |
| **Domains**   | GFF3, such as InterProScan output (generate it with the [CLI](https://gmod.org/JBrowseMSA/cli))                                     |

A Stockholm file can include the tree and secondary structure, and can hold
several alignments.

## A tour of the viewer

Once data is loaded the view has four parts:

- **Tree panel** (left): the phylogeny, with clickable branch nodes.
- **Alignment panel** (right): the residues, colored by the active scheme.
- **Header** (top): the File, View, Tools and Help menus, a Settings button that
  docks the settings panel beside the alignment, and the zoom controls.
- **Minimap & tracks**: an overview ruler above the alignment for navigation,
  and a strip of per-column tracks sharing the alignment's columns (see
  [Tracks](#tracks)).

Hovering a column highlights that position down every row of the alignment, so
you can read one site down the whole family.

## Navigating

**Help → Mouse & keyboard…** lists every mouse gesture and key below, and **Help
→ About & credits…** credits the color schemes.

- **Pan** by click-dragging the alignment, or scroll vertically/horizontally.
- **View → Find row or column…** takes a row name, which completes as you type,
  a column number as the ruler reads it, or `name:N` for residue N of that row.
  The view centers on the target and lights it, and an entry that names nothing
  turns the box red.
- **Keyboard**: click the alignment, then the arrow keys move one cell (a page
  with shift), `+` and `-` zoom, `0` resets the zoom, and Home and End jump to
  the first and last column.
- **Select** a block of cells by holding shift and dragging across the
  alignment, or a range of columns across every row by dragging along a track,
  such as the Position ruler. The header then shows the block's size, such as
  "12 columns × 3 rows", as a button whose menu copies the block as FASTA, zooms
  to it, trims the view to it, or clears it. **Trim to selection** hides every
  column outside the block, and **Show all columns** in the same menu brings
  them back. The position ruler keeps numbering the file's columns. Escape
  clears the selection and the trim. The selection and the trim travel in the
  `#data=` link.
- **Scroll** with the wheel or a drag, or a finger on a touch screen. A vertical
  wheel passes to the page at the top or bottom row, and a vertical wheel or
  swipe passes whenever every row fits, so a viewer embedded in a long page lets
  the reader scroll past it.
- **Zoom** with the magnifier buttons in the header, or Ctrl+wheel (⌘+wheel on a
  Mac, or a trackpad pinch) at the cursor. The first plain scroll over the
  alignment shows a reminder of the shortcut.
- **Zoom on scroll**, the checkbox beside the magnifiers, makes the plain wheel
  zoom, and Shift+wheel then pans. JBrowse 2's views have the same checkbox. The
  `scrollZoomAxis` property limits a wheel zoom to the columns or the rows.
- **Fit** the alignment to the window with the button beside the magnifiers. It
  shrinks a large alignment until all of it shows, and leaves a small one at the
  default cell size. **View → Zoom** also fits the width or the height alone,
  stretching to fill it.
- **Reset zoom**, the next button or the `0` key, returns to the default cell
  size. A zoom that passes the default stops on it, and the wheel holds there
  briefly before going on.
- Set a small row height and column width to zoom out far enough to see a whole
  large alignment at once.

## Color schemes

**Settings → Color** switches schemes live.

[![](media/color-scheme-menu.png)][live-color-scheme-menu]

The color-scheme menu, with protein and nucleotide palettes (the
[embedding guide](https://gmod.org/JBrowseMSA/embedding#color-schemes) lists
them all).

Three schemes are **dynamic**: they color each column from statistics about the
residues in that column, where the other schemes use a fixed color per letter.

[![](media/colorscheme-clustalx.png)][live-colorscheme-clustalx]

`clustalx_protein_dynamic` colors residues ClustalX-style from the composition
of each column.

[![](media/colorscheme-pid.png)][live-colorscheme-pid]

`percent_identity_dynamic` shades each column by its percent identity, so
conserved sites stand out.

`blosum62_dynamic` shades each amino acid by its BLOSUM62 similarity to the rest
of its column, and a nucleotide alignment by identity.

A link can also color letters from its own
[map](https://gmod.org/JBrowseMSA/layers#customcolorscheme) of residue letter to
color. The menu then shows a checked **Custom** entry, and picking a scheme
replaces the map.

## Working with the tree

Click a branch node to **collapse** that subtree. Collapsing also hides any
alignment column that holds only gaps once the collapsed rows are gone, so the
alignment narrows as you fold clades away.

[![](media/tree-collapse.png)][live-tree-collapse]

A collapsed subtree, drawn as a triangle labeled with its tip count (here 3).
The rows beneath it are hidden and the gap-only columns they introduced are
removed.

A branch node's menu also has **Show only this clade**, which narrows the view
to that subtree: the rows below it are the whole alignment until **Show all
rows** puts the rest back.

**Rotate clade** swaps the clades below a branch node, the way ggtree's `rotate`
does, and the alignment rows move with the tips. A second click puts them back,
and **Settings → Tree → Order → Undo rotations** clears every rotation. The same
Order submenu sets the child order for the whole tree: by branch length (the
default), as the file writes it, or ladderized with the small or the large
clades first.

**Reroot here**, on any node but the root, roots the tree halfway along the
branch above that node. **Settings → Tree → Root → Midpoint** roots it halfway
along the longest path between two tips, which suits the unrooted trees
FastTree, IQ-TREE and neighbor joining write. Rerooting renumbers the nodes, so
it expands collapsed clades, clears rotations and leaves the show-only view.
**File → Export tree as Newick** saves the tree with the root, order and
rotations on screen, collapsed clades included.
[Data layers](https://gmod.org/JBrowseMSA/layers#treeorder-and-treeroot) covers
`treeOrder` and `treeRoot`, the properties behind these menus.

**Settings → Tree → Tree overview** puts the whole tree in a band above the tree
panel, small enough that a few hundred tips fit in 120 pixels, with the focused
subtree drawn as a box on it and the `clades` highlights in place. A click on
the band focuses the deepest subtree covering the rows under the pointer, and a
click inside the box clears the focus, so the band reaches a clade of a tree far
taller than the screen in one click. The overview keeps drawing every tip while
the view shows a subtree, so it shows where the focused clade sits in the whole
tree. The SVG export draws the band too.

A phylogram draws a scale bar in the gutter above the tree. The bar's length is
a round number of substitutions per site, at the same scale as the branches.
Cladogram mode hides the bar, because branch length does not set horizontal
position there. The SVG export draws the bar too, so a published figure states
the scale of its branches.

**Settings → Tree** draws the tree as a **Phylogram**, with branches to scale, a
**Cladogram**, or **Labels only**, and sets the child order, the root and the
labels. **Tools → Build neighbor joining tree** builds a quick BLOSUM62 distance
tree for an alignment of up to 500 rows. On a larger alignment the calculation
would freeze the page for several seconds or more, so the menu item explains the
limit and does not run. Build a tree that size with FastTree or IQ-TREE and open
it beside the alignment; the
[protein family tutorial](https://gmod.org/JBrowseMSA/tutorials/protein_family)
covers the whole path.

## Protein domains

Load a GFF3 annotation file from the import form, or from **File → Open
annotation file…**, to overlay domains on the alignment. The overlay accepts any
GFF3, including exon and gene models; InterProScan output is the most common
input. The dialog also takes the JSON an InterProScan run returns and converts
it to GFF3 as it loads. Either way the annotations travel in the shared link
with the rest of the view. The viewer translates each row's annotation
coordinates into alignment columns, so they line up across the family even where
gaps shift the underlying sequence positions.

The [CLI](https://gmod.org/JBrowseMSA/cli) builds the file:
`react-msaview-cli interpro` reads InterPro's precomputed matches for UniProt
accessions in seconds, and `interproscan` scans sequences InterPro has not seen.
The
[protein family tutorial](https://gmod.org/JBrowseMSA/tutorials/protein_family)
walks through both, and the **Open annotation file** dialog links to it.
**Settings → Annotations** shows or hides the overlay, stacks overlapping
domains on sub-rows and filters them.

Loading a domain file hands the cells to the domains: **Settings → Color → Fill
cells with** switches to **Domains**, and each domain fills the cells it covers.
A domain takes a light color and a site (a CDD `Site`, or any type ending in
`site`) a dark one, so a binding site's scattered residues stand out on the
domain around them. **Residues** gives the cells back to the residue scheme and
marks each domain with a bar under its row, and picking a residue scheme does
the same, so a scheme picked while domains are shown never goes unseen.
**Nothing** colors the letters by the scheme and keeps the bars.

[![](media/real-domains.png)][live-real-domains]

A real Src-family kinase family (SRC, YES, FYN, FGR, HCK, LYN, LCK, BLK) with
its tree and real InterProScan domains generated by
`react-msaview-cli interproscan`. Zoomed out to full length, the shared SH3,
SH2, and tyrosine-kinase catalytic domain architecture lines up across every
member.

### Why the overlay is column-locked

The two panels below show what the translation into alignment columns changes.
Both hold the same twelve NLRP1 orthologs, domain GFF, component, palette and
tree; only the bottom panel's input was aligned.

![](media/column-lock.png)

In the top panel there are no alignment gaps, so column N is residue N and each
protein's domains sit at its own residue positions. The shared domains scatter
into a staircase, because the proteins differ in length and in what they carry
at the N terminus. In the bottom panel the same domains land in the same
columns: NACHT starts at residue 328 in human and residue 93 in hamster, 235
residues apart, and the viewer draws the two in alignment columns 371 and 372.
Because the overlay uses the alignment's columns, you can compare a domain
across the whole family in one column range.

[![](media/domain-loss-closeup.png)][live-domain-loss-closeup]

The same alignment at base resolution. The five rows with a pyrin (PYD) domain
carry it over real sequence. The rows without one still have sequence there:
cow, pig, horse and zebrafish have residues in those columns with no PYD called
over them, and only the rodents are mostly gap. At whole-protein zoom the two
cases look alike, so zoom to base resolution to tell "no domain annotated" from
"no sequence".

## Viewing metadata

Alignment file headers and per-sequence information are available from the
**File → Alignment info…** dialog.

[![](media/metadata-dialog.png)][live-metadata-dialog]

The metadata dialog showing the CLUSTAL header and the raw sequences, with
options to copy them and to show/hide gaps.

## Sharing and exporting

- **Share a session** with **Copy link** above the viewer, which copies the page
  URL as of the click. The URL encodes the view state (colors, zoom, collapsed
  clades, highlights), so a collaborator who opens the link sees the same view.
  A file you opened from your own computer goes into the link too, up to a size
  limit described under [Link to a view](#link-to-a-view).
- **Point at something** before you share. The snapshot carries labeled
  highlights: a residue of a named sequence, a column range, or a set of rows,
  each with a note drawn beside it. The view state stores them (see the
  [layers reference](https://gmod.org/JBrowseMSA/layers)), so a link can open on
  a band labeled "R248, conserved in 651 of 658 orthologs".
- **Export an image** with **File → Export as SVG…**: a vector figure of the
  current viewport, the entire alignment, or, while there is a selection, the
  selected block, optionally with the minimap and annotation tracks.

[![](media/export-svg-dialog.png)][live-export-svg-dialog]

The Export SVG dialog, with a choice between the whole alignment and the current
viewport, and checkboxes for the minimap and tracks.

## Link to a view

Besides **Copy link**, a person or a script can write a link. The app reads the
view from the URL's fragment, `#data=`, which holds the JSON of the view, as
typed or URL-encoded. A link written with the `?data=` query parameter, as older
links were, opens too, and the app moves it into the fragment.

```
https://gmod.org/JBrowseMSA/demo/#data={"type":"MsaView","msaFilehandle":{"uri":"https://example.org/kinase.aln"},"relativeTo":"SRC_HUMAN"}
```

A script can encode the JSON, which keeps the link whole in a chat message or a
markdown file that would cut it short at a quote or a space:

```js
const view = {
  type: 'MsaView',
  msaFilehandle: { uri: 'https://example.org/kinase.aln' },
  colorSchemeName: 'clustalx_protein_dynamic',
  highlights: [{ row: 'SRC_HUMAN', start: 530, end: 530, label: 'Y530' }],
}
const url = `https://gmod.org/JBrowseMSA/demo/#data=${encodeURIComponent(JSON.stringify(view))}`
```

Either that bare `MsaView` snapshot or the `{"msaview": {...}}` wrapper the app
writes back to the address bar works. The
[layers reference](https://gmod.org/JBrowseMSA/layers) and the
[model API docs](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/apidocs/MsaView.md)
list every field. When the app cannot read a snapshot, it opens on an error
naming the problem, not on the import form.

Three things decide whether the link works for the person who opens it:

- **Where the files live.** The app resolves a `uri` against its own address, so
  `data/kinase.aln` means `gmod.org/JBrowseMSA/demo/data/kinase.aln`. That works
  for the hosted examples and fails for a link you send, so use an absolute URL.
- **CORS.** The browser fetches those URLs from `gmod.org`, so the server
  holding them has to send `Access-Control-Allow-Origin`. GitHub Pages, S3 with
  a CORS rule, and the public EBI/NCBI/PDBe APIs send it. Most institutional web
  servers and Google Drive do not, and the view then opens on a fetch error.
- **Size.** The browser never sends a URL's fragment to the server, so the
  length of a `#data=` link is up to the browser: Chrome and Firefox both open
  one of 1,000,000 characters. The app gzips the snapshot and inlines a pasted
  or locally opened file up to 1 MB; a 400 kB protein alignment encodes to about
  305,000 characters. A larger file stays in the running viewer but leaves the
  snapshot, and the header shows **Not in the link**. When a file is too large,
  or the whole view still encodes past 1,000,000 characters, the app removes
  `#data=` so the address bar never holds a URL that opens empty, and **Copy
  link** turns off and says why. To share a larger file, serve it over HTTP and
  open it by URL; the link then stores the address, which works at any file
  size. The same 1 MB limit applies to a
  [data track](https://gmod.org/JBrowseMSA/layers#columntracks).

## Tracks

Tracks are strips drawn above the alignment, sharing its columns and its
horizontal scroll. **Settings → Tracks** lists every track under its source and
turns each on or off. A long list gets a filter box, and Show all and Hide all
act on every match. On a track's label, the × hides that track, and the dropdown
arrow beside it shows the track's details.

Hovering a track reads out what it draws at that column: the two conservation
scores, the sequence logo's information content and residue composition, the
columns an arc joins, the letter on a text track. **Settings → Tracks → Show
track values on hover** turns the readout off. Over the alignment itself, the
tooltip carries the domains and insertions under the cursor, and the header
reads out the hovered row, residue and position.

- **Conservation**: a per-column histogram of how conserved the column is, from
  Shannon entropy, scaled down by the column's gap fraction. On by default.
- **Property conservation**: the same measure over physicochemical property
  class instead of exact identity. It shows sites held constant by conservative
  substitution, which identity-based conservation counts as variable. Protein
  alignments only, on by default.
- **Sequence logo**: the residues of each column stacked by the information they
  carry, tallest on top, each letter's height its share of the column's total.
  Off by default. Column height is information content in bits, so it tops out
  at log2(20) for protein and log2(4) for nucleotide, and a column whose
  residues are evenly split draws nothing at all. Frequencies come from the
  non-gap residues, and the track then scales the whole stack by the column's
  occupancy, so a column that is mostly gaps stays short even when its few
  residues agree.
- **Position**: column numbers with a tick under each, at whatever spacing the
  zoom leaves room for. Off by default. The track counts alignment columns. When
  the view is drawn relative to a row (**Use as reference row** in a row's
  menu), it counts that row's residues and skips the columns where the row has a
  gap.
- **Reference row**: the reference row again, pinned under the other tracks, so
  it stays in view while the rows compared against it scroll. The row keeps its
  place in the tree as well. On whenever a reference row is set.
- **Secondary structure** and the other annotation rows a Stockholm file carries
  inline for the whole alignment appear as text tracks, colored by the active
  scheme. Every `#=GC` line gets one: `SS_cons`, `seq_cons`, Rfam's `RF` and
  motif lines. A `#=GR` line describes one row, so it draws on that row like a
  domain: an active-site line as a mark on each flagged residue (`pAS`), and a
  structure line as **SS helix**, **SS strand** or, for RNA, **SS paired**. They
  start hidden, since an Rfam family carries a structure line for every row with
  a PDB entry; **Settings → Annotations** lists each type to turn on.
- **Base pairs**: the same `#=GC SS_cons` annotation drawn as arcs joining the
  columns that pair, shown whenever a Stockholm file carries one. Pseudoknot
  pairs get their own color. WUSS writes those pairs as `A`/`a` because they
  cross a helix and brackets can only nest; the arcs show the crossing.

[![](media/sequence-logo.png)][live-sequence-logo]

The sequence logo over the IL2RA alignment. Tall single letters mark the columns
the family holds constant, short stacks mark the columns that vary, and the
gap-only stretch in the middle is blank, matching the run of `-` in the rows
below it.

Check "Include tracks?" in the export dialog to include tracks in an SVG export.

A host can also supply a track as data. A `columnTracks` entry in the shared URL
or session carries per-column values drawn as bars, a per-column string drawn
like a Stockholm annotation line, or pairs of positions drawn as arcs. Values
can index alignment columns or the residues of one row, and each track gets a
name, a color and its own menu entry. Use an arc track for a pairing: a
disulfide bond, a residue contact from a structure, a base pair the file does
not already annotate. The [layers reference](https://gmod.org/JBrowseMSA/layers)
lists the fields.

## Settings reference

The header's menu bar reads **File**, **View**, **Tools** and **Help**, and the
**Settings** button beside it opens a panel beside the alignment, so a setting's
effect shows as it changes.

[![](media/settings-menu.png)][live-settings-menu]

- **File** opens another alignment or an annotation file, exports an SVG or the
  tree, and shows the alignment info.
- **View** holds **Find row or column…** and the Zoom submenu, which repeats
  **Zoom on scroll**.
- The **Settings** panel has a section each for Color, Tree, Alignment,
  Annotations and Tracks. Color picks what fills the cells, residues, domains or
  nothing, then lists the common residue schemes for the alignment's alphabet,
  with the rest under **More schemes**. Alignment's Gappy columns hides each
  column where at least 50%, 90% or a custom share of the rows has a gap, and a
  chip in the header counts the hidden columns; its × shows them again.
- **Tools** builds a neighbor joining tree.
- **Help** lists the mouse and keyboard controls and links the tutorials and the
  credits.

## Scaling to large data

The viewer tiles both axes, so memory and draw time grow with the visible area,
not with the size of the file.

[![](media/pfam-scale.png)][live-pfam-scale]

The whole Globin family from Pfam (PF00042) as the InterPro API serves it:
20,705 sequences over 672 columns, 20 MB of Stockholm behind a 3 MB gzipped
response. The first column paints about four seconds after the link opens. After
that the canvas draws only the tiles on screen, so scrolling and zooming stay
interactive.

## Embedding and related projects

- [Embedding guide](https://gmod.org/JBrowseMSA/embedding): React, UMD-in-HTML,
  and the R package.
- [JBrowse 2 integration](https://gmod.org/JBrowseMSA/tutorials/jbrowse_integration):
  the viewer as a view inside JBrowse 2, connected to a genome view and 3D
  structure.
- [jbrowse-plugin-msaview](https://github.com/GMOD/jbrowse-plugin-msaview): the
  JBrowse 2 plugin ([demo](https://jbrowse.org/demos/app)).
- [ProteinBrowser](https://github.com/GMOD/proteinbrowser): a protein-analysis
  suite built on this viewer.

<!-- live-demo links (generated by genGuideLinks.mjs) -->

[live-import-form]: https://gmod.org/JBrowseMSA/demo/
[live-color-scheme-menu]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22colorSchemeName%22%3A%22clustal%22%7D%7D>
[live-colorscheme-clustalx]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A185%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%7D%7D>
[live-colorscheme-pid]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A185%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22colorSchemeName%22%3A%22percent_identity_dynamic%22%7D%7D>
[live-tree-collapse]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A185%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22collapsed%22%3A%5B%22node-0-0-1-0-2-1-3%22%5D%7D%7D>
[live-real-domains]:
  https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A360%2C%22treeAreaWidth%22%3A175%2C%22colWidth%22%3A2%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fkinase.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fkinase.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fkinase-domains.gff%22%7D%7D%7D
[live-domain-loss-closeup]:
  https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A14%2C%22rowHeight%22%3A20%2C%22scrollX%22%3A-476%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D
[live-metadata-dialog]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A185%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%7D%7D>
[live-export-svg-dialog]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A185%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%7D%7D>
[live-sequence-logo]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A260%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22colorSchemeName%22%3A%22maeditor%22%2C%22turnedOffTracks%22%3A%7B%22sequence-logo%22%3Afalse%2C%22conservation%22%3Atrue%7D%7D%7D>
[live-settings-menu]:
  <https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A760%2C%22treeAreaWidth%22%3A250%2C%22data%22%3A%7B%22msa%22%3A%22CLUSTAL%20O(1.2.3)%20multiple%20sequence%20alignment%5CnUniProt%7CP26898%7CIL2RA_SHEEP%20%20%20%20%20%20MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM%5CnUniProt%7CP01590%7CIL2RA_MOUSE%20%20%20%20%20%20MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI%5CnUniProt%7CP41690%7CIL2RA_FELCA%20%20%20%20%20%20MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM%5CnUniProt%7CP01589%7CIL2RA_HUMAN%20%20%20%20%20%20MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM%5CnUniProt%7CQ5MNY4%7CIL2RA_MACMU%20%20%20%20%20%20MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM%5CnUniProt%7CP26896%7CIL2RB_RAT%20%20%20%20%20%20%20%20MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV%5Cn%22%2C%22tree%22%3A%22(((UniProt%7CP26898%7CIL2RA_SHEEP%3A0.24%2C(UniProt%7CP41690%7CIL2RA_FELCA%3A0.18%2C(UniProt%7CP01589%7CIL2RA_HUMAN%3A0.04%2CUniProt%7CQ5MNY4%7CIL2RA_MACMU%3A0.04)%3A0.13)%3A0.05)%3A0.02%2CUniProt%7CP01590%7CIL2RA_MOUSE%3A0.23)%3A0.07%2CUniProt%7CP26896%7CIL2RB_RAT%3A0.34)%3B%22%7D%2C%22colorSchemeName%22%3A%22maeditor%22%7D%7D>
[live-pfam-scale]:
  https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A120%2C%22colWidth%22%3A9%2C%22rowHeight%22%3A2%2C%22allowedGappyness%22%3A50%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22https%3A%2F%2Fwww.ebi.ac.uk%2Finterpro%2Fapi%2Fentry%2Fpfam%2FPF00042%2F%3Fannotation%3Dalignment%3Afull%22%7D%7D%7D
