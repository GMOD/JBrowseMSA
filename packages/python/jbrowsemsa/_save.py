"""A widget's traits as `MSAViewer` props, drawn to a file by react-msaview-cli."""

from __future__ import annotations

import json
import os
import shlex
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Sequence

DEFAULT_CLI = ("npx", "--yes", "react-msaview-cli")
FORMATS = (".svg", ".png", ".pdf")


def _optional(value: Any) -> Any:
    return None if value == "" else value


def _tree_root(root: Any) -> Any:
    if root is None or root == "" or root == "midpoint":
        return _optional(root)
    return {"outgroup": [root] if isinstance(root, str) else list(root)}


def props(view: Any) -> dict[str, Any]:
    """The props `propsFromModel` in src/render.ts builds from the same traits.
    `theme="auto"` follows the notebook in the browser and is light here."""
    theme = view.theme
    out = {
        "msa": _optional(view.msa),
        "tree": _optional(view.tree),
        "gff": _optional(view.gff),
        "msaUrl": _optional(view.msa_url),
        "treeUrl": _optional(view.tree_url),
        "gffUrl": _optional(view.gff_url),
        "msaFilehandle": view.msa_filehandle,
        "treeFilehandle": view.tree_filehandle,
        "gffFilehandle": view.gff_filehandle,
        "residueColor": view.residue_color,
        "height": view.height,
        "colWidth": view.col_width,
        "rowHeight": view.row_height,
        "allowedGappyness": view.allowed_gappyness,
        "highlights": view.highlights,
        "features": view.features,
        "highlightColumns": view.highlight_columns,
        "clades": view.clades,
        "columnTracks": view.column_tracks,
        "residueMappings": view.residue_mappings,
        "rowData": view.row_data,
        "encodings": view.encodings,
        "rowPanels": view.row_panels,
        "rowTransform": view.row_transform,
        "relativeTo": _optional(view.relative_to),
        "region": view.region,
        "selection": view.selection,
        "trimToSelection": view.trim_to_selection,
        "drawTree": view.draw_tree,
        "treeAreaWidth": view.tree_area_width,
        "showBranchLen": view.show_branch_len,
        "treeOrder": view.tree_order,
        "treeRoot": _tree_root(view.tree_root),
        "hideHeader": view.hide_header,
        "theme": None if theme == "auto" else theme,
    }
    return {k: v for k, v in out.items() if v is not None}


def save(
    view: Any,
    path: str | os.PathLike[str],
    width: int = 1200,
    scale: float | None = None,
    cli: str | Sequence[str] | None = None,
) -> Path:
    path = Path(path)
    if path.suffix.lower() not in FORMATS:
        raise ValueError(f"{path.name}: the file must end in .svg, .png or .pdf")
    if cli is None:
        cli = DEFAULT_CLI
    command = shlex.split(cli) if isinstance(cli, str) else list(cli)
    with tempfile.TemporaryDirectory() as tmp:
        props_file = Path(tmp) / "props.json"
        props_file.write_text(json.dumps(props(view)))
        args = ["export-svg", "--props", str(props_file), "--width", str(width), "-o", str(path)]
        if scale is not None:
            args += ["--scale", str(scale)]
        try:
            result = subprocess.run([*command, *args], capture_output=True, text=True)
        except FileNotFoundError as e:
            raise RuntimeError(
                f"{command[0]} not found: saving runs react-msaview-cli, which needs Node.js"
            ) from e
    if result.returncode != 0:
        raise RuntimeError(f"react-msaview-cli failed:\n{result.stderr or result.stdout}")
    return path
