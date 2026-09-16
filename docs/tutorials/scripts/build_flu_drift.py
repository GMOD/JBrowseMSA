#!/usr/bin/env python3
"""Build an H3N2 hemagglutinin alignment, tree and drift track in a kernel.

    python build_flu_drift.py [outdir]

Every step is the one shown in docs/tutorials/notebook_flu_drift.md, in the
order the notebook runs them.

Needs: biopython, numpy, pandas, and clustalw on PATH (apt install clustalw,
brew install clustal-w). `pip install msaview-widget` adds the viewer the
notebook draws this with; the script itself writes the files and the link.
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.parse
from pathlib import Path

import numpy as np
import pandas as pd
from Bio import Entrez, Phylo, SeqIO
from Bio.Align import MultipleSeqAlignment
from Bio.Phylo.TreeConstruction import DistanceCalculator, DistanceTreeConstructor

Entrez.email = "msaview@example.org"

out = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
out.mkdir(parents=True, exist_ok=True)

# The H3N2 component of the northern hemisphere vaccine, one strain per
# reformulation, with the GenBank protein accession of a full-length HA0 for
# each. `esearch db=protein -query '"A/Darwin/9/2021"[All Fields] AND
# hemagglutinin[Protein Name]'` finds these; they are pinned so a rerun
# aligns the same records.
STRAINS = [
    (1968, "A/Hong Kong/1/1968", "AFG71887.1"),
    (1972, "A/England/42/1972", "AFM71912.1"),
    (1975, "A/Victoria/3/1975", "AFG98995.1"),
    (1977, "A/Texas/1/1977", "AFG99105.1"),
    (1979, "A/Bangkok/1/1979", "AFM68976.1"),
    (1987, "A/Sichuan/2/1987", "AFM72098.1"),
    (1989, "A/Shanghai/11/1987", "AFG99248.1"),
    (1992, "A/Beijing/32/1992", "AIU46033.1"),
    (1995, "A/Wuhan/359/1995", "AIU46043.1"),
    (1997, "A/Sydney/5/1997", "AIU46057.1"),
    (1999, "A/Moscow/10/1999", "AFM72208.1"),
    (2002, "A/Fujian/411/2002", "AIU46065.1"),
    (2004, "A/California/7/2004", "AIU46075.1"),
    (2005, "A/Wisconsin/67/2005", "AIU46082.1"),
    (2007, "A/Brisbane/10/2007", "AIU46080.1"),
    (2009, "A/Perth/16/2009", "AJK01457.1"),
    (2011, "A/Victoria/361/2011", "AIU46088.1"),
    (2012, "A/Texas/50/2012", "WCF71160.1"),
    (2013, "A/Switzerland/9715293/2013", "WCF71248.1"),
    (2014, "A/Hong Kong/4801/2014", "WCF71375.1"),
    (2016, "A/Singapore/INFIMH-16-0019/2016", "WCF71352.1"),
    (2017, "A/Kansas/14/2017", "WMZ92394.1"),
    (2019, "A/Hong Kong/2671/2019", "WMW30924.1"),
    (2021, "A/Darwin/9/2021", "XZO11388.1"),
    (2022, "A/Massachusetts/18/2022", "YGK08660.1"),
]

# HA0 is a signal peptide, then HA1, then HA2, and H3 numbering starts at HA1's
# first residue. Every position below is H3 numbering, converted on use.
SIGNAL = 16
HA1_LENGTH = 329
SITE_B = [(155, 160), (186, 198)]
FUSION_PEPTIDE = (HA1_LENGTH + 1, HA1_LENGTH + 11)

strains = pd.DataFrame(STRAINS, columns=["year", "strain", "accession"])
strains["row"] = [
    f"{year}_{strain.split('/')[1].replace(' ', '')}"
    for year, strain in zip(strains.year, strains.strain)
]

# 1. the sequences, one request for all twenty-five
with Entrez.efetch(
    db="protein", id=",".join(strains.accession), rettype="fasta", retmode="text"
) as handle:
    records = {r.id: r for r in SeqIO.parse(handle, "fasta")}

for row, accession in zip(strains.row, strains.accession):
    records[accession].id = row
    records[accession].description = ""

ordered = [records[a] for a in strains.accession]
strains["length"] = [len(r.seq) for r in ordered]
print(strains[["year", "strain", "accession", "length"]].to_string(index=False))

fasta = out / "h3n2-ha.fasta"
SeqIO.write(ordered, fasta, "fasta")

# 2. align
subprocess.run(
    ["clustalw", f"-INFILE={fasta}", "-ALIGN", "-TYPE=PROTEIN",
     "-OUTPUT=FASTA", f"-OUTFILE={out / 'h3n2-ha.aln'}"],
    check=True, stdout=subprocess.DEVNULL,
)
# ClustalW writes its output in guide-tree order, and the viewer draws the rows
# a file gives it, so the alignment goes back in year order
aligned = {r.id: r for r in SeqIO.parse(out / "h3n2-ha.aln", "fasta")}
SeqIO.write([aligned[row] for row in strains.row], out / "h3n2-ha.aln", "fasta")
by_row = {row: str(aligned[row].seq) for row in strains.row}
columns = np.array([list(by_row[row]) for row in strains.row])
print(f"\nalignment: {columns.shape[0]} rows x {columns.shape[1]} columns")

# 3. neighbor joining from the alignment's own distances, rooted on the oldest
#    strain. The tree comes from the sequences, and carries no year.
msa = MultipleSeqAlignment([aligned[row] for row in strains.row])
tree = DistanceTreeConstructor().nj(DistanceCalculator("blosum62").get_distance(msa))
tree.root_with_outgroup(strains.row[0])
for clade in tree.find_clades():
    if not clade.is_terminal():
        clade.name = None
Phylo.write(tree, out / "h3n2-ha.nh", "newick")

# a clock: how far a strain sits from the 1968 root, against the year it was
# chosen for the vaccine
depth = tree.depths()
distance = [depth[t] for t in tree.get_terminals()]
year = [int(t.name.split("_")[0]) for t in tree.get_terminals()]
print(f"root-to-tip distance against year: r = {np.corrcoef(distance, year)[0, 1]:.3f}")

# 4. how often a column changed from one vaccine strain to the next
changes = (columns[:-1] != columns[1:]).sum(axis=0)
print(f"\ncolumns that never changed: {(changes == 0).sum()} of {len(changes)}")
print(f"the busiest column changed {changes.max()} times")
print(
    f"the 2022 strain matches the 1968 one in {(columns[0] == columns[-1]).sum()} "
    f"of {len(changes)} columns"
)

# every position below is a column of the alignment, through the gaps of the
# first row
reference = strains.row[0]
residue_column = np.cumsum([c != "-" for c in by_row[reference]])
def column_of(residue: int) -> int:
    return int(np.argmax(residue_column == residue))

def h3(position: int) -> int:
    """H3 numbering -> residue of the record, which counts the signal peptide."""
    return position + SIGNAL

# 5. what the busiest columns read, year by year
site_b = [h3(p) for start, end in SITE_B for p in range(start, end + 1)]
fusion = list(range(h3(FUSION_PEPTIDE[0]), h3(FUSION_PEPTIDE[1]) + 1))

def read(positions):
    at = [column_of(r) for r in positions]
    return ["".join(columns[i, at]) for i in range(len(strains))]

reading = pd.DataFrame(
    {
        "year": strains.year,
        "site B (155-160, 186-198)": read(site_b),
        "fusion peptide (HA2 1-11)": read(fusion),
    }
)
print("\n" + reading.to_string(index=False))
print(f"\nsite B reads {reading.iloc[:, 1].nunique()} distinct strings in 25 strains, "
      f"the fusion peptide {reading.iloc[:, 2].nunique()}")

# 6. the layers: the drift track, and a band on each of the two regions
layers = {
    "generatedBy": "docs/tutorials/scripts/build_flu_drift.py",
    "columnTracks": [
        {
            "id": "drift",
            "name": "Changes between consecutive strains",
            "kind": "bar",
            "values": changes.tolist(),
            "max": int(changes.max()),
            "color": "#c0392b",
            "height": 60,
        }
    ],
    "highlights": [
        {"row": reference, "start": h3(155), "end": h3(160), "label": "site B 155-160"},
        {"row": reference, "start": h3(186), "end": h3(198), "label": "site B 186-198"},
        {
            "row": reference,
            "start": h3(FUSION_PEPTIDE[0]),
            "end": h3(FUSION_PEPTIDE[1]),
            "label": "fusion peptide",
            "color": "rgba(0,120,255,0.18)",
        },
    ],
}
(out / "h3n2-layers.json").write_text(json.dumps(layers, indent=1))

snapshot = {
    "msaview": {
        "type": "MsaView",
        "height": 560,
        "treeAreaWidth": 150,
        "colWidth": 2.2,
        "rowHeight": 16,
        "colorSchemeName": "clustalx_protein_dynamic",
        "msaFilehandle": {"uri": "data/h3n2/h3n2-ha.aln"},
        "treeFilehandle": {"uri": "data/h3n2/h3n2-ha.nh"},
        "columnTracks": layers["columnTracks"],
        "highlights": layers["highlights"],
    }
}
link = "https://gmod.org/JBrowseMSA/demo/?data=" + urllib.parse.quote(
    json.dumps(snapshot, separators=(",", ":")), safe=""
)
(out / "h3n2-link.url").write_text(link + "\n")

print(f"\nwrote {out}/h3n2-ha.aln, h3n2-ha.nh, h3n2-layers.json")
print(f"the link is {len(link)} characters")
