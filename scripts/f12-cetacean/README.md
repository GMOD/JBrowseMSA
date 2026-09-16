# F12 cetacean pseudogenization example (DNA + gene structure)

Builds the **DNA** example: the coagulation factor XII (**F12**) coding
alignment across mammals. The gene is intact in land mammals and in the
**manatee**, a fully aquatic sirenian, and **disabled in cetaceans** (whales,
dolphins, porpoises) by premature stop codons and a shared single-base
frameshift in exon 3. F12 is one of the genes lost in the cetacean transition to
fully aquatic life (Huelsmann et al. 2019, _Sci. Adv._). The manatee is the
control: fully aquatic and F12-intact, so the loss tracks the cetacean lineage,
not aquatic life in general.

The premature stops and the frameshift indel are visible only at the nucleotide
level, so this is a DNA example. Its **14-exon gene structure** is overlaid on
the alignment the way protein domains are, with each exon the same color across
every species (see `exon_gff.py` / `react-msaview-cli genestructure`).

Every file here is built from a single public source, UCSC's cactus 241-way
alignment.

## Source

- Alignment: UCSC **cactus 241-way** bigMaf, hg38
  (`https://hgdownload.soe.ucsc.edu/goldenPath/hg38/cactus241way/cactus241way.bigMaf`).
  Zoonomia placental-mammal set; clean species names; includes hippo, multiple
  cetaceans, manatee and good terrestrial controls.
- Gene model: F12 `NM_000505.4`, hg38 `chr5:177,402,141-177,409,564`, minus
  strand, 14 exons, CDS `177,402,291-177,409,527` (616 codons). From the UCSC
  ncbiRefSeqSelect track.

## Pipeline

Prerequisites: `bigBedToBed` (UCSC kent tools; this build supports **http**
only, not https) and `clustalw` on PATH.

```sh
# 1. stitch the 14 coding-exon windows into a frame-correct CDS alignment, reverse-
#    complement to coding orientation, and translate in the human frame to VERIFY
#    the premature stops in the cetacean lineages (prints a per-species table:
#    minke/dolphin/beluga/porpoise show 3-4 stops each; manatee and the land
#    mammals show none).
python3 scripts/f12-cetacean/cds_pipeline.py            # writes f12_cds.afa

# 2. infer a neighbor-joining tree from the alignment
clustalw -INFILE=f12_cds.afa -TREE -TYPE=DNA -OUTPUTTREE=phylip   # -> f12_cds.ph (Newick)

# 3. wrap as Stockholm with the tree embedded (#=GF NH) ->
#    packages/examples/data/f12-cetacean-cds.stock (served by the demo app once
#    scripts/screenshots/writeExampleData.mjs copies it there).

# 4. project the 14-exon gene structure onto every row of the alignment as a GFF
#    overlay (each species's Nth exon -> Name=exon-N, so an exon is one color
#    across species). No network:
python3 scripts/f12-cetacean/exon_gff.py f12-cetacean-cds.stock > f12-cetacean-exons.gff
#    The general, RefSeq-fetching equivalent (any alignment + transcript) is:
react-msaview-cli genestructure f12-cetacean-cds.stock --gene F12 --ref human -o f12-cetacean-exons.gff
#    Both emit byte-identical features; the committed
#    packages/examples/data/f12-cetacean-exons.gff is the latter's output.
```

`stitch_maf.py CHROM START END OUT.afa` is the lower-level helper: it stitches
an arbitrary genomic window of the bigMaf into a gapped FASTA for a curated
species subset (each bigMaf feature is one MAF block; blocks are concatenated in
reference order, species absent from a block are gap-filled). `cds_pipeline.py`
calls the same logic per coding exon, trimmed to exact reference coordinates so
the reading frame is preserved across the join.

## Verification (human reading frame)

| Lineage                                            | Premature stops in CDS | F12      |
| -------------------------------------------------- | ---------------------- | -------- |
| minke whale, dolphin, beluga, porpoise (cetaceans) | 3–4 each + frameshifts | disabled |
| manatee (fully aquatic sirenian, the control)      | 0                      | intact   |
| hippopotamus (semi-aquatic, sister to cetaceans)   | 0                      | intact   |
| cow, dog, horse, mouse, elephant, … (terrestrial)  | 0                      | intact   |

(Pig is intact too but is **dropped from the committed alignment**: it has ~57%
gaps through the exon-3 frameshift window in this cactus alignment, so it read
as a near-empty row in the figures. The `SPECIES` list in `cds_pipeline.py`
reflects this.)

## Outputs

| Where                                           | What                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `packages/examples/data/f12-cetacean-cds.stock` | full F12 CDS alignment + embedded NJ tree                   |
| `packages/examples/data/f12-cetacean-exons.gff` | 14-exon gene-structure overlay, projected per species       |
| `packages/examples/src/examples/F12.tsx`        | the live example (DNA + nucleotide coloring + exon overlay) |
