#!/usr/bin/env python3
"""Project F12's coding-exon boundaries onto every row of the CDS alignment and
write a gene-structure GFF that react-msaview overlays on the alignment (same
mechanism as an InterProScan domain GFF). Every species' Nth exon is named
`exon-N`, so the overlay colors a given exon identically across all species and
the exon architecture reads straight down the alignment.

Reference-projection method (this is what `react-msaview-cli genestructure`
generalizes to any alignment + RefSeq transcript):
  1. human exon lengths (nt, coding orientation) -> cumulative human CDS coords
  2. human CDS coord -> alignment column  (the Nth non-gap char on the human row)
  3. that column -> each species' own ungapped coord (count non-gap up to it)

So an exon that picks up a frameshifting indel in one lineage gets shorter on
exactly that row, while staying column-aligned with the other species.

Usage:  python3 exon_gff.py f12-cetacean-cds.stock > f12-cetacean-exons.gff
"""
import sys

REF = "human"

# F12 NM_000505.4, hg38 chr5, minus strand. Coding-exon segments (exon n CDS),
# genomic-ascending — identical to the CDS list in cds_pipeline.py.
CDS = [
    (177402291, 177402459), (177402549, 177402698), (177403253, 177403397),
    (177403480, 177403617), (177403858, 177404090), (177404195, 177404413),
    (177404498, 177404664), (177404809, 177404914), (177405053, 177405185),
    (177405322, 177405433), (177405734, 177405805), (177405961, 177406061),
    (177409045, 177409103), (177409470, 177409527),
]
# minus strand: coding (5'->3') order is the reverse of the genomic-ascending list
exon_nt = [e - s for (s, e) in reversed(CDS)]


def read_stock(path):
    seqs, order = {}, []
    with open(path) as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if line.startswith(("#", "//")) or not line.strip():
                continue
            parts = line.split()
            if len(parts) == 2:
                name, seq = parts
                if name not in seqs:
                    seqs[name] = ""
                    order.append(name)
                seqs[name] += seq
    return seqs, order


def seq_pos_to_col(row, seq_pos):
    n = 0
    for col, ch in enumerate(row):
        if ch != "-":
            if n == seq_pos:
                return col
            n += 1
    return len(row)


def main():
    seqs, order = read_stock(sys.argv[1])
    ref = seqs[REF]

    bounds_nt = [0]
    for length in exon_nt:
        bounds_nt.append(bounds_nt[-1] + length)
    bound_cols = [seq_pos_to_col(ref, p) for p in bounds_nt[:-1]] + [len(ref)]

    out = [
        "##gff-version 3",
        "# F12 coding-exon structure projected onto the CDS alignment "
        "(scripts/f12-cetacean/exon_gff.py); NM_000505.4, 14 exons, minus strand",
    ]
    for name in order:
        row = seqs[name]
        for i in range(len(exon_nt)):
            c1, c2 = bound_cols[i], bound_cols[i + 1]
            start = sum(1 for ch in row[:c1] if ch != "-")          # 0-based
            ungapped = sum(1 for ch in row[c1:c2] if ch != "-")
            if ungapped == 0:
                continue  # species has no aligned bases in this exon window
            ex = i + 1
            out.append(
                f"{name}\tNM_000505.4\texon\t{start + 1}\t{start + ungapped}"
                f"\t.\t.\t.\tID={name}.exon{ex};Name=exon-{ex}"
            )
    sys.stdout.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
