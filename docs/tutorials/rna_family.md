# An RNA family, from a model and six genomes

A riboswitch folds up in front of the gene it controls and binds a small
molecule through its fold. Its sequence can drift as long as every base pair
keeps two complementary sides, so a change on one side comes with a change on
the other. For the SAM-I riboswitch, Rfam RF00162, in six bacterial genomes, we:

- search the genomes with the family's covariance model
- name each hit by the gene it leads
- align the hits to the model and put the pseudoknot back
- infer a tree and open the result from one link
- read the base pairs, the ligand contacts and the tree, then check the
  structure against the rows

## Prerequisites

- `curl` and `python3`
- Infernal 1.1 for `cmsearch` and `cmalign`, `apt install infernal` on Debian or
  Ubuntu, `brew install infernal` on macOS
- FastTree, `apt install fasttree`, or `brew install fasttree`

## The data

Rfam release 15.1 for the family, NCBI RefSeq for the genomes and their
annotation, and the RCSB PDB for one crystal structure. Nothing to download: the
commands below and the build script fetch these.

| What it is                                                                                                                                              | File                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The RF00162 covariance model                                                                                                                            | [cm](https://rfam.org/family/RF00162/cm)                                                                                                                             |
| The RF00162 seed alignment, 457 curated sequences with the consensus structure                                                                          | [stockholm](https://rfam.org/family/RF00162/alignment/stockholm)                                                                                                     |
| One RefSeq genome per request, for example Bacillus subtilis 168; the other five are NC_003869.1, NC_003030.1, NC_003210.1, NC_007795.1 and NC_009089.1 | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_000964.3&rettype=fasta&retmode=text)                                       |
| The annotation of a 1500 nt window of one of those records, which names the gene a hit leads, one request per hit, for example                          | [efetch.ft](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_000964.3&seq_start=1179185&seq_stop=1180684&strand=2&rettype=ft&retmode=text) |
| The sequence of the crystallized aptamer, PDB 2GIS                                                                                                      | [2GIS](https://www.rcsb.org/fasta/entry/2GIS)                                                                                                                        |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                           | File                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The finished alignment every link on this page opens | [sam-riboswitch.sto](https://gmod.org/JBrowseMSA/demo/data/rna/sam-riboswitch.sto) |

</details>

## 1. Search six genomes with the family model

The SAM-I riboswitch sits in the leader of methionine and cysteine biosynthesis
genes in Firmicutes and binds S-adenosylmethionine, the product those genes lead
to. Rfam publishes a seed alignment of 457 curated sequences with a consensus
secondary structure, and a covariance model built from it that scores a
candidate on sequence and fold at once.

```bash
curl -o RF00162.cm https://rfam.org/family/RF00162/cm
curl -o RF00162.seed.sto https://rfam.org/family/RF00162/alignment/stockholm
```

The genomes are six Firmicutes, one FASTA at a time from NCBI and concatenated:
B. subtilis 168, Caldanaerobacter subterraneus subsp. tengcongensis MB4,
Clostridium acetobutylicum ATCC 824, Listeria monocytogenes EGD-e,
Staphylococcus aureus NCTC 8325 and Clostridioides difficile 630.

```bash
# --cut_ga applies the family's curated gathering threshold, the one Rfam uses
# to decide membership
cmsearch --cut_ga --noali --cpu 4 --tblout hits.tbl RF00162.cm all-genomes.fa
```

The search over six chromosomes takes seconds, and the table has 37 rows:

```
37 hits
  NC_000964.3  11 hits
  NC_003030.1  7 hits
  NC_003210.1  7 hits
  NC_003869.1  3 hits
  NC_007795.1  4 hits
  NC_009089.1  5 hits
```

B. subtilis has eleven, the species where Grundy and Henkin first described the
S box regulon.

## 2. Name each row by the gene it leads

A riboswitch is a leader sequence, so each row takes the name of the gene
downstream of it, out of the annotation of a 1500 nt window. The hit at
NC_000964.3:1180802-1180685 runs on the minus strand, so the window is the 1500
nt below it, read in the same direction:

```bash
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore\
&id=NC_000964.3&seq_start=1179185&seq_stop=1180684&strand=2&rettype=ft&retmode=text"
```

```
90	>1500	gene
			gene	samT
			locus_tag	BSU_11010
90	>1500	CDS
			product	bifunctional homocysteine S-methyltransferase using (R,S)AdoMet and methylenetetrahydrofolate reductase [NAD(P)H]
```

The first CDS reading forward in that frame is the gene downstream, and its
symbol with a four-letter species prefix makes the row name `Bsub_samT`. Where
the annotation has no symbol the script uses the locus tag, as in
`Cdif_CD630_RS06510` in the figures below.

```
35 of 37 hits named by a gene, 2 with no same-strand gene within 1500 nt
```

The two unnamed hits keep their coordinate as a name, `Cace_1073888` and
`Saur_2391667`.

## 3. Align the hits to the model

`cmalign` aligns each hit back to the same model, so a column means one
consensus position in every row:

```bash
cmalign --noprob -o cmalign.sto RF00162.cm hits.fa
```

```
37 rows x 187 columns, 108 consensus columns
62 columns are gaps in 90% or more of the rows
```

The hits run from 92 to 157 nt, and the rows at the long end put most of the 79
insert columns in one place, the variable stem loop.

## 4. Put the pseudoknot back

A covariance model pairs columns the way brackets nest, so `cmalign` writes back
only the nested helices its model holds. The four pairs of the SAM-I pseudoknot
cross a helix, and Rfam marks them in the seed's `SS_cons` with `A` for an
opening end and `a` for its partner.

The seed and the new alignment both mark their consensus columns in `#=GC RF`,
so the k-th consensus column of one is the k-th of the other. The build script
copies the seed's `SS_cons` across that correspondence, along with
`RNA_ligand_SAM`, the columns Rfam marks as touching the ligand.

```
4 pseudoknot pairs copied from the seed
```

## 5. Infer a tree

FastTree reads aligned DNA FASTA, so the build script converts the Stockholm
with `U` written as `T` and Rfam's insert gaps written as `-`:

```bash
FastTree -nt -gtr -nosupport tree-input.afa > family.nwk
```

The script then writes the Newick into the Stockholm as the `#=GF NH` line the
viewer reads a tree from.

## 6. Open the result from one link

<!-- usage: web -->

The alignment, its structure, the SAM contacts and the tree travel in one
Stockholm file, so a `#data=` link needs only its URL.

```json
{
  "msaview": {
    "type": "MsaView",
    "residueColor": { "scale": { "scheme": "nucleotide" } },
    "colWidth": 8,
    "rowHeight": 15,
    "msaFilehandle": { "uri": "https://example.org/sam-riboswitch.sto" }
  }
}
```

[![](../media/rna-family-overview.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A8%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A775%2C%22rowHeight%22%3A15%7D%7D)

37 riboswitches over 187 columns, with the `#=GF NH` tree on the left. The
Secondary-structure track and the Base pairs arcs both come from `#=GC SS_cons`,
the arcs blue for the nested helices and red for the pseudoknot, and the two
tracks below them are `RNA_ligand_SAM`, an X at each ligand contact, and `RF`,
the model's consensus sequence. The blank band across the middle is the variable
stem loop.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) needs only the same URL. `w`
alone opens the viewer in RStudio or a notebook, and `msaview_plot()` draws the
same view as a ggplot2 figure:

```r
library(ggmsaview)
w <- msaview(
  msa = "https://gmod.org/JBrowseMSA/demo/data/rna/sam-riboswitch.sto",
  residue_color = "nucleotide"
)
w
ggplot2::ggsave("rna-family-overview-r.png", msaview_plot(w),
  width = 10, height = 9)
```

![](../media/rna-family-overview-r.png)

The 37 riboswitches as a ggplot2 figure, under the file's three `#=GC` rows, the
Base pairs arcs and the conservation bars, with the `#=GF NH` tree on the left.

<!-- /usage -->

## 7. Read the pseudoknot off the arcs

[![](../media/rna-family-pseudoknot.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A8%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A775%2C%22rowHeight%22%3A15%7D%7D)

The pseudoknot marked on the same view. Its four pairs join columns 28-31 to
147-153, with the red arcs crossing blue helix arcs, and the structure track
records the crossing with the letters A and a.

## 8. Read one helix pair by pair

The helix from column 13 to column 46 fills the frame below.

[![](../media/rna-family-helix.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A26%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A978%2C%22rowHeight%22%3A17%2C%22scrollX%22%3A-312%7D%7D)

Columns 18 and 41 in red, columns 35 and 36 in blue. Column 18 is U in 26 rows,
C in 9 and G in 2, and read against column 41 the pairs are UA in 17 rows, CG in
9, UG in 9 and GC in 2, four different base pairs and a base pair in all 37
rows.

Columns 35 and 36 in the same frame are the control, which `SS_cons` leaves
unpaired. Column 36 varies more than column 18 does, its commonest base holding
57% of the rows against 26 of 37, and step 11 searches the alignment for
whatever does pair with it.

## 9. Mark where the ligand touches

Seven columns of the Rfam consensus are annotated as SAM contacts. The
`#=GC RNA_ligand_SAM` track marks each with an X, and the snapshot repeats them
as `highlights`, a labeled band down the rows.

[![](../media/rna-family-sam.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A8%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A825%2C%22rowHeight%22%3A15%2C%22turnedOffTracks%22%3A%7B%22sequence-logo%22%3Afalse%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A7%2C%22end%22%3A7%2C%22label%22%3A%22SAM%22%7D%2C%7B%22start%22%3A11%2C%22end%22%3A11%2C%22label%22%3A%22SAM%22%7D%2C%7B%22start%22%3A50%2C%22end%22%3A50%2C%22label%22%3A%22SAM%22%7D%2C%7B%22start%22%3A139%2C%22end%22%3A141%2C%22label%22%3A%22SAM%22%7D%2C%7B%22start%22%3A182%2C%22end%22%3A182%2C%22label%22%3A%22SAM%22%7D%5D%7D%7D)

Columns 7, 11, 50, 139, 140, 141 and 182, with the sequence logo track switched
on above them. Averaged over the seven, the commonest base holds 99.2% of the
rows, against 75.5% for the paired columns and 78.0% for the columns that are
neither paired nor in contact.

Columns 139 to 141 are one side of a helix whose other side is at columns 48
to 50.

[![](../media/rna-family-frozen-pair.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A30%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A978%2C%22rowHeight%22%3A17%2C%22scrollX%22%3A-3960%7D%7D)

Columns 139, 140 and 141 read U, G and C down the rows. They pair with 50, 49
and 48, and those pairs are AU in 37 rows, CG in 37 and GC in 35, one base pair
each rather than the four of columns 18 and 41.

PDB 2GIS, the crystal structure Rfam took those contacts from, was cut out of
one of these six genomes, and its construct shares 48 nt with
`Tten_TTE_RS08660`, the C. subterraneus row, against 34 nt for the next row.

## 10. Read the tree

[![](../media/rna-family-tree.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A330%2C%22colWidth%22%3A3%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A853%2C%22rowHeight%22%3A17%2C%22highlights%22%3A%5B%7B%22rows%22%3A%5B%22Bsub_yxjG%22%2C%22Bsub_yxjH%22%5D%2C%22color%22%3A%22rgba(21%2C101%2C192%2C0.18)%22%7D%5D%7D%7D>)

The tree with the whole alignment beside it at three pixels per column. Rows
that lead the same gene in different species mostly sit apart, with the five
rows named metK in three separate places. The tinted pair are the riboswitches
of _yxjG_ and _yxjH_, tandem paralogs whose leaders sit 1.4 kb apart on the B.
subtilis chromosome, and four of the five C. difficile rows form another such
clade.

The tree comes from 187 columns of a 108 nt RNA, so its deeper branching is
poorly supported.

## 11. Check it against the raw data

The figures above show the consensus structure Rfam supplies. The build script's
last step re-derives the pairs from the alignment alone, counting a pair as
complementary when it is Watson-Crick or GU:

```
paired columns: 1223/1322 = 92.5% can pair
pseudoknot only: 126/148 = 85.1% can pair
unpaired columns drawn at random: 8934/25415 = 35.2% can pair
```

The third line is the same statistic over random pairs of unpaired columns,
which is how often two columns pair by chance.

The last check throws the structure away and searches, for each of the ten most
variable columns, every other column for the one it pairs with best:

```
col  commonest base   best partner   SS_cons pairs them with
 58             31%     131 at  74%     131
133             32%      56 at  79%      56
131             34%      58 at  74%      58
 57             37%     132 at  91%     132
 56             40%     133 at  79%     133
132             40%      57 at  91%      57
  1             41%      11 at  73%     187
159             41%     172 at  86%     172
171             41%     146 at  70%     160
187             41%       5 at  81%       1
7 of 10 find the partner SS_cons names
```

Seven of the ten find the column the published structure pairs them with, out of
98 candidates each, and the three misses are columns 1, 171 and 187.

The same search over the five most variable columns `SS_cons` leaves unpaired,
which have no partner to find:

```
col  commonest base   best partner   SS_cons pairs them with
 60             44%     131 at  62%       -
136             44%      55 at  85%       -
165             49%      30 at  66%       -
 36             57%       5 at  76%       -
178             57%       5 at  84%       -
```

[![](../media/rna-family-covariation.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22treeAreaWidth%22%3A240%2C%22colWidth%22%3A26%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Frna%2Fsam-riboswitch.sto%22%7D%2C%22height%22%3A978%2C%22rowHeight%22%3A17%2C%22allowedGappyness%22%3A50%2C%22scrollX%22%3A-1144%7D%7D)

Columns 56-58 and 131-133 in red, with the 82 columns that are gaps in half the
rows or more hidden, so both sides of the helix fit in one frame. Read the
second box right to left: 56 pairs with 133, 57 with 132 and 58 with 131, the
partners `SS_cons` names. Column 60 in blue, which `SS_cons` leaves unpaired,
finds its best partner, column 131, at 62%.

Column 36, the control from the helix figure, tops out at 76%, and the best
scores of the five come from nearly invariant columns such as column 5, which
turns up twice.

## Reproduce it end to end

[`build_rna_family.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_rna_family.sh)
runs the commands above in order:

1. It fetches the RF00162 covariance model and seed alignment from Rfam and the
   six genomes from NCBI, then searches the genomes at the family's own curated
   threshold.
2. It names each hit by the first gene downstream on the same strand, from the
   annotation of a 1500 nt window, and cuts the hit sequences out of the
   genomes.
3. `cmalign` aligns the hits to the model's consensus columns, and the script
   copies the seed's consensus structure and SAM contacts onto those columns,
   which puts back the pseudoknot the model cannot carry.
4. FastTree infers a tree, the script writes it and the alignment into one
   Stockholm file, and it re-derives the base pairs from the alignment alone as
   a check on the structure.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_rna_family.sh
bash build_rna_family.sh out/
```

The script writes `out/sam-riboswitch.sto`, the file the links on this page
open, and prints every number quoted here.

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [The SARS-CoV-2 furin insert and PDB 6VXX](https://gmod.org/JBrowseMSA/tutorials/spike_structure)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Grundy FJ, Henkin TM. The S box regulon: a new global transcription
  termination control system for methionine and cysteine biosynthesis genes in
  gram-positive bacteria. _Molecular Microbiology_ 30:737-749.
- Montange RK, Batey RT. Structure of the S-adenosylmethionine riboswitch
  regulatory mRNA element. _Nature_ 441:1172-1175.
- Nawrocki EP, Eddy SR. Infernal 1.1: 100-fold faster RNA homology searches.
  _Bioinformatics_ 29:2933-2935.
- Ontiveros-Palacios N, et al. Rfam 15: RNA families database in 2025. _Nucleic
  Acids Research_ 53:D258-D267.
- Price MN, Dehal PS, Arkin AP. FastTree 2: approximately maximum-likelihood
  trees for large alignments. _PLoS ONE_ 5:e9490.
