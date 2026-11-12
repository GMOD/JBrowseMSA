# The recombination breakpoint in XBB's spike gene

SARS-CoV-2 XBB descends from two BA.2 lineages at once. BJ.1 gave it the 5' end
of its genome and BM.1.1.1 the 3' end, and the join between the two falls inside
the spike gene, so the XBB.1 row of an alignment matches one parent to the left
of the join and the other to the right. For five whole genomes from GenBank,
with a BA.5 genome as a control that inherits from neither parent, we:

- fetch the genomes, align them and infer a tree
- project the reference genes onto every row
- count the differences to each parent in a sliding window
- pin the breakpoint with the informative sites, for XBB.1 and the control
- check the result against the raw columns

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- Python 3, standard library only

## The data

Five SARS-CoV-2 genomes as GenBank holds them, and NCBI's own annotation of the
reference. Nothing to download: the commands below and the build script fetch
these.

| What it is                       | File                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All five genomes, one request    | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_045512.2,OQ859938.1,OP911098.1,PV014247.1,PQ577962.1&rettype=fasta&retmode=text) |
| The reference annotation as GFF3 | [NC_045512.2.gff3](https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=NC_045512.2&report=gff3&retmode=text)                                                               |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                   | File                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The row table step 1 writes                                  | [recombinant-rows.tsv](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant-rows.tsv)       |
| The alignment                                                | [recombinant.afa](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant.afa)                 |
| Its tree                                                     | [recombinant.nwk](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant.nwk)                 |
| The genes                                                    | [recombinant-genes.gff](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant-genes.gff)     |
| The receptor-binding domain cut out of the alignment         | [recombinant-rbd.afa](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant-rbd.afa)         |
| The tracks the scan writes, the layers the links below carry | [recombinant-layers.json](https://gmod.org/JBrowseMSA/demo/data/recombinant/recombinant-layers.json) |

</details>

## 1. Fetch the five genomes

Write one genome per line, with the label the viewer draws, the GenBank
accession, and the Pango lineage NCBI Virus assigns it. The label becomes the
FASTA defline, the tree tip and the GFF seq_id.

```
Wuhan-Hu-1	NC_045512.2	reference
BJ.1	OQ859938.1	BA.2.10.1.1
BM.1.1.1	OP911098.1	BA.2.75.3.1.1.1
XBB.1	PV014247.1	XBB.1
BA.5	PQ577962.1	BA.5
```

The `datasets` CLI filters on NCBI Virus's Pango lineage field:

```bash
datasets summary virus genome taxon sars-cov-2 --lineage BJ.1 \
  --complete-only --annotated --as-json-lines
```

GenBank holds one complete BJ.1 genome, OQ859938.1, so that record is the BJ.1
row. The other three rows are each the longest record their lineage filter
returned with no ambiguous base. One `efetch` request takes all five accessions:

```bash
ids=$(awk -F'\t' '{printf "%s%s", sep, $2; sep=","}' recombinant-rows.tsv)
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=$ids&rettype=fasta&retmode=text" \
  -o genomes-ncbi.fasta
```

```
  Wuhan-Hu-1   NC_045512.2  reference        29903 bp  0 N
  BJ.1         OQ859938.1   BA.2.10.1.1      29784 bp  101 N
  BM.1.1.1     OP911098.1   BA.2.75.3.1.1.1  29847 bp  0 N
  XBB.1        PV014247.1   XBB.1            29712 bp  0 N
  BA.5         PQ577962.1   BA.5             29835 bp  0 N
```

The BJ.1 record has 101 ambiguous bases, 57 of them inside the first 500 bases
of the spike gene, so the scan below counts only the columns where both rows
have a base.

## 2. Align the genomes and infer a tree

```bash
clustalw -INFILE=recombinant.fasta -ALIGN -TYPE=DNA -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE=recombinant.afa
clustalw -INFILE=recombinant.afa -TREE -TYPE=DNA -OUTPUTTREE=phylip
tr -d '[:space:]' < recombinant.ph > recombinant.nwk
```

Five whole genomes take about four minutes on a laptop.

```
(((Wuhan-Hu-1:0.00174,BA.5:0.00031):0.00064,BM.1.1.1:0.00062):0.00031,
BJ.1:0.00048,XBB.1:0.00033);
```

```
5 rows, 29903 alignment columns, 29903 of them a base of Wuhan-Hu-1
  Wuhan-Hu-1     0 gap columns before its first base,   0 after its last,   0 deleted in between
  BJ.1          25 gap columns before its first base,  94 after its last,   0 deleted in between
  BM.1.1.1       0 gap columns before its first base,   0 after its last,  56 deleted in between
  XBB.1         43 gap columns before its first base,  89 after its last,  59 deleted in between
  BA.5           0 gap columns before its first base,   0 after its last,  68 deleted in between
```

The reference row takes a column of its own for every one of its bases, so a
column number is a Wuhan-Hu-1 coordinate for the rest of this page.

[![](../media/recombination_breakpoint-ends.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A380%2C%22treeAreaWidth%22%3A300%2C%22treeWidth%22%3A120%2C%22colWidth%22%3A20%2C%22rowHeight%22%3A34%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%7D%7D)

The 5' end of the alignment at base resolution. Wuhan-Hu-1, BM.1.1.1 and BA.5
have a base in every column, while BJ.1 starts at column 26 and XBB.1 at
column 44.

## 3. Project the reference genes onto every row

RefSeq annotates NC_045512.2 and none of the other four accessions, so the gene
coordinates reach the other rows through the alignment. A reference position
gives an alignment column, and that column gives each row its own position.

```python
col_of_ref = [i for i, c in enumerate(seqs[REF]) if c != '-']
a = pos_of_col[row][col_of_ref[start - 1]]
b = pos_of_col[row][col_of_ref[end - 1]]
g.write(f'{row}\tRefSeq\t{kind}\t{a}\t{b}\t.\t{strand}\t.\tName={name};color={color}\n')
```

Two subregions of spike go on every row the same way, the receptor-binding
domain at residues 331 to 528 and the receptor-binding motif inside it at 438
to 506.

```
11 genes in the Wuhan-Hu-1 annotation, ORF1ab at 266-21555 through ORF10 at 29558-29674
13 spans per row over 5 rows
```

```
Wuhan-Hu-1	RefSeq	gene	21563	25384	.	+	.	Name=S;color=%234e79a7
BJ.1	RefSeq	gene	21538	25359	.	+	.	Name=S;color=%234e79a7
XBB.1	RefSeq	gene	21508	25317	.	+	.	Name=S;color=%234e79a7
```

Each row's spike span starts earlier than the reference's by the gap columns
upstream of it, 25 for BJ.1 and 55 for XBB.1.

[![](../media/recombination_breakpoint-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A340%2C%22treeAreaWidth%22%3A230%2C%22colWidth%22%3A0.04347389893990569%2C%22rowHeight%22%3A34%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant-genes.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureLabel%22%2C%22field%22%3A%22Name%22%7D%5D%2C%22showDomainLegend%22%3Afalse%7D%7D)

Five rows of 29,903 columns with the 11 genes as arrows. ORF1ab fills the first
two thirds, S is the blue arrow after it, and inside S sit the red
receptor-binding domain and the purple receptor-binding motif.

## 4. Count the differences to each parent

The scan counts the columns where a row and a parent have different bases, in a
window of 200 columns centered on every column of the alignment, once per
parent:

```python
def compare(a, b):
    x, y = seqs[a], seqs[b]
    return [None if x[i] not in BASES or y[i] not in BASES else int(x[i] != y[i])
            for i in range(ncol)]


def scan(diff):
    half = WINDOW // 2
    running = [0]
    for d in diff:
        running.append(running[-1] + (d or 0))
    return [running[min(ncol, i + half)] - running[max(0, i - half)]
            for i in range(ncol)]
```

All four Omicron rows descend from BA.2, so every pair is above 99.8% identical:

```
XBB.1     against BJ.1       24 differences over 29660 comparable columns, 99.92% identity
XBB.1     against BM.1.1.1   35 differences over 29709 comparable columns, 99.88% identity
BA.5      against BJ.1       50 differences over 29669 comparable columns, 99.83% identity
BA.5      against BM.1.1.1   46 differences over 29832 comparable columns, 99.85% identity
```

A `bar` track holds one value per alignment column, so the two curves travel
over the receptor-binding domain cut out of the alignment, which keeps the link
short and lets one tree file serve both alignments.

```
the receptor-binding domain is columns 22553-23146, Wuhan-Hu-1 22553-23146, 594 columns
XBB.1: the lower of the two curves changes hands 1 time across the receptor-binding domain, at Wuhan-Hu-1 22931
XBB.1: the two counts reach 7 differences per 200 columns inside the receptor-binding domain
  XBB.1 vs BJ.1: 0 to 1 left of the break, 1 to 7 right of it
  XBB.1 vs BM.1.1.1: 0 to 2 left of the break, 0 to 3 right of it
```

<!-- usage: web -->

[![](../media/recombination_breakpoint-2.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A230%2C%22colWidth%22%3A2.1885521885521886%2C%22rowHeight%22%3A26%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant-rbd.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22xbb1-bj1%22%2C%22name%22%3A%22XBB.1%20vs%20BJ.1%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C4%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C1%2C1%2C1%2C1%2C1%2C1%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A7%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%22xbb1-bm111%22%2C%22name%22%3A%22XBB.1%20vs%20BM.1.1.1%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C2%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A7%7D%7D%7D%2C%22color%22%3A%22%23e15759%22%2C%22height%22%3A70%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A344%2C%22end%22%3A390%2C%22label%22%3A%22breakpoint%2022896-22942%22%2C%22color%22%3A%22rgba(0%2C0%2C0%2C0.18)%22%7D%5D%7D%7D>)

The 594 columns of the receptor-binding domain under the two counts, blue for
the differences to BJ.1 and red for those to BM.1.1.1. The marker at column
22,931 is where the two change places, inside the grey band of the 22,896-22,942
interval the next step pins.

<!-- usage: r -->

The two counts and the breakpoint travel in the hosted layers file, which
[ggmsaview](https://github.com/GMOD/ggmsaview) reads with jsonlite and hands to
`msaview()` beside the alignment and the tree:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/recombinant"
layers <- jsonlite::fromJSON(file.path(data, "recombinant-layers.json"),
  simplifyVector = FALSE)
w <- msaview(
  msa = file.path(data, "recombinant-rbd.afa"),
  tree = file.path(data, "recombinant.nwk"),
  residue_color = "nucleotide",
  column_tracks = layers$recombinantTracks
) +
  geom_msa_highlight(
    start = layers$breakpoint$firstWindowColumn,
    end = layers$breakpoint$lastWindowColumn,
    label = "breakpoint 22896-22942", color = "rgba(0,0,0,0.18)"
  )
w
ggplot2::ggsave("recombination_breakpoint-2-r.png",
  msaview_plot(w, tracks = c("XBB.1 vs BJ.1", "XBB.1 vs BM.1.1.1")),
  width = 12, height = 4)
```

![](../media/recombination_breakpoint-2-r.png)

The same 594 columns under the two counts as a ggplot2 figure, with the grey
band of the 22,896-22,942 interval. The marker at column 22,931 is missing,
because the web figure draws it as a callout rather than from the data.

<!-- /usage -->

## 5. Pin the breakpoint with the informative sites

A column where the two parents have different bases and the third row has one of
them is a vote for that parent. A recombinant's votes fall into a 5' block and a
3' block, so the split that puts the most votes on their own side is the
breakpoint:

```python
def best_split(sites):
    best, at = -1, 0
    for k in range(len(sites) + 1):
        score = (sum(1 for _, w in sites[:k] if w == LEFT)
                 + sum(1 for _, w in sites[k:] if w == RIGHT))
        if score > best:
            best, at = score, k
    return at, best
```

```
XBB.1: 44 informative sites, 27 voting BJ.1 and 17 voting BM.1.1.1
XBB.1: the best split has 41 of the 44 sites on the side it predicts, between Wuhan-Hu-1 22896 and 22942
XBB.1: 3 sites on the other side: 1093, 10189, 23438
the breakpoint interval is Wuhan-Hu-1 22896-22942, 47 nt, spike codons 445 to 460
```

41 of the 44 sites fall on the side the split predicts. The 47 bases between the
last BJ.1 vote and the first BM.1.1.1 vote are spike codons 445 to 460, inside
the receptor-binding motif, so the interval runs between the substitutions
S:V445P and S:N460K.

## 6. Run the same scan on the control

BA.5 and the two parents are three separate BA.2 descendants, so the BA.5 row
stands to both parents as a row with no recombination behind it. The same scan
and split run over it:

```
BA.5: 42 informative sites, 19 voting BJ.1 and 23 voting BM.1.1.1
BA.5: the best split has 28 of the 42 sites on the side it predicts, between Wuhan-Hu-1 12444 and 15738
BA.5: 14 sites on the other side: 405, 1093, 10189, 18583, 22001, 22014, 22016, 22033, 22190, 22331, 23031, 23438, 25416, 26275
BA.5: the lower of the two curves changes hands 0 times across the receptor-binding domain
BA.5: the two counts reach 11 differences per 200 columns inside the receptor-binding domain
  BA.5 vs BJ.1: 2 to 8 left of the break, 1 to 11 right of it
  BA.5 vs BM.1.1.1: 2 to 6 left of the break, 0 to 6 right of it
```

The best split for BA.5 leaves 14 of its 42 sites on the other side and names a
3.3 kb interval inside ORF1ab, 12,444 to 15,738.

[![](../media/recombination_breakpoint-3.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A230%2C%22colWidth%22%3A2.1885521885521886%2C%22rowHeight%22%3A26%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant-rbd.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22ba5-bj1%22%2C%22name%22%3A%22BA.5%20vs%20BJ.1%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C4%2C4%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C4%2C5%2C5%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C8%2C9%2C9%2C9%2C9%2C9%2C9%2C9%2C9%2C9%2C9%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C11%2C11%2C11%2C11%2C11%2C11%2C11%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C10%2C9%2C8%2C8%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C7%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C1%2C1%2C1%2C1%2C1%2C1%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A11%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%22ba5-bm111%22%2C%22name%22%3A%22BA.5%20vs%20BM.1.1.1%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C6%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C5%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C4%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C3%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C2%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A11%7D%7D%7D%2C%22color%22%3A%22%23e15759%22%2C%22height%22%3A70%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A344%2C%22end%22%3A390%2C%22label%22%3A%22breakpoint%2022896-22942%22%2C%22color%22%3A%22rgba(0%2C0%2C0%2C0.18)%22%7D%5D%7D%7D>)

The same window under the control's two counts. Both rise and fall together, and
the blue count stays at or above the red one across all 594 columns.

## 7. Check it against the raw columns

Count the differences to each parent in the 2 kb either side of the break:

```
2000 columns left of the break: XBB.1 and BJ.1 differ at 1 of the 1942 columns where both carry a base
2000 columns left of the break: XBB.1 and BM.1.1.1 differ at 14 of the 1985 columns where both carry a base
2000 columns right of the break: XBB.1 and BJ.1 differ at 9 of the 2000 columns where both carry a base
2000 columns right of the break: XBB.1 and BM.1.1.1 differ at 2 of the 2000 columns where both carry a base
```

[![](../media/recombination_breakpoint-4.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A380%2C%22treeAreaWidth%22%3A230%2C%22colWidth%22%3A2.1885521885521886%2C%22rowHeight%22%3A34%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant-rbd.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%2C%22columnTracks%22%3A%5B%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A344%2C%22end%22%3A390%2C%22label%22%3A%22breakpoint%2022896-22942%22%2C%22color%22%3A%22rgba(0%2C0%2C0%2C0.18)%22%7D%5D%2C%22relativeTo%22%3A%22XBB.1%22%7D%7D>)

The receptor-binding domain read against the XBB.1 row, with a pale cell for the
same base and a colored one for a different base. The BJ.1 row has no colored
cell left of the break, and the BM.1.1.1 row has one to its right.

The six informative sites nearest the break, base by base:

```
position  Wuhan-Hu-1        BJ.1    BM.1.1.1       XBB.1        BA.5
   22664           C           A           C           A           C
   22895           G           C           G           C           G
   22896           T           C           T           C           T
   22942           T           T           G           G           A
   23010           T           C           T           T           T
   23030           T           G           T           T           T
```

[![](../media/recombination_breakpoint-5.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A420%2C%22treeAreaWidth%22%3A230%2C%22colWidth%22%3A21%2C%22rowHeight%22%3A30%2C%22scrollX%22%3A-480564%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22relativeTo%22%3A%22XBB.1%22%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Frecombinant%2Frecombinant.nwk%22%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A22896%2C%22end%22%3A22942%2C%22color%22%3A%22rgba(0%2C0%2C0%2C0.18)%22%7D%5D%7D%7D>)

The same six columns at base resolution. XBB.1 reads the BJ.1 bases C and C at
22,895 and 22,896, where BM.1.1.1, Wuhan-Hu-1 and BA.5 read G and T, and at
22,942 it reads the BM.1.1.1 base G against BJ.1's T.

## Reproduce it end to end

[`build_recombination_breakpoint.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_recombination_breakpoint.sh)
runs the commands above in order:

1. It fetches the five genomes in one efetch request and the reference
   annotation as GFF3, and relabels each sequence to its row name.
2. ClustalW aligns the genomes and infers a neighbor-joining tree, which takes
   about four minutes on five whole genomes.
3. It projects each reference gene through the alignment into every row's own
   coordinates, and the two spike subregions the same way.
4. It scans the XBB.1 row and the BA.5 control against each parent, pins the
   breakpoint with the informative sites, and writes the receptor-binding domain
   cut and the tracks the figure links carry.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_recombination_breakpoint.sh
bash build_recombination_breakpoint.sh
```

With no arguments the script writes the row table above and builds every file
beside it. Pass your own table for another recombinant and another pair of
parents:

```bash
bash build_recombination_breakpoint.sh my-rows.tsv out/
```

## See also

- [Recombination at the norovirus ORF1/ORF2 junction](https://gmod.org/JBrowseMSA/tutorials/norovirus_recombination)
- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [An RSV phylogeny from a public Nextstrain build](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale)
- [Eight mitochondrial genomes and the genes on them](https://gmod.org/JBrowseMSA/tutorials/mitogenome_genes)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Tamura T, Ito J, Uriu K, et al. Virological characteristics of the SARS-CoV-2
  XBB variant derived from recombination of two Omicron subvariants. _Nat
  Commun_ 14:2800.
- Focosi D, Maggi F. Recombination in coronaviruses, with a focus on SARS-CoV-2.
  _Viruses_ 14:1239.
- Rambaut A, Holmes EC, O'Toole Á, et al. A dynamic nomenclature proposal for
  SARS-CoV-2 lineages to assist genomic epidemiology. _Nat Microbiol_
  5:1403-1407.
- Martin DP, Murrell B, Golden M, Khoosal A, Muhire B. RDP4: detection and
  analysis of recombination patterns in virus genomes. _Virus Evol_ 1:vev003.
- Thompson JD, Higgins DG, Gibson TJ. CLUSTAL W: improving the sensitivity of
  progressive multiple sequence alignment through sequence weighting,
  position-specific gap penalties and weight matrix choice. _Nucleic Acids Res_
  22:4673-4680.
