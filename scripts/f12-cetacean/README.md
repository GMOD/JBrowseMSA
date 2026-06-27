# F12 cetacean pseudogenization example (DNA)

Builds the DNA example used on the **Genome browser** docs page: the coagulation
factor XII (**F12**) coding alignment across mammals, where the gene is intact
in land mammals and the hippopotamus but **disabled (premature stop codons +
frameshifts) in cetaceans** — whales, dolphins, porpoises — one of the genes
lost in the transition to fully aquatic life.

Everything is built **reproducibly from a single public source** (UCSC's cactus
241-way mammalian alignment), so the provenance and method are visible rather
than pasted in as an opaque blob — same philosophy as `scripts/examples-gen/`.

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
#    the premature stops in the cetacean lineages (prints a per-species table).
python3 scripts/f12-cetacean/cds_pipeline.py            # writes f12_cds.afa

# 2. infer a neighbor-joining tree from the alignment
clustalw -INFILE=f12_cds.afa -TREE -TYPE=DNA -OUTPUTTREE=phylip   # -> f12_cds.ph (Newick)

# 3. wrap as Stockholm with the tree embedded (#=GF NH) — what react-msaview loads.
#    A windowed version around the shared cetacean frameshift (CDS col ~205) is the
#    region shown by default in the docs link.
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
| hippopotamus (semi-aquatic, sister to cetaceans)       | 0                      | intact   |
| cow, pig, dog, horse, mouse, elephant, … (terrestrial) | 0                      | intact   |

## Outputs (committed under `packages/app/public/data/`, served at `gmod.org/JBrowseMSA/demo/data/`)

| File                               | What                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| `f12-cetacean-cds.stock`           | full F12 CDS alignment + embedded NJ tree                           |
| `f12-cetacean-region.stock`        | windowed on the shared cetacean frameshift (the docs default)       |
| `multiz470way-mammals.nh`          | pruned species tree for the genome-browser MAF track                |
| `jbrowse-msa-combined-config.json` | JBrowse config: hg38 + gene track + Multiz MAF + the MsaView plugin |
