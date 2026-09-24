"""react-msaview as a notebook widget.

The traits are the viewer's `MSAViewer` props in snake case, documented in
https://github.com/GMOD/JBrowseMSA/blob/main/USAGE.md, and `highlights` and
`column_tracks` take the JSON shapes in docs/layers.md there::

    from msaview import MSAView

    MSAView(msa="globin.aln", tree="globin.nh", hide_header=True)

A `row_panels` record draws beside the tree. `kind="features"` draws the spans
the GFF carries as arrows in a column of their own, over each row's residue
positions and aligned on one gene, which needs no alignment at all::

    MSAView(
        tree="marker.nh",
        gff="neighborhoods.gff",
        row_panels=[
            {
                "kind": "features",
                "x": "position",
                "width": 320,
                "header": "neighborhood",
                "encoding": {
                    "color": {"field": "Name", "scale": {"palette": "set1"}},
                    "label": "Name",
                },
                "transform": [{"type": "align", "on": "genE"}],
            }
        ],
    )
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

import anywidget
import traitlets

from ._convert import column_track, gff_text, msa_text, tree_text

__all__ = ["MSAView"]


class _Document(traitlets.Unicode):
    """A text trait that also accepts what `convert` turns into text."""

    def __init__(self, convert: Callable[[Any], str], **kwargs: Any) -> None:
        self._convert = convert
        super().__init__("", **kwargs)

    def validate(self, obj: Any, value: Any) -> str:
        return super().validate(obj, self._convert(value))


class _ColumnTracks(traitlets.List):
    def validate(self, obj: Any, value: Any) -> list[dict[str, Any]]:
        return super().validate(obj, [column_track(t) for t in value])


class MSAView(anywidget.AnyWidget):
    _esm = Path(__file__).parent / "static" / "widget.js"

    msa = _Document(msa_text).tag(sync=True)
    tree = _Document(tree_text).tag(sync=True)
    gff = _Document(gff_text).tag(sync=True)
    msa_url = traitlets.Unicode("").tag(sync=True)
    tree_url = traitlets.Unicode("").tag(sync=True)
    gff_url = traitlets.Unicode("").tag(sync=True)

    color_scheme = traitlets.Unicode(None, allow_none=True).tag(sync=True)
    height = traitlets.Int(None, allow_none=True).tag(sync=True)
    col_width = traitlets.Float(None, allow_none=True).tag(sync=True)
    row_height = traitlets.Float(None, allow_none=True).tag(sync=True)
    allowed_gappyness = traitlets.Float(None, allow_none=True).tag(sync=True)
    highlights = traitlets.List(traitlets.Dict()).tag(sync=True)
    highlight_columns = traitlets.List(traitlets.Int()).tag(sync=True)
    # clades of the tree with a mark over them, keyed by tip names
    clades = traitlets.List(traitlets.Dict()).tag(sync=True)
    column_tracks = _ColumnTracks(traitlets.Dict()).tag(sync=True)
    residue_mappings = traitlets.List(traitlets.Dict()).tag(sync=True)
    # extra fields per row name, and what the viewer's marks read from that
    # table or from the features the GFF carries
    row_data = traitlets.Dict(traitlets.Dict()).tag(sync=True)
    encodings = traitlets.List(traitlets.Dict()).tag(sync=True)
    # panels between the tree and the alignment: a colored cell per row, or
    # the GFF's spans as arrows
    row_panels = traitlets.List(traitlets.Dict()).tag(sync=True)
    relative_to = traitlets.Unicode(None, allow_none=True).tag(sync=True)
    region = traitlets.Dict(default_value=None, allow_none=True).tag(sync=True)
    draw_tree = traitlets.Bool(True).tag(sync=True)
    tree_area_width = traitlets.Float(None, allow_none=True).tag(sync=True)
    auto_tree_area_width = traitlets.Bool(False).tag(sync=True)
    show_branch_len = traitlets.Bool(True).tag(sync=True)
    tree_order = traitlets.Enum(
        ["branchLength", "input", "ladderize", "ladderizeReverse"],
        default_value=None,
        allow_none=True,
    ).tag(sync=True)
    # "midpoint", or the outgroup's tip names
    tree_root = traitlets.Union(
        [traitlets.Enum(["midpoint"]), traitlets.List(traitlets.Unicode())],
        default_value=None,
        allow_none=True,
    ).tag(sync=True)
    residue_encoding = traitlets.Enum(["fill", "color"], default_value="fill").tag(sync=True)
    hide_header = traitlets.Bool(False).tag(sync=True)
    # "auto" follows the notebook's light or dark theme; a dict is MUI theme
    # options merged over the JBrowse theme
    theme = traitlets.Union(
        [traitlets.Enum(["auto", "light", "dark"]), traitlets.Dict()],
        default_value="auto",
    ).tag(sync=True)

    # set by the viewer: the cell a click pinned, and the alignment columns on
    # screen once a scroll or zoom settles, both 1-based. Hover stays in the
    # browser, since a message per pointer move would flood the kernel.
    clicked = traitlets.Dict(default_value=None, allow_none=True, read_only=True).tag(sync=True)
    viewport = traitlets.Dict(default_value=None, allow_none=True, read_only=True).tag(sync=True)

    def __init__(self, msa: Any = None, tree: Any = None, **kwargs: Any) -> None:
        super().__init__(msa=msa, tree=tree, **kwargs)
