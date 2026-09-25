"""Conversions for inputs JSON cannot carry: files, Biopython objects, arrays."""

from __future__ import annotations

import math
import os
import re
from collections.abc import Iterable, Mapping
from io import StringIO
from pathlib import Path
from typing import Any


def _document(value: Any, trait: str) -> str | None:
    """Text from a path or a string, or None for any other type."""
    if value is None:
        return ""
    if isinstance(value, os.PathLike):
        return Path(value).read_text()
    if isinstance(value, str):
        if "\n" not in value and re.match(r"https?://", value):
            raise ValueError(
                f"{trait}= takes a document or a file path; "
                f"pass a URL as {trait}_url= so the viewer fetches it"
            )
        if "\n" not in value:
            if os.path.isfile(value):
                return Path(value).read_text()
            if _looks_like_path(value):
                raise FileNotFoundError(
                    f"{trait}={value!r} looks like a file path and no such file exists"
                )
        return value
    return None


def _looks_like_path(value: str) -> bool:
    """One line ending in an extension, with none of the characters a FASTA,
    Stockholm, Newick or GFF document is made of."""
    return not re.search(r"[\t>#(;]", value) and bool(
        re.search(r"\.[A-Za-z0-9]{1,8}$", value)
    )


def _fasta(rows: Iterable[tuple[str, str]]) -> str:
    lines = []
    for name, seq in rows:
        if not name or re.search(r"\s", name):
            raise ValueError(
                f"row name {name!r} is empty or contains whitespace, and the "
                "FASTA reader ends a row name at the first space"
            )
        lines += [f">{name}", seq]
    return "\n".join(lines) + "\n"


def msa_text(value: Any) -> str:
    """Alignment text from text, a path, a name -> sequence dict, or Biopython.

    Biopython objects are matched by shape: a `MultipleSeqAlignment` iterates
    records with `.id` and `.seq`, and a `Bio.Align.Alignment` has `.sequences`
    for the names and yields one aligned row per index.
    """
    text = _document(value, "msa")
    if text is not None:
        return text
    if isinstance(value, Mapping):
        return _fasta((str(name), str(seq)) for name, seq in value.items())
    if hasattr(value, "sequences") and hasattr(value, "shape"):
        return _fasta(
            (record.id, value[i]) for i, record in enumerate(value.sequences)
        )
    if isinstance(value, Iterable):
        records = list(value)
        if records and all(hasattr(r, "id") and hasattr(r, "seq") for r in records):
            return _fasta((r.id, str(r.seq)) for r in records)
    raise TypeError(
        "msa= takes alignment text, a file path, a dict of name -> aligned "
        f"sequence, or a Biopython alignment, not {type(value).__name__}"
    )


def tree_text(value: Any) -> str:
    """Newick text from text, a path, or a Biopython `Bio.Phylo` tree."""
    text = _document(value, "tree")
    if text is not None:
        return text
    if hasattr(value, "root") and hasattr(value, "get_terminals"):
        from Bio import Phylo

        out = StringIO()
        Phylo.write(value, out, "newick")
        return out.getvalue()
    raise TypeError(
        "tree= takes Newick text, a file path, or a Bio.Phylo tree, "
        f"not {type(value).__name__}"
    )


def gff_text(value: Any) -> str:
    """GFF3 text from text or a path."""
    text = _document(value, "gff")
    if text is not None:
        return text
    raise TypeError(f"gff= takes GFF3 text or a file path, not {type(value).__name__}")


def _json_number(x: Any) -> float | int | None:
    return None if isinstance(x, float) and math.isnan(x) else x


def features(value: Any) -> list[dict[str, Any]]:
    """Features from a list of dicts or a pandas DataFrame, one per row.

    Each needs `row`, `start` and `end`; every other key is a field. JSON has
    no NaN, so a missing value in a DataFrame leaves that field out of the
    feature.
    """
    if hasattr(value, "to_dict"):
        value = value.to_dict("records")
    return [
        {
            key: v
            for key, v in dict(feature).items()
            if v is not None and _json_number(v) is not None
        }
        for feature in value
    ]


def column_track(track: Mapping[str, Any]) -> dict[str, Any]:
    """A column track with a numpy array or pandas Series `values` as a list.

    JSON has no NaN, so a NaN value becomes None, which draws no bar.
    """
    track = dict(track)
    values = track.get("values")
    if values is not None:
        if hasattr(values, "tolist"):
            values = values.tolist()
        track["values"] = [_json_number(x) for x in values]
    return track
