# Eight mitochondrial genomes and the genes on them

A mammal mitochondrial genome is about 16.5 kb and holds 37 genes: 13 protein
subunits of the respiratory chain, 2 rRNAs and 22 tRNAs, in an order shared
across the vertebrates. Aligned whole, the genomes line each gene up in one
block of columns, so a gene file can draw every gene as an arrow on its row. For
eight mammal mitogenomes from RefSeq, we:

- fetch the genomes and their RefSeq annotations
- align them and infer a tree
- derive one gene GFF from RefSeq's annotation
- fill each gene's arrow by respiratory complex and label it by name
- project the genes into alignment columns and open the result from one link

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- Python 3, for the step that reshapes RefSeq's GFF3

## The data

Eight mammal mitochondrial genomes as RefSeq holds them, with RefSeq's own
annotation of each. Nothing to download: the commands below fetch these.

| What it is                            | File                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| One genome per accession, for example | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_012920.1&rettype=fasta&retmode=text) |
| Its annotation as GFF3, for example   | [NC_012920.1.gff3](https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=NC_012920.1&report=gff3&retmode=text)                   |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                                             | File                                                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The eight genomes before alignment, right-padded to one width so the viewer opens them | [mito-unaligned.afa](https://gmod.org/JBrowseMSA/demo/data/mitogenome/mito-unaligned.afa) |
| The alignment the commands below write                                                 | [mito.afa](https://gmod.org/JBrowseMSA/demo/data/mitogenome/mito.afa)                     |
| Its tree                                                                               | [mito.nwk](https://gmod.org/JBrowseMSA/demo/data/mitogenome/mito.nwk)                     |
| Its genes                                                                              | [mito-genes.gff](https://gmod.org/JBrowseMSA/demo/data/mitogenome/mito-genes.gff)         |

</details>

## 1. Fetch the genomes and their annotations

Write one RefSeq accession per line, followed by the label you want down the
side of the viewer. The label becomes the FASTA defline, the tree tip, and
column 1 of the gene GFF.

```
NC_012920.1	Human
NC_001643.1	Chimp
NC_005089.1	Mouse
NC_001665.2	Rat
NC_002008.4	Dog
NC_006853.1	Cow
NC_001640.1	Horse
NC_000891.1	Platypus
```

Save that as `mito-rows.tsv`, tab-separated. A marsupial row would break the
shared gene order, since marsupials order the five tRNAs between _ND2_ and
_COX1_ differently.

```bash
while IFS=$'\t' read -r accession label; do
  curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=$accession&rettype=fasta&retmode=text" \
    -o "raw/$accession.fa"
  curl -sf "https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=$accession&report=gff3&retmode=text" \
    -o "raw/$accession.gff"
done < mito-rows.tsv
```

Count what came back before aligning it:

```
  Human        NC_012920.1  16569 bp  37 genes
  Chimp        NC_001643.1  16554 bp  37 genes
  Mouse        NC_005089.1  16299 bp  37 genes
  Rat          NC_001665.2  16313 bp  37 genes
  Dog          NC_002008.4  16727 bp  37 genes
  Cow          NC_006853.1  16338 bp  37 genes
  Horse        NC_001640.1  16660 bp  37 genes
  Platypus     NC_000891.1  17019 bp  37 genes
```

The viewer opens unaligned genomes once every row is the same length, so
right-pad the shorter ones to the 17,019 bp of Platypus.

[![](../media/mitogenome_genes-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A300%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A18%2C%22colWidth%22%3A0.065%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-unaligned.afa%22%7D%7D%7D)

The eight genomes before alignment, one row each in file order, colored by base.
Each row stops at its own length, so the right edge is ragged.

## 2. Align the genomes and infer a tree

```bash
clustalw -INFILE=mito.fasta -ALIGN -TYPE=DNA \
  -OUTPUT=FASTA -OUTFILE=mito.afa

# -TREE reads an existing alignment and writes neighbor-joining Newick;
# ClustalW wraps it across lines, and the viewer wants one string
clustalw -INFILE=mito.afa -TREE -TYPE=DNA -OUTPUTTREE=phylip
tr -d '[:space:]' < mito.ph > mito.nwk
```

Eight whole mitogenomes take about three minutes on a laptop. ClustalW writes
17,966 columns, 947 more than the longest input, and this tree:

```
(((((Mouse:0.08782,Rat:0.08393):0.04922,Platypus:0.17510):0.00685,
(Human:0.04074,Chimp:0.04555):0.10155):0.01849,Cow:0.09959):0.00282,
Dog:0.11305,Horse:0.09847);
```

[![](../media/mitogenome_genes-2.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A300%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A18%2C%22colWidth%22%3A0.065%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%7D%7D)

The alignment at 17,966 columns with the ClustalW tree beside it. Only Human and
Cow have sequence in columns 1 to 578, the white block at the left, and the
control region ends at a different column in each row, the ragged white at the
right. Platypus sits with the rodents on the longest branch.

## 3. Derive the gene GFF

The gene GFF has one line per gene under the row label, at 1-based positions in
that genome's sequence, with the gene's name, its strand and its respiratory
complex. A table maps each of the 13 protein genes to its complex:

```python
# the four complexes mtDNA encodes subunits of. Complex II is nuclear
COMPLEX = {'ND1': 'I', 'ND2': 'I', 'ND3': 'I', 'ND4': 'I', 'ND4L': 'I',
           'ND5': 'I', 'ND6': 'I', 'CYTB': 'III', 'COX1': 'IV', 'COX2': 'IV',
           'COX3': 'IV', 'ATP6': 'V', 'ATP8': 'V'}
```

In five of the eight genomes RefSeq names the tRNA and rRNA genes by locus tag,
so the script names a tRNA from the `product` of its child feature (`tRNA-Phe`)
and the two rRNAs by their order along the genome (`RNR1`, `RNR2`). It then
writes one line per gene:

```python
print(f'{label}\tRefSeq\tgene\t{start}\t{end}\t.\t{strand}\t.'
      f'\tName={name};complex={klass}', file=out)
```

RefSeq annotates the control region as `D_loop` in six of the eight genomes, so
the script derives it for all eight as the span after the last gene, tRNA-Pro,
with a fixed color:

```python
print(f'{label}\tRefSeq\tD_loop\t{last + 1}\t{length}\t.\t.\t.'
      f'\tName=control region;color=255,205,0', file=out)
```

The first lines of the result:

```
##gff-version 3
Human	RefSeq	gene	577	647	.	+	.	Name=tRNA-Phe;complex=tRNA
Human	RefSeq	gene	648	1601	.	+	.	Name=RNR1;complex=rRNA
Human	RefSeq	gene	1602	1670	.	+	.	Name=tRNA-Val;complex=tRNA
Human	RefSeq	gene	1671	3229	.	+	.	Name=RNR2;complex=rRNA
Human	RefSeq	gene	3230	3304	.	+	.	Name=tRNA-Leu-1;complex=tRNA
Human	RefSeq	gene	3307	4262	.	+	.	Name=ND1;complex=I
```

and what it holds:

```
  I: 56
  III: 8
  IV: 24
  V: 16
  rRNA: 16
  tRNA: 176
  control region: 8
```

[![](../media/mitogenome_genes-3.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A300%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A18%2C%22colWidth%22%3A0.065%2C%22showDomainLegend%22%3Afalse%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-genes.gff%22%7D%7D%7D)

The alignment, tree and gene GFF open with no encoding set, so each of the 38
names takes a palette color, one band down all eight rows per gene. The control
region at the right is gold from its color=255,205,0.

## 4. Fill the arrows by respiratory complex

`featureFill` names the field the overlay colors each span by, and the scale's
`domain` and `range` give each value of that field a color:

```json
"encodings": [
  {
    "channel": "featureFill",
    "field": "complex",
    "scale": {
      "domain": ["I", "III", "IV", "V", "rRNA", "tRNA"],
      "range": ["#4e79a7", "#59a14f", "#e15759", "#b07aa1", "#f28e2b", "#bab0ac"]
    }
  },
  { "channel": "featureLabel", "field": "Name" }
]
```

[![](../media/mitogenome_genes-4.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A300%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A18%2C%22colWidth%22%3A0.065%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22complex%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22I%22%2C%22III%22%2C%22IV%22%2C%22V%22%2C%22rRNA%22%2C%22tRNA%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%2359a14f%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%23f28e2b%22%2C%22%23bab0ac%22%5D%7D%7D%2C%7B%22channel%22%3A%22featureLabel%22%2C%22field%22%3A%22Name%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-genes.gff%22%7D%7D%7D)

All 17,966 columns, with each gene an arrow filled by the complex the legend
lists. ND6 and eight tRNAs point left, the minus strand in column 7 of the GFF.
The gold control regions keep their color= and have no legend entry.

The legend has no complex II, because the nucleus encodes all four of its
subunits and no line in the file has `complex=II`.

## 5. Label the arrows by gene name

`featureLabel` names the field the viewer draws inside each arrow wherever the
text fits, so the column width decides how many labels appear.

[![](../media/mitogenome_genes-5.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A380%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A26%2C%22colWidth%22%3A0.38%2C%22scrollX%22%3A-2318%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22complex%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22I%22%2C%22III%22%2C%22IV%22%2C%22V%22%2C%22rRNA%22%2C%22tRNA%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%2359a14f%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%23f28e2b%22%2C%22%23bab0ac%22%5D%7D%7D%2C%7B%22channel%22%3A%22featureLabel%22%2C%22field%22%3A%22Name%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-genes.gff%22%7D%7D%7D)

The view from column 6,100 at 0.38 pixels per column, with COX1, COX2, ATP8 and
ATP6 labeled in all eight rows. The three grey tRNAs between them are 69 to 70
columns wide, 27 pixels at this width, which is narrower than their labels, so
they have none.

## 6. Project the genes into alignment columns

The overlay projects each row's positions through that row's gaps. _COX1_ starts
at a different base in each of the eight genomes and at one column in all eight:

```
COX1:
  Human     bp   5904 -> columns 6134-7676
  Chimp     bp   5321 -> columns 6134-7676
  Mouse     bp   5328 -> columns 6134-7679
  Rat       bp   5323 -> columns 6134-7679
  Dog       bp   5349 -> columns 6134-7679
  Cow       bp   5687 -> columns 6134-7679
  Horse     bp   5362 -> columns 6134-7679
  Platypus  bp   5389 -> columns 6134-7675
```

For all 15 named genes, the projection gives the spread in columns between the
leftmost row and the rightmost:

```
feature          start spread end spread
RNR1                        1          0
RNR2                        0          0
ND1                        88          4
ND2                         0          2
COX1                        0          4
COX2                        0         31
ATP8                        0          6
ATP6                        0          0
COX3                        0          3
ND3                         0          6
ND4L                        4          0
ND4                         0          0
ND5                         9         26
ND6                        13          0
CYTB                        0          5
control region             10       1091
22 tRNAs: worst start-column spread 5
```

Ten of the 15 start in one column in every row. _ND1_ has the widest spread, 88,
because the alignment puts the first base of the Mouse and Rat copies in column
3,414 and the second in column 3,503, where the other six start in column 3,502.
No gene's end spreads more than 31 columns, and the control region's spreads
1,091, from Human at 16,875 to Platypus at 17,966.

[![](../media/mitogenome_genes-6.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A380%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A26%2C%22colWidth%22%3A0.363%2C%22scrollX%22%3A-5176%2C%22showDomainLegend%22%3Afalse%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22complex%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22I%22%2C%22III%22%2C%22IV%22%2C%22V%22%2C%22rRNA%22%2C%22tRNA%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%2359a14f%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%23f28e2b%22%2C%22%23bab0ac%22%5D%7D%7D%2C%7B%22channel%22%3A%22featureLabel%22%2C%22field%22%3A%22Name%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-genes.gff%22%7D%7D%7D)

The last 3,700 columns, where CYTB starts and ends on one column in all eight
rows and the gold control regions end on eight different columns.

## 7. Open the result from one link

<!-- usage: web -->

`mito.afa`, `mito.nwk` and `mito-genes.gff` go in the alignment, tree and
annotation slots of the [import form](https://gmod.org/JBrowseMSA/demo/), as
local files or as URLs. To put the whole view in a link, name the URLs and add
the encodings to the snapshot:

```json
{
  "msaview": {
    "type": "MsaView",
    "colWidth": 0.065,
    "msaFilehandle": { "uri": "https://example.org/mito.afa" },
    "treeFilehandle": { "uri": "https://example.org/mito.nwk" },
    "gffFilehandle": { "uri": "https://example.org/mito-genes.gff" },
    "encodings": [
      {
        "channel": "featureFill",
        "field": "complex",
        "scale": {
          "domain": ["I", "III", "IV", "V", "rRNA", "tRNA"],
          "range": [
            "#4e79a7",
            "#59a14f",
            "#e15759",
            "#b07aa1",
            "#f28e2b",
            "#bab0ac"
          ]
        }
      },
      { "channel": "featureLabel", "field": "Name" }
    ],
    "highlights": [{ "start": 6134, "end": 7679, "label": "COX1" }]
  }
}
```

URL-encode that and append it to the app as `#data=`. `highlights` takes 1-based
inclusive columns, here the COX1 span the projection printed.

[![](../media/mitogenome_genes-7.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A300%2C%22treeAreaWidth%22%3A190%2C%22rowHeight%22%3A18%2C%22colWidth%22%3A0.065%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22complex%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22I%22%2C%22III%22%2C%22IV%22%2C%22V%22%2C%22rRNA%22%2C%22tRNA%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%2359a14f%22%2C%22%23e15759%22%2C%22%23b07aa1%22%2C%22%23f28e2b%22%2C%22%23bab0ac%22%5D%7D%7D%2C%7B%22channel%22%3A%22featureLabel%22%2C%22field%22%3A%22Name%22%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A6134%2C%22end%22%3A7679%2C%22label%22%3A%22COX1%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fmitogenome%2Fmito-genes.gff%22%7D%7D%7D)

The view the link opens, with the arrows filled by complex and labeled by name
and a band labeled COX1 over columns 6,134 to 7,679.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same three hosted
files, and its layers add the two encodings and the band. `w` alone opens the
viewer in RStudio or a notebook, and `msaview_plot()` draws the same view as a
ggplot2 figure:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/mitogenome"
w <- msaview(
  msa = file.path(data, "mito.afa"),
  tree = file.path(data, "mito.nwk"),
  gff = file.path(data, "mito-genes.gff"),
  col_width = 0.065
) +
  scale_row_color("complex", channel = "featureFill", range = c(
    I = "#4e79a7", III = "#59a14f", IV = "#e15759", V = "#b07aa1",
    rRNA = "#f28e2b", tRNA = "#bab0ac"
  )) +
  scale_row_color("Name", channel = "featureLabel") +
  geom_msa_highlight(start = 6134, end = 7679, label = "COX1")
w
ggplot2::ggsave("mitogenome_genes-7-r.png", msaview_plot(w),
  width = 12, height = 4.5)
```

![](../media/mitogenome_genes-7-r.png)

The eight mitogenomes, their gene arrows and the COX1 band as a ggplot2 figure,
under the conservation bars.

<!-- /usage -->

The band covers the columns the projection put _COX1_ in. RefSeq's GFF3 gives
its position in the human genome:

```bash
grep -P '\tgene\t' raw/NC_012920.1.gff | grep 'Name=COX1'
```

```
NC_012920.1	RefSeq	gene	5904	7445	.	+	.	ID=gene-COX1;Dbxref=GeneID:4512,HGNC:HGNC:7419,MIM:516030;Name=COX1;gbkey=Gene;gene=COX1;gene_biotype=protein_coding;gene_synonym=COI,MTCO1
```

```bash
grep -P '^Human\t' mito-genes.gff | grep 'Name=COX1;'
```

```
Human	RefSeq	gene	5904	7445	.	+	.	Name=COX1;complex=IV
```

5904 to 7445 on the plus strand in both files.

## Reproduce it end to end

[`build_mitogenome_genes.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_mitogenome_genes.sh)
runs the commands above in order:

1. It fetches each genome and its RefSeq GFF3 from NCBI and names each FASTA
   record by its label, which column 1 of the gene GFF has to match.
2. ClustalW aligns the genomes and infers a neighbor-joining tree.
3. It reshapes RefSeq's GFF3 into one gene GFF, with each gene named, stranded
   and tagged with its complex, plus the control region after the last gene.
4. It projects each gene into alignment columns and prints how far the starts
   and ends spread across the eight rows.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_mitogenome_genes.sh
bash build_mitogenome_genes.sh
```

With no arguments the script writes the accession list above and prints every
number this page quotes. Point it at your own list of RefSeq mitogenomes to do
the same for another set:

```bash
bash build_mitogenome_genes.sh my-rows.tsv out/
```

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [User guide](https://gmod.org/JBrowseMSA/guide)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [Gene neighborhoods of the tryptophan operon](https://gmod.org/JBrowseMSA/tutorials/gene_neighborhoods)

## References

- Anderson S, et al. Sequence and organization of the human mitochondrial
  genome. _Nature_ 290:457-465.
- Boore JL. Animal mitochondrial genomes. _Nucleic Acids Research_ 27:1767-1780.
- O'Leary NA, et al. Reference sequence (RefSeq) database at NCBI. _Nucleic
  Acids Research_ 44:D733-D745.
- Larkin MA, et al. Clustal W and Clustal X version 2.0. _Bioinformatics_
  23:2947-2948.
