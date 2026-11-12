# jbrowsemsa

A notebook widget for [react-msaview](https://github.com/GMOD/JBrowseMSA): a
multiple sequence alignment beside its phylogenetic tree, in JupyterLab, Jupyter
Notebook, VS Code and any other host [anywidget](https://anywidget.dev)
supports. The distribution and the import are both `jbrowsemsa`.

![The globin alignment and tree](../../docs/media/python-quickstart.png)

## Install

The wheel ships the widget's JavaScript, which a checkout builds first:

```sh
pnpm install
pnpm --filter jbrowsemsa build
pip install packages/python
```

## Quick start

```python
from jbrowsemsa import MSAView

view = MSAView(msa="globin.aln", tree="globin.nh", hide_header=True)
view
```

Setting a trait updates the widget in place and keeps its scroll and zoom:

```python
view.color_scheme = "clustal"
view.highlights = [{"row": "Human_beta", "start": 64, "end": 64, "label": "distal His"}]
```

## Traits

The traits are the `MSAViewer` props in
[USAGE.md](https://github.com/GMOD/JBrowseMSA/blob/main/USAGE.md), in snake
case. `highlights` and `column_tracks` take the JSON shapes in
[docs/layers.md](https://github.com/GMOD/JBrowseMSA/blob/main/docs/layers.md).

| Trait                                                 | Value                                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `msa`, `tree`, `gff`                                  | document text or a file path                                                                                               |
| `msa_url`, `tree_url`, `gff_url`                      | a URL the viewer fetches                                                                                                   |
| `msa_filehandle`, `tree_filehandle`, `gff_filehandle` | a JBrowse `FileLocation` dict, which wins over the URL                                                                     |
| `color_scheme`                                        | a scheme name, such as `"clustal"`, or a dict of residue letter to color                                                   |
| `height`                                              | pixels                                                                                                                     |
| `col_width`, `row_height`                             | pixels per column and per row                                                                                              |
| `highlights`                                          | list of `{start, end}`, `{row, start, end}` or `{rows}`                                                                    |
| `features`                                            | list of `{row, start, end, ...}` features, or a DataFrame with those columns                                               |
| `clades`                                              | list of `{mrca or range, tips, mark}` clades of the tree to mark                                                           |
| `highlight_columns`                                   | columns (1-based, like `highlights`), one band per run of adjacent columns                                                 |
| `residue_mappings`                                    | which structure residue each row residue is                                                                                |
| `column_tracks`                                       | list of bar, strip, text, arc or features tracks; a features track's `features` may be a DataFrame                         |
| `row_data`                                            | extra fields per row name, such as a lineage or a host                                                                     |
| `encodings`                                           | `{channel, field, scale, legend}`: `tipLabel`, `rowTint`, `branch`, `nodePoint`, `featureFill`, `featureLabel`, `rowLabel` |
| `row_panels`                                          | `strip` and `features` panels drawn beside the tree                                                                        |
| `row_transform`                                       | `{filter, sort, facet}` over `row_data` fields: keep, order and band the rows                                              |
| `relative_to`                                         | a row name; other rows draw as their differences from it                                                                   |
| `region`                                              | `{start, end}` columns or `{row, start, end}` residues                                                                     |
| `selection`                                           | the selected block, `{start, end}` columns and optional `rows` names (see below)                                           |
| `trim_to_selection`                                   | hide every column outside `selection`, default `False`                                                                     |
| `allowed_gappyness`                                   | hide columns at least this percent gaps (default 100)                                                                      |
| `draw_tree`, `show_branch_len`                        | booleans, default `True`                                                                                                   |
| `tree_order`                                          | `"branchLength"` (default), `"input"`, `"ladderize"` or `"ladderizeReverse"`                                               |
| `tree_root`                                           | `"midpoint"`, or outgroup tip names: one name or a list                                                                    |
| `tree_area_width`                                     | pixels; unset fits the gutter to the labels and the tree                                                                   |
| `residue_encoding`                                    | `"fill"` (default) paints the cell; `"color"` paints the letter                                                            |
| `hide_header`                                         | boolean, default `False`                                                                                                   |
| `theme`                                               | `"auto"` (default), `"light"`, `"dark"` or MUI theme options                                                               |

`theme="auto"` follows JupyterLab's and Notebook 7's `data-jp-theme-light`
attribute, then VS Code's `data-vscode-theme-kind`, then the browser's
`prefers-color-scheme`, and switches when the host does.

The widget sets three traits from the browser:

- `clicked`: the cell a click pinned, `{column, row, residue, letter}`, or
  `None` after a click clears it
- `viewport`: the columns on screen, `{startColumn, endColumn}`, once a scroll
  or zoom settles
- `selection`: the block the person selected, `{start, end, rows}`, once a drag
  settles, or `None` after Escape clears it

All three are 1-based. `column`, `start` and `end` count every column of the
alignment, `residue` counts the clicked row's own letters, and `rows` names the
selected rows, absent when the block spans every row. A shift-drag on the
alignment selects a block, and a drag along a track selects columns across every
row. `selection` is also an input: assigning it selects that block in the
viewer. The widget keeps hover in the browser, since a comm message per pointer
move would flood the kernel.

```python
view.observe(lambda change: print(change["new"]), "clicked")
```

## Saving a figure

`save()` writes the widget to a `.svg`, `.png` or `.pdf` file with every layer
it draws, through
[react-msaview-cli](https://github.com/GMOD/JBrowseMSA/tree/main/packages/cli):

- It needs Node.js, and runs `npx --yes react-msaview-cli` unless `cli=` names
  another command, such as `["react-msaview-cli"]` for an installed copy
- PNG and PDF need `rsvg-convert` from librsvg
- The figure is the entire alignment; `width` sets the pixel width of the view
  the tree and labels lay out in, and `scale` the pixels per SVG unit of a PNG
- `theme="auto"` saves as light

```python
view.save("globin.pdf")
view.save("globin.png", scale=3)
```

## Python inputs

The package converts only what JSON cannot carry:

- `msa=` takes a `dict` of name to aligned sequence, a Biopython
  `MultipleSeqAlignment`, or a `Bio.Align.Alignment`
- `tree=` takes a `Bio.Phylo` tree
- `msa=`, `tree=` and `gff=` take a `pathlib.Path` or a filename string
- a column track's `values` takes a numpy array or pandas Series, and a NaN in
  it draws no bar

## Examples

[examples/01_quickstart.ipynb](https://github.com/GMOD/JBrowseMSA/blob/main/packages/python/examples/01_quickstart.ipynb)
opens the globin alignment from `packages/examples/data`.
[examples/02_entropy_and_clicks.ipynb](https://github.com/GMOD/JBrowseMSA/blob/main/packages/python/examples/02_entropy_and_clicks.ipynb)
draws per-column Shannon entropy as a bar track, highlights the columns above an
ipywidgets slider's threshold, and prints the letter each row has at a clicked
column.

![Entropy track and highlighted columns](../../docs/media/python-entropy-and-clicks.png)

[Influenza drift in a notebook](https://gmod.org/JBrowseMSA/tutorials/notebook_flu_drift)
is the long version: 25 H3N2 vaccine strains from NCBI, aligned, with a
per-column count of how often each column changed and a band on each antigenic
site.

`scripts/run_examples.py` executes both notebooks in a kernel, and
`scripts/screenshot_examples.mjs` renders the widgets they built into
`docs/media`:

```sh
pip install -e "packages/python[examples]"
python packages/python/scripts/run_examples.py
```

## Development

```sh
pip install -e "packages/python[dev]"
pytest packages/python/tests
pnpm vitest run packages/python
```
