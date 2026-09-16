import json
import re
from pathlib import Path

import pytest
import traitlets

from msaview import MSAView

SRC = Path(__file__).resolve().parents[1] / "src" / "render.ts"


def synced_traits():
    return {n for n in MSAView.class_own_traits(sync=True) if not n.startswith("_")}


def test_defaults_leave_every_prop_to_the_viewer():
    view = MSAView()
    assert {n: getattr(view, n) for n in synced_traits()} == {
        "msa": "",
        "tree": "",
        "gff": "",
        "msa_url": "",
        "tree_url": "",
        "gff_url": "",
        "color_scheme": None,
        "height": None,
        "col_width": None,
        "row_height": None,
        "allowed_gappyness": None,
        "highlights": [],
        "highlight_columns": [],
        "column_tracks": [],
        "residue_mappings": [],
        "relative_to": None,
        "region": None,
        "draw_tree": True,
        "tree_area_width": None,
        "auto_tree_area_width": False,
        "show_branch_len": True,
        "bg_color": True,
        "hide_header": False,
        "theme": "auto",
        "clicked": None,
        "viewport": None,
    }
    json.dumps({n: getattr(view, n) for n in synced_traits()})


def test_the_front_end_reads_the_traits_python_declares():
    source = SRC.read_text()
    inputs = set(re.findall(r"^  '([a-z_]+)',$", source, re.MULTILINE))
    read = set(re.findall(r"model\.get\('([a-z_]+)'\)", source))
    reported = set(re.findall(r"report\(model, '([a-z_]+)'", source))
    assert inputs == synced_traits() - {"clicked", "viewport"}
    assert read <= inputs
    assert reported == {"clicked", "viewport"}


def test_read_back_traits_refuse_assignment_from_python():
    view = MSAView()
    with pytest.raises(traitlets.TraitError):
        view.clicked = {"column": 1}


def test_theme_takes_a_mode_or_theme_options():
    assert MSAView(theme="dark").theme == "dark"
    options = {"palette": {"primary": {"main": "#6a51a3"}}}
    assert MSAView(theme=options).theme == options
    with pytest.raises(traitlets.TraitError):
        MSAView(theme="sepia")


def test_positional_msa_and_tree():
    view = MSAView(">a\nMK\n", "(a);")
    assert (view.msa, view.tree) == (">a\nMK\n", "(a);")
