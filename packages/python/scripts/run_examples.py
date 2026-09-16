"""Execute the example notebooks, then screenshot the widgets they built.

    python scripts/run_examples.py              # run every notebook, then render
    python scripts/run_examples.py --no-render  # write the specs only

Each notebook runs top to bottom in a real kernel, with examples/ as its working
directory. A final cell in the same kernel reads the traits off the last
`MSAView` each notebook built and writes them to scripts/screenshot_specs.json,
which scripts/screenshot_examples.mjs renders into docs/media.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError

PACKAGE = Path(__file__).resolve().parent.parent
EXAMPLES = PACKAGE / "examples"
SPECS = PACKAGE / "scripts" / "screenshot_specs.json"

CAPTURE = """
import json as _json
from msaview import MSAView as _MSAView

_widgets = [
    _o
    for _o in [*globals().values(), *globals().get("Out", {{}}).values()]
    if isinstance(_o, _MSAView)
]
_names = [_n for _n in _MSAView.class_own_traits(sync=True) if not _n.startswith("_")]
with open({out!r}, "w") as _f:
    _json.dump({{_n: getattr(_widgets[-1], _n) for _n in _names}}, _f)
"""


def run(path: Path, capture_to: Path) -> dict:
    nb = nbformat.read(path, as_version=4)
    nb.cells.append(nbformat.v4.new_code_cell(CAPTURE.format(out=str(capture_to))))
    client = NotebookClient(
        nb,
        timeout=300,
        kernel_name="python3",
        resources={"metadata": {"path": str(EXAMPLES)}},
        extra_arguments=["--Application.log_level=ERROR"],
    )
    client.execute()
    return json.loads(capture_to.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-render", action="store_true")
    args = parser.parse_args()

    specs, failed = {}, []
    with tempfile.TemporaryDirectory() as tmp:
        for path in sorted(EXAMPLES.glob("*.ipynb")):
            try:
                specs[path.stem] = run(path, Path(tmp) / f"{path.stem}.json")
                print(f"ran {path.name}", flush=True)
            except CellExecutionError as e:
                print(f"FAILED {path.name}: {str(e).strip().splitlines()[-1]}")
                failed.append(path.stem)

    SPECS.write_text(json.dumps(specs, indent=2))
    if not args.no_render and specs:
        script = PACKAGE / "scripts" / "screenshot_examples.mjs"
        if subprocess.run(["node", str(script)], check=False).returncode:
            failed.append("render")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
