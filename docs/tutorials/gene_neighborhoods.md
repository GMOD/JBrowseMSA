# Gene neighborhoods of the tryptophan operon

The tryptophan pathway is one operon in _Escherichia coli_ and a scattered set
of genes in other bacteria. A row of gene arrows per genome, lined up on one
gene and drawn beside a tree, shows which genomes keep the operon together. For
twelve RefSeq bacterial genomes, we:

- cut 8 kb either side of _trpB_ out of each genome and write its genes as GFF
- align the TrpB proteins and infer a tree
- draw each window as a row of gene arrows beside the tree
- line the rows up on _trpE_ and color the genes by role
- open the gene arrows beside the TrpB alignment

## Prerequisites

- `curl`
- python3, standard library only
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.

## The data

RefSeq's own annotation of each of the twelve genomes. Nothing to download: the
build script fetches these.

| What it is                                                      | File                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| One GFF3 per genome, from the NCBI sequence viewer, for example | [NC_000913.3.gff3](https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=NC_000913.3&report=gff3&retmode=text) |

- the TrpB proteins, from NCBI efetch by the `protein_id` on each _trpB_ CDS
  line

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                       | File                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| The neighborhood GFF, 176 genes over twelve rows | [trp-neighborhoods.gff](https://gmod.org/JBrowseMSA/demo/data/neighborhoods/trp-neighborhoods.gff) |
| The TrpB alignment                               | [trpB.afa](https://gmod.org/JBrowseMSA/demo/data/neighborhoods/trpB.afa)                           |
| Its tree                                         | [trpB.nwk](https://gmod.org/JBrowseMSA/demo/data/neighborhoods/trpB.nwk)                           |

</details>

## 1. Cut the window around trpB

The row list is twelve accessions and the label each becomes:

```
NC_000913.3	E_coli
NC_003143.1	Y_pestis
NC_002505.1	V_cholerae
...
```

The script cuts each window out of the genome's full RefSeq annotation. Every
genome here has exactly one _trpB_, which anchors the window, and the script
flips a minus-strand window so that _trpB_ points right in every row:

```python
flip = b['strand'] == '-'
origin = b['end'] if flip else b['start']
lo, hi = origin - flank, origin + flank
inside = [g for g in genes if g['start'] >= lo and g['end'] <= hi]
```

Position 1 of each window is the first base of its first whole gene, not the
base 8,000 before _trpB_, so a row's position does not depend on where the cut
fell:

```python
base = rows[0][0] - 1
rows = [(s - base, e - base, strand, g) for s, e, strand, g in rows]
```

```bash
bash build_gene_neighborhoods.sh trp-rows.tsv .
```

```
  row                     genome genes window  trp genes, 5' to 3'
  E_coli                    4651    17  14150  trpL trpE trpD trpC trpB trpA
  Y_pestis                  4209    15  14581  trpE trpD* trpCF trpB trpA
  V_cholerae                2697    14  14865  trpL trpE trpG trpD trpCF trpB trpA
  S_oneidensis              4464    14  15092  trpE trpG trpD trpCF trpB trpA
  H_influenzae              1801    19  14560  trpB trpA
  P_aeruginosa              5697    12  10742  trpB trpA
  H_pylori                  1603    13  15251  trpE trpG trpD trpCF trpB trpA
  B_subtilis                4536    15  15382  trpE trpD trpC* trpF trpB trpA
  S_aureus                  2872    14  14755  trpE trpG trpD trpC trpF trpB trpA
  C_glutamicum              3079    14  14719  trpL trpE trpG trpD trpCF trpB trpA
  M_tuberculosis            4008    16  15224  trpE trpC trpB trpA
  B_thetaiotaomicron        4848    13  15298  trpB trpE trpG trpD trpC trpF trpA
  176 genes: trp 63, regulator 4, pseudogene 6, other 103
  16 names come from the product table, the rest from RefSeq
  * RefSeq annotates the gene as a pseudogene
```

RefSeq gives many of these genes a product and no gene symbol, so the script
maps eleven product strings to symbols, which names 16 of the 176 genes:

```python
PRODUCT_SYMBOL = [
    ('anthranilate synthase component II', 'trpG'),
    ('anthranilate synthase component I', 'trpE'),
    ('indole-3-glycerol phosphate synthase', 'trpC'),
    ('tryptophan synthase subunit beta', 'trpB'),
    ('tryptophan synthase subunit alpha', 'trpA'),
]
```

The script writes each gene as a GFF3 line at its position in the window, with
its name, role and locus tag:

```
##gff-version 3
E_coli	RefSeq	gene	1	621	.	-	.	Name=yciO;role=other;locus_tag=b1267
E_coli	RefSeq	gene	618	1499	.	-	.	Name=rnm;role=other;locus_tag=b1266
```

## 2. Align TrpB and infer a tree

The tree comes from TrpB, since every genome has one. The script fetches the
twelve proteins by the `protein_id` on each _trpB_ CDS line, and ClustalW aligns
them and infers a tree:

```bash
clustalw -INFILE=trpB.fasta -ALIGN -TYPE=PROTEIN -OUTPUT=FASTA -OUTFILE=trpB.afa
clustalw -INFILE=trpB.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
```

```
  E_coli              NP_415777.1     397 aa
  Y_pestis            WP_002210633.1  396 aa
  ...
  C_glutamicum        WP_004567953.1  417 aa
Alignment Score 95830
  423 columns
```

[![](../media/gene_neighborhoods-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A480%2C%22treeAreaWidth%22%3A250%2C%22rowHeight%22%3A26%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.nwk%22%7D%2C%22colWidth%22%3A2.9%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%7D%7D)

The TrpB alignment with the neighbor-joining tree ClustalW built from it.
E_coli, Y_pestis and H_influenzae share a clade with V_cholerae and S_oneidensis
beside it, and B_thetaiotaomicron has the longest branch, 0.25 substitutions per
site.

## 3. Draw the genes as a features panel

A `rowPanels` record of kind `features` draws the GFF's spans per row.
`x: "position"` places each span by its position in the window, and the panel
packs the spans into lanes per row:

```json
"rowPanels": [
  {
    "kind": "features",
    "x": "position",
    "width": 1120,
    "header": "trp neighborhood",
    "encoding": {
      "fill": {
        "field": "Name",
        "scale": { "domain": ["trpE"], "range": ["#4e79a7"] }
      },
      "text": { "field": "Name" }
    }
  }
]
```

A gene the `domain` leaves out draws grey, so a `domain` of ten trp names colors
66 of the 176 genes. `text` writes the name inside each arrow wherever it fits.

With no alignment loaded, the alignment panel is zero columns wide, and the
conservation, logo and ruler tracks draw nothing.

[![](../media/gene_neighborhoods-2.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A430%2C%22treeAreaWidth%22%3A250%2C%22rowHeight%22%3A26%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2Ftrp-neighborhoods.gff%22%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22features%22%2C%22x%22%3A%22position%22%2C%22width%22%3A1120%2C%22header%22%3A%22trp%20neighborhood%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22trpL%22%2C%22trpE%22%2C%22trpG%22%2C%22trpD%22%2C%22trpC%22%2C%22trpCF%22%2C%22trpF%22%2C%22trpB%22%2C%22trpA%22%2C%22trpI%22%5D%2C%22range%22%3A%5B%22%2376b7b2%22%2C%22%234e79a7%22%2C%22%23a0cbe8%22%2C%22%23f28e2b%22%2C%22%2359a14f%22%2C%22%238cd17d%22%2C%22%23b6992d%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%239c755f%22%5D%7D%7D%2C%22text%22%3A%7B%22field%22%3A%22Name%22%7D%7D%7D%5D%7D%7D)

Twelve rows of gene arrows in window coordinates beside the TrpB tree, each
window turned so that trpB points right. E_coli starts trpE at 1,773 and
B_subtilis at 3,702, so the same gene sits at a different x in each row.

## 4. Line the rows up on trpE

An `align` transform shifts each row so that the first feature named `on` starts
at zero, as gggenes' `make_alignment_dummies` does:

```json
"transform": [{ "type": "align", "on": "trpE" }]
```

The script computes the same shift per row and prints where _trpD_ lands after
it:

```
  E_coli              trpE at 1773, shift -1772: trpD starts at 1562 (genes between: none)
  Y_pestis            trpE at 1992, shift -1991: trpD starts at 1562 (genes between: none)
  V_cholerae          trpE at 2930, shift -2929: trpD starts at 2200 (genes between: trpG)
  S_oneidensis        trpE at 2828, shift -2827: trpD starts at 2343 (genes between: trpG)
  H_influenzae        no trpE in the window, keeps its own origin
  P_aeruginosa        no trpE in the window, keeps its own origin
  H_pylori            trpE at 2819, shift -2818: trpD starts at 2080 (genes between: trpG)
  B_subtilis          trpE at 3702, shift -3701: trpD starts at 1519 (genes between: none)
  S_aureus            trpE at 2780, shift -2779: trpD starts at 1975 (genes between: trpG)
  C_glutamicum        trpE at 2353, shift -2352: trpD starts at 2199 (genes between: trpG)
  M_tuberculosis      trpE at 4610, no trpD in the window
  B_thetaiotaomicron  trpE at 8644, shift -8643: trpD starts at 2046 (genes between: trpG)
```

[![](../media/gene_neighborhoods-3.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A430%2C%22treeAreaWidth%22%3A250%2C%22rowHeight%22%3A26%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2Ftrp-neighborhoods.gff%22%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22features%22%2C%22x%22%3A%22position%22%2C%22width%22%3A1120%2C%22header%22%3A%22trp%20neighborhood%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22trpL%22%2C%22trpE%22%2C%22trpG%22%2C%22trpD%22%2C%22trpC%22%2C%22trpCF%22%2C%22trpF%22%2C%22trpB%22%2C%22trpA%22%2C%22trpI%22%5D%2C%22range%22%3A%5B%22%2376b7b2%22%2C%22%234e79a7%22%2C%22%23a0cbe8%22%2C%22%23f28e2b%22%2C%22%2359a14f%22%2C%22%238cd17d%22%2C%22%23b6992d%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%239c755f%22%5D%7D%7D%2C%22text%22%3A%7B%22field%22%3A%22Name%22%7D%7D%2C%22transform%22%3A%5B%7B%22type%22%3A%22align%22%2C%22on%22%3A%22trpE%22%7D%5D%7D%5D%7D%7D)

The twelve neighborhoods aligned on trpE, so every trpE arrow starts at one x.
trpD starts flush against trpE in E_coli and Y_pestis, and one trpG further
along in the six rows with a trpG between them. H_influenzae and P_aeruginosa
have no trpE, so the transform leaves both rows at the origin of their window.

## 5. Color the genes by role

The script writes a `role` of `trp`, `regulator`, `pseudogene` or `other` on
every GFF line, and pointing the panel's `encoding` at it colors the same spans
by role:

```json
"encoding": {
  "fill": {
    "field": "role",
    "scale": { "domain": ["trp"], "range": ["#4e79a7"] }
  },
  "text": { "field": "Name" }
}
```

[![](../media/gene_neighborhoods-4.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A430%2C%22treeAreaWidth%22%3A250%2C%22rowHeight%22%3A26%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2Ftrp-neighborhoods.gff%22%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22features%22%2C%22x%22%3A%22position%22%2C%22width%22%3A1120%2C%22header%22%3A%22trp%20neighborhood%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22role%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22trp%22%2C%22regulator%22%2C%22pseudogene%22%2C%22other%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%23f28e2b%22%2C%22%23d9d9d9%22%5D%7D%7D%2C%22text%22%3A%7B%22field%22%3A%22Name%22%7D%7D%2C%22transform%22%3A%5B%7B%22type%22%3A%22align%22%2C%22on%22%3A%22trpE%22%7D%5D%7D%5D%7D%7D)

The neighborhoods aligned on trpE and colored by role: blue for the 63 trp
genes, red for the four regulators, orange for the six genes RefSeq annotates as
pseudogenes, grey for the other 103. Y_pestis trpD and B_subtilis trpC show
orange inside otherwise blue runs, and P_aeruginosa's red trpI sits beside its
trpB.

## 6. Open the panel beside the alignment

<!-- usage: web -->

Loading the TrpB alignment puts it to the right of the panel, which takes its
width out of the alignment's:

```json
{
  "msaFilehandle": { "uri": "data/neighborhoods/trpB.afa" },
  "treeFilehandle": { "uri": "data/neighborhoods/trpB.nwk" },
  "gffFilehandle": { "uri": "data/neighborhoods/trp-neighborhoods.gff" },
  "showDomains": false,
  "rowPanels": [{ "kind": "features", "x": "position", "width": 760 }]
}
```

`showDomains` is off because the alignment's overlay reads a GFF span as
residues of the row, and a window position such as 1,562 would land far past the
423rd column.

[![](../media/gene_neighborhoods-5.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A480%2C%22treeAreaWidth%22%3A250%2C%22rowHeight%22%3A26%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2FtrpB.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fneighborhoods%2Ftrp-neighborhoods.gff%22%7D%2C%22colWidth%22%3A0.9%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22showDomains%22%3Afalse%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22features%22%2C%22x%22%3A%22position%22%2C%22width%22%3A760%2C%22header%22%3A%22trp%20neighborhood%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22trpL%22%2C%22trpE%22%2C%22trpG%22%2C%22trpD%22%2C%22trpC%22%2C%22trpCF%22%2C%22trpF%22%2C%22trpB%22%2C%22trpA%22%2C%22trpI%22%5D%2C%22range%22%3A%5B%22%2376b7b2%22%2C%22%234e79a7%22%2C%22%23a0cbe8%22%2C%22%23f28e2b%22%2C%22%2359a14f%22%2C%22%238cd17d%22%2C%22%23b6992d%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%239c755f%22%5D%7D%7D%2C%22text%22%3A%7B%22field%22%3A%22Name%22%7D%7D%2C%22transform%22%3A%5B%7B%22type%22%3A%22align%22%2C%22on%22%3A%22trpE%22%7D%5D%7D%5D%7D%7D)

The trp neighborhood panel between the TrpB tree and the 423 alignment columns,
with the two conservation tracks drawn over the alignment.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same hosted alignment,
tree and GFF, and `geom_msa_features()` takes the panel's colors, labels and
`align` transform as arguments. `features = FALSE` keeps the genome positions
off the alignment, as `showDomains: false` does in the link:

```r
library(ggmsaview)
library(ggplot2)
data <- "https://gmod.org/JBrowseMSA/demo/data/neighborhoods"
trp <- c(
  trpL = "#76b7b2", trpE = "#4e79a7", trpG = "#a0cbe8", trpD = "#f28e2b",
  trpC = "#59a14f", trpCF = "#8cd17d", trpF = "#b6992d", trpB = "#e15759",
  trpA = "#b07aa1", trpI = "#9c755f"
)
w <- msaview(
  msa = file.path(data, "trpB.afa"),
  tree = file.path(data, "trpB.nwk"),
  gff = file.path(data, "trp-neighborhoods.gff")
) +
  geom_msa_features(x = "position", fill = "Name", range = trp,
    label = "Name", align = "trpE", width = 760, header = "trp neighborhood")
w
ggsave("gene_neighborhoods-5-r.png",
  msaview_plot(w, features = FALSE),
  width = 14, height = 5)
```

![](../media/gene_neighborhoods-5-r.png)

The twelve neighborhoods in ggplot2, between the TrpB tree and alignment, each
row shifted so that trpE starts at one x. The trp genes take the colors the key
lists and every other gene is grey. The H. influenzae row has no trpE and stays
at the origin of its window.

<!-- /usage -->

RefSeq places the other tryptophan genes of _Haemophilus influenzae_ and
_Pseudomonas aeruginosa_ elsewhere in each genome, past the 8 kb the window
reaches, so neither row has a _trpE_ to align on.

## Reproduce it end to end

[`build_gene_neighborhoods.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_gene_neighborhoods.sh)
runs every step above:

1. It fetches RefSeq's GFF3 for each genome into `raw/`, where a rerun finds it.
2. It cuts 8 kb either side of _trpB_, turns each window so _trpB_ points right,
   names the genes RefSeq gives only a product, and writes the GFF.
3. It fetches the twelve TrpB proteins, and ClustalW aligns them and infers a
   neighbor-joining tree.
4. It shifts each row to start at _trpE_, as the viewer's `align` transform
   does, and prints where _trpD_ starts after the shift.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_gene_neighborhoods.sh
bash build_gene_neighborhoods.sh
```

With no arguments the script writes the default twelve-row TSV. It writes
`trp-neighborhoods.gff`, `trpB.afa` and `trpB.nwk` into the current directory
and prints every number on this page.

## See also

- [Eight mitochondrial genomes and the genes on them](https://gmod.org/JBrowseMSA/tutorials/mitogenome_genes)
- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Yu G, Smith DK, Zhu H, Guan Y, Lam TT. ggtree: an R package for visualization
  and annotation of phylogenetic trees with their covariates and other
  associated data. _Methods Ecol Evol_ 8:28-36.
- Thompson JD, Gibson TJ, Higgins DG. Multiple sequence alignment using ClustalW
  and ClustalX. _Curr Protoc Bioinformatics_ Chapter 2:Unit 2.3.
- O'Leary NA, Wright MW, Brister JR, et al. Reference sequence (RefSeq) database
  at NCBI: current status, taxonomic expansion, and functional annotation.
  _Nucleic Acids Res_ 44:D733-D745.
