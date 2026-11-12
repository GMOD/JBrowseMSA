import os
import re
import sys
from pathlib import Path

import pytest

from jbrowsemsa import MSAView
from jbrowsemsa._save import props

SRC = Path(__file__).resolve().parents[1] / "src" / "render.ts"
MSA = ">Homo sapiens\nMKAANSE\n>Mouse\nMKA-NSE\n"


def front_end_props():
    source = SRC.read_text()
    body = re.search(r"export function propsFromModel.*?\n}\n", source, re.DOTALL)
    return set(re.findall(r"^    (\w+):", body.group(0), re.MULTILINE))


def test_save_writes_every_prop_the_front_end_sends():
    view = MSAView(
        msa=MSA,
        tree="(a,b);",
        gff="##gff-version 3\n",
        msa_url="https://example.org/a.fa",
        tree_url="https://example.org/a.nh",
        gff_url="https://example.org/a.gff",
        msa_filehandle={"uri": "a.fa", "locationType": "UriLocation"},
        tree_filehandle={"uri": "a.nh", "locationType": "UriLocation"},
        gff_filehandle={"uri": "a.gff", "locationType": "UriLocation"},
        residue_color={"scale": {"scheme": "clustal"}},
        height=300,
        col_width=10,
        row_height=12,
        allowed_gappyness=50,
        relative_to="Mouse",
        row_transform={"sort": [{"field": "host"}]},
        region={"start": 1, "end": 3},
        selection={"start": 1, "end": 2},
        tree_area_width=150,
        tree_order="input",
        tree_root="a",
        theme="dark",
    )
    assert set(props(view)) == front_end_props()


def test_props_convert_the_traits_the_way_render_ts_does():
    letters = {"field": "residue", "scale": {"domain": ["A"], "range": ["red"]}}
    view = MSAView(msa=MSA, residue_color=letters, tree_root="Mouse", msa_url="https://x.org/a.fa")
    p = props(view)
    assert p["residueColor"] == letters
    assert p["treeRoot"] == {"outgroup": ["Mouse"]}
    assert p["msaUrl"] == "https://x.org/a.fa"
    assert "theme" not in p and "height" not in p and "tree" not in p
    assert props(MSAView(tree_root="midpoint"))["treeRoot"] == "midpoint"
    assert props(MSAView(tree_root=["a", "b"]))["treeRoot"] == {"outgroup": ["a", "b"]}


def test_a_file_type_the_cli_cannot_write_is_refused_before_it_runs(tmp_path):
    with pytest.raises(ValueError, match=r"\.svg, \.png or \.pdf"):
        MSAView(msa=MSA).save(tmp_path / "fig.jpg", cli=["false"])


def test_a_missing_command_names_node(tmp_path):
    with pytest.raises(RuntimeError, match="Node.js"):
        MSAView(msa=MSA).save(tmp_path / "fig.svg", cli=["no-such-msaview-cli"])


def test_a_failing_cli_raises_its_output(tmp_path):
    script = "import sys; sys.stderr.write('broken'); sys.exit(3)"
    with pytest.raises(RuntimeError, match="broken"):
        MSAView(msa=MSA).save(tmp_path / "fig.svg", cli=[sys.executable, "-c", script])


# MSAVIEW_CLI names the built CLI, packages/cli/dist/index.js
@pytest.mark.skipif(not os.environ.get("MSAVIEW_CLI"), reason="MSAVIEW_CLI is unset")
def test_the_saved_figure_draws_the_widget_layers(tmp_path):
    cli = ["node", os.environ["MSAVIEW_CLI"]]
    view = MSAView(msa=MSA, highlights=[{"start": 2, "end": 4, "label": "motif"}])
    svg = view.save(tmp_path / "fig.svg", cli=cli)
    text = svg.read_text()
    assert "motif" in text and ">Mouse<" in text
    png = view.save(tmp_path / "fig.png", scale=1, cli=cli)
    assert png.read_bytes()[1:4] == b"PNG"
