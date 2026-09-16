import math
from pathlib import Path

import pytest

from msaview import MSAView

DATA = Path(__file__).resolve().parents[2] / "examples" / "data"


def test_a_path_or_a_filename_string_reads_the_file():
    text = (DATA / "globin.aln").read_text()
    assert MSAView(msa=DATA / "globin.aln").msa == text
    assert MSAView(msa=str(DATA / "globin.aln")).msa == text
    assert MSAView(tree=DATA / "globin.nh").tree == (DATA / "globin.nh").read_text()


def test_document_text_passes_through():
    newick = "((a:0.1,b:0.2):0.3,c:0.4);"
    assert MSAView(tree=newick).tree == newick
    assert MSAView(msa=">a\nMK\n>b\nMR\n").msa == ">a\nMK\n>b\nMR\n"
    assert MSAView(gff="##gff-version 3\n").gff == "##gff-version 3\n"


def test_a_url_points_at_the_url_trait():
    with pytest.raises(ValueError, match="msa_url"):
        MSAView(msa="https://example.org/x.aln")


def test_a_path_to_a_missing_file_is_an_error():
    with pytest.raises(FileNotFoundError, match="no such file"):
        MSAView(msa="missing.aln")
    with pytest.raises(FileNotFoundError, match="tree="):
        MSAView(tree="/nowhere/tree.nwk")


def test_a_one_line_document_is_text():
    assert MSAView(tree="(a,b);").tree == "(a,b);"
    assert MSAView(msa=">a MK.1").msa == ">a MK.1"


def test_a_dict_becomes_fasta():
    view = MSAView(msa={"human": "MK-A", "mouse": "MKLA"})
    assert view.msa == ">human\nMK-A\n>mouse\nMKLA\n"


def test_a_row_name_with_whitespace_is_rejected():
    with pytest.raises(ValueError, match="whitespace"):
        MSAView(msa={"Homo sapiens": "MK"})


def test_assignment_converts_like_the_constructor():
    view = MSAView()
    view.msa = {"a": "MK"}
    assert view.msa == ">a\nMK\n"


def test_an_unsupported_type_names_what_is_accepted():
    with pytest.raises(TypeError, match="dict of name"):
        MSAView(msa=42)


def test_biopython_multiple_seq_alignment():
    Align = pytest.importorskip("Bio.Align")
    from Bio.Seq import Seq
    from Bio.SeqRecord import SeqRecord

    aln = Align.MultipleSeqAlignment(
        [SeqRecord(Seq("MK-A"), id="human"), SeqRecord(Seq("MKLA"), id="mouse")]
    )
    assert MSAView(msa=aln).msa == ">human\nMK-A\n>mouse\nMKLA\n"


def test_biopython_alignment():
    Align = pytest.importorskip("Bio.Align")
    import numpy as np
    from Bio.Seq import Seq
    from Bio.SeqRecord import SeqRecord

    records = [SeqRecord(Seq("MKA"), id="human"), SeqRecord(Seq("MKLA"), id="mouse")]
    aln = Align.Alignment(records, np.array([[0, 2, 2, 3], [0, 2, 3, 4]]))
    assert MSAView(msa=aln).msa == ">human\nMK-A\n>mouse\nMKLA\n"


def test_biopython_phylo_tree():
    Phylo = pytest.importorskip("Bio.Phylo")
    from io import StringIO

    tree = Phylo.read(StringIO("((a:0.1,b:0.2):0.3,c:0.4);"), "newick")
    assert MSAView(tree=tree).tree.startswith("((a:0.1")


def test_numpy_and_pandas_values_become_lists():
    np = pytest.importorskip("numpy")
    pd = pytest.importorskip("pandas")
    view = MSAView(
        column_tracks=[
            {"id": "a", "name": "A", "kind": "bar", "values": np.array([0.5, np.nan])},
            {"id": "b", "name": "B", "kind": "bar", "values": pd.Series([1, 2])},
        ]
    )
    assert view.column_tracks[0]["values"] == [0.5, None]
    assert view.column_tracks[1]["values"] == [1, 2]
    assert all(type(v) is int for v in view.column_tracks[1]["values"])


def test_a_float_list_keeps_its_values_and_drops_nan():
    view = MSAView(
        column_tracks=[{"id": "a", "name": "A", "kind": "bar", "values": [1.5, math.nan]}]
    )
    assert view.column_tracks[0]["values"] == [1.5, None]
