# F12 cetacean pseudogenization example (DNA + gene structure)

Builds the flagship **DNA** gallery example: the coagulation factor XII
(**F12**) coding alignment across mammals, where the gene is intact in land
mammals — and in the **manatee**, a fully aquatic sirenian — but **disabled in
cetaceans** (whales, dolphins, porpoises) by premature stop codons and a shared
single-base frameshift in exon 3. It is one of the genes lost in the cetacean
transition to fully aquatic life (Huelsmann et al. 2019, _Sci. Adv._). The
manatee is the key control: fully aquatic yet F12-intact, so the loss tracks the
cetacean lineage, not aquatic life in general.

The story only exists at the nucleotide level (premature stops, a frameshift
indel), so this is a DNA example, and its **14-exon gene structure is overlaid**
on the alignment the same way InterProScan protein domains are — each exon the
same color across every species (see `exon_gff.py` /
`react-msaview-cli genestructure`).

Everything is built **reproducibly from a single public source** (UCSC's cactus
241-way alignment), so the provenance and method are visible rather than pasted
in as an opaque blob — same philosophy as `scripts/examples-gen/`.

## Source

- Alignment: UCSC **cactus 241-way** bigMaf, hg38
  (`https://hgdownload.soe.ucsc.edu/goldenPath/hg38/cactus241way/cactus241way.bigMaf`).
  Zoonomia placental-mammal set; clean species names; includes hippo, multiple
  cetaceans, manatee and good terrestrial controls.
- Gene model: F12 `NM_000505.4`, hg38 `chr5:177,402,141-177,409,564`, minus
  strand, 14 exons, CDS `177,402,291-177,409,527` (616 codons). From the UCSC
  ncbiRefSeqSelect track.

## Pipeline

Prerequisites: `bigBedToBed` (UCSC kent tools — note this build talks **http**
only, no https) and `clustalw` on PATH.

```sh
# 1. stitch the 14 coding-exon windows into a frame-correct CDS alignment, reverse-
#    complement to coding orientation, and translate in the human frame to VERIFY
#    the premature stops in the cetacean lineages (prints a per-species table:
#    minke/dolphin/beluga/porpoise show 3-4 stops each; manatee and the land
#    mammals show none).
python3 scripts/f12-cetacean/cds_pipeline.py            # writes f12_cds.afa

# 2. infer a neighbor-joining tree from the alignment
clustalw -INFILE=f12_cds.afa -TREE -TYPE=DNA -OUTPUTTREE=phylip   # -> f12_cds.ph (Newick)

# 3. wrap as Stockholm with the tree embedded (#=GF NH) -> f12CdsMSA constant in
#    packages/examples/src/examples/exampleData.ts (served as
#    data/f12-cetacean-cds.stock by scripts/screenshots/writeExampleData.mjs).

# 4. project the 14-exon gene structure onto every row of the alignment as a GFF
#    overlay (each species's Nth exon -> Name=exon-N, so an exon is one color
#    across species). No network:
python3 scripts/f12-cetacean/exon_gff.py f12-cetacean-cds.stock > f12-cetacean-exons.gff
#    The general, RefSeq-fetching equivalent (any alignment + transcript) is:
react-msaview-cli genestructure f12-cetacean-cds.stock --gene F12 --ref human -o f12-cetacean-exons.gff
#    Both emit byte-identical features; the f12ExonsGFF constant is the latter's output.
```

`stitch_maf.py CHROM START END OUT.afa` is the lower-level helper: it stitches
an arbitrary genomic window of the bigMaf into a gapped FASTA for a curated
species subset (each bigMaf feature is one MAF block; blocks are concatenated in
reference order, species absent from a block are gap-filled). `cds_pipeline.py`
calls the same logic per coding exon, trimmed to exact reference coordinates so
the reading frame is preserved across the join.

## Verification (human reading frame)

| Lineage                                                | Premature stops in CDS | F12      |
| ------------------------------------------------------ | ---------------------- | -------- |
| minke whale, dolphin, beluga, porpoise (cetaceans)     | 3–4 each + frameshifts | disabled |
| manatee (fully aquatic sirenian — the key control)     | 0                      | intact   |
| hippopotamus (semi-aquatic, sister to cetaceans)       | 0                      | intact   |
| cow, dog, horse, mouse, elephant, … (terrestrial)      | 0                      | intact   |

(Pig is intact too but is **dropped from the committed alignment**: it has ~57%
gaps through the exon-3 frameshift window in this cactus alignment, so it read as
a near-empty row in the figures. The `SPECIES` list in `cds_pipeline.py` reflects
this.)

## Outputs

| Where                                                          | What                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `f12CdsMSA` (exampleData.ts → `data/f12-cetacean-cds.stock`)   | full F12 CDS alignment + embedded NJ tree                                            |
| `f12ExonsGFF` (exampleData.ts → `data/f12-cetacean-exons.gff`) | 14-exon gene-structure overlay, projected per species                                |
| `packages/examples/src/examples/F12.tsx`                       | the gallery example (DNA + nucleotide coloring + exon overlay)                       |
| `docs/media/f12-exon-architecture.png`, `f12-frameshift.png`   | gallery figures (scripts/screenshots/specs.mjs)                                      |
| `docs/media/genome-browser-f12.png`                            | the genomic-coordinate view + Multiz MAF (scripts/screenshots/f12-genome-figure.mjs) |
