# A protein family from a list of accessions

Human _NLRP1_, an inflammasome sensor, starts with a pyrin domain (PYD) of about
eighty residues that the mouse protein lacks. Aligned with its orthologs, the
domains every vertebrate copy shares fall in one band of columns each, and a
missing PYD shows as blank space. For twelve _NLRP1_ orthologs named by UniProt
accession, we:

- fetch the sequences and align them
- infer a tree from the alignment
- look up the Pfam domains in InterPro and open the three files together
- filter the overlay to the PYD and check it against the GFF
- share the view as one link

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- [react-msaview-cli](https://gmod.org/JBrowseMSA/cli),
  `npm install -g react-msaview-cli`, NodeJS v22+

## The data

Twelve NLRP1 orthologs as UniProtKB holds them, with Pfam matches from InterPro
release 111.0. Nothing to download: the commands below fetch these.

| What it is                                          | File                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------- |
| One protein sequence per accession, for example     | [Q9C000.fasta](https://rest.uniprot.org/uniprotkb/Q9C000.fasta)                 |
| Precomputed Pfam matches per accession, for example | [Q9C000](https://www.ebi.ac.uk/interpro/api/entry/pfam/protein/uniprot/Q9C000/) |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                       | File                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| The twelve sequences before alignment, right-padded to one width | [nlrp1-unaligned.aln](https://gmod.org/JBrowseMSA/demo/data/nlrp1-unaligned.aln) |
| The alignment                                                    | [nlrp1.aln](https://gmod.org/JBrowseMSA/demo/data/nlrp1.aln)                     |
| Its tree                                                         | [nlrp1.nh](https://gmod.org/JBrowseMSA/demo/data/nlrp1.nh)                       |
| Its domains                                                      | [nlrp1-domains.gff](https://gmod.org/JBrowseMSA/demo/data/nlrp1-domains.gff)     |

</details>

## 1. Name the rows

Write one accession per line, followed by the label you want down the side of
the viewer. The label becomes the FASTA defline, the tree tip, and the first
column of the domain GFF.

```
Q9C000	Human
H2QC06	Chimp
A0A1D5QWR0	Rhesus
A0A8I3MJ75	Dog
A0ABM3YGI7	Hedgehog
E1BNN6	Cow
K9IW94	Pig
A0A9L0RFW2	Horse
Q2LKU9	Mouse
D9I2G4	Rat
A0ABM2XMM7	Hamster
A0A386CAB9	Zebrafish
```

Save that as `accessions.tsv`, with a tab between the two columns.

## 2. Fetch the sequences

```bash
# read each accession and write one FASTA record named by its label, which is
# what the viewer draws down the side
while IFS=$'\t' read -r accession label; do
  printf '>%s\n' "$label" >> family.fasta
  curl -sf "https://rest.uniprot.org/uniprotkb/$accession.fasta" |
    tail -n +2 | tr -d '\n' >> family.fasta
  printf '\n' >> family.fasta
done < accessions.tsv
```

`tail -n +2` drops UniProt's defline, and `tr -d '\n'` unwraps the sequence onto
one line. Check the lengths before aligning:

```bash
awk '/^>/{name=$0; next}{print name, length($0)}' family.fasta
```

```
>Human 1473
>Chimp 1471
>Rhesus 1537
>Dog 1432
>Hedgehog 1360
>Cow 1410
>Pig 1294
>Horse 1465
>Mouse 1182
>Rat 1218
>Hamster 1143
>Zebrafish 1355
```

A truncated fragment or a stray isoform would show here as an outlier length.
The viewer opens unaligned sequences once every row is the same length, so
right-padding the shorter ones loads `family.fasta` as twelve rows.

[![](../media/protein-family-sequences.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A360%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.76%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-unaligned.aln%22%7D%7D%7D)

The twelve sequences before alignment, colored by residue, with a ragged right
edge where each row ends. The conservation track above is near flat.

## 3. Align them

```bash
clustalw -INFILE=family.fasta -ALIGN -TYPE=PROTEIN \
  -OUTPUT=FASTA -OUTFILE=family.afa
```

ClustalW finishes in under two seconds and reports `Alignment Score 258590` over
1666 columns, 129 more than the longest input.

[![](../media/protein-family-aligned.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A360%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%7D%7D)

The twelve sequences after ClustalW, at 1666 columns. Vertical bands of color
run through every row where the rows share residues, the pale stretches are gaps
ClustalW inserted, and the conservation track now rises and falls.

## 4. Infer a tree

```bash
# -TREE reads an existing alignment and writes neighbor-joining Newick
clustalw -INFILE=family.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip

# ClustalW wraps the Newick across many lines; the viewer wants one string
tr -d '[:space:]' < family.ph > family.nwk
```

The Newick puts Zebrafish inside the rodents:

```
(((((Mouse:0.11672,Rat:0.11797):0.05644,Hamster:0.14779):0.05664,
Zebrafish:0.56540):0.02478,Hedgehog:0.22128):0.01141,...
```

Zebrafish should be the outgroup, but its branch of 0.56540, against 0.11 to
0.22 for every other tip, draws it to the next longest (long-branch attraction).
This page uses the tree only to order the rows.

[![](../media/protein-family-tree.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%7D%7D)

The alignment in the order of the ClustalW tree beside it. The three primates
are adjacent rows and so are the three rodents, and Zebrafish sits next to the
rodents on its long branch.

Click a node to collapse its clade into one triangle labelled with the number of
tips.

[![](../media/protein-family-collapsed.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A320%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A0.7%2C%22collapsed%22%3A%5B%22node-0-0-1-0-2-0-3%22%5D%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%7D%7D)

Mouse, Rat and Hamster collapsed into the triangle marked 3, leaving eleven rows
in the same columns.

## 5. Look up the domains

The CLI looks up InterPro's precomputed Pfam matches for each accession:

```bash
react-msaview-cli interpro accessions.tsv -o family-domains.gff
```

```
InterPro release 111.0; reading precomputed pfam matches...
  [1/12] Q9C000: 9 pfam entries
  ...
12 fetched, 0 from /home/you/.cache/react-msaview-cli/interpro
```

For predicted proteins InterPro has never seen, `react-msaview-cli interproscan`
submits the sequences to the EBI job queue and waits about fifteen minutes.
Count what came back:

```bash
grep PF02758 family-domains.gff | cut -f1,4,5
```

```
Human	9	84
Chimp	9	83
Rhesus	9	83
Dog	9	83
Hedgehog	9	83
```

Five rows out of twelve have the PYD, at residues 9-83, or 9-84 in Human.

## 6. Open the three files

<!-- usage: web -->

Load `family.afa`, `family.nwk` and `family-domains.gff` into the alignment,
tree and optional annotation slots of the
[import form](https://gmod.org/JBrowseMSA/demo/), as local files or URLs.

[![](../media/protein-family-domains.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A370%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D)

The alignment, tree and domains, with domain boxes in place of the residue
colors. NACHT, the winged helix and the helical domain come first, leucine-rich
repeats fall through the middle, and the two FIIND blocks and the CARD sit at
the right. The PYD at the far left is drawn on five rows, and the other seven
are blank there.

**Settings → Annotations** lists each domain in the GFF by name with a checkbox.

[![](../media/protein-family-filter.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A370%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D)

The Settings panel, one checkbox per Pfam entry. The FIIND block is two of them,
Function to find (PF13553) and the UPA-FIIND beside it (PF23679), and the
leucine-rich repeats are two more, PF00560 and PF13516.

<!-- usage: r -->

[ggmsaview](https://gmod.org/JBrowseMSA/r-package) takes the same three files as
the alignment, tree and annotation arguments of `msaview()`. `w` opens the
viewer in RStudio or a notebook, and `msaview_plot()` draws the view as a
ggplot2 figure:

```r
library(ggmsaview)
w <- msaview(
  msa = "https://gmod.org/JBrowseMSA/demo/data/nlrp1.aln",
  tree = "https://gmod.org/JBrowseMSA/demo/data/nlrp1.nh",
  gff = "https://gmod.org/JBrowseMSA/demo/data/nlrp1-domains.gff",
  residue_color = "clustalx_protein_dynamic"
)
w
ggplot2::ggsave("protein-family-domains-r.png", msaview_plot(w),
  width = 12, height = 5)
```

![](../media/protein-family-domains-r.png)

The twelve rows with the GFF's domains as filled boxes and one legend entry per
domain name. The PYD at the far left covers five rows.

<!-- /usage -->

## 7. Filter to the pyrin domain

Uncheck every domain but PAAD/DAPIN/Pyrin (PF02758), and the overlay draws the
PYD alone.

[![](../media/protein-family-pyd-only.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A370%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffFeatures%22%3A%7B%22PF00560%22%3Atrue%2C%22PF00619%22%3Atrue%2C%22PF05729%22%3Atrue%2C%22PF13516%22%3Atrue%2C%22PF13553%22%3Atrue%2C%22PF17776%22%3Atrue%2C%22PF17779%22%3Atrue%2C%22PF23679%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D)

The overlay with only the pyrin domain turned on. The three primates and Dog
have it in four adjacent rows, Hedgehog in the last row of the frame, and Cow,
Pig and Horse, between them, lack it.

## 8. Compare residues with columns

InterPro reports NACHT at a different residue in each of the twelve rows:

```bash
grep PF05729 family-domains.gff | cut -f1,4,5
```

```
Human	328	497
Chimp	328	497
Rhesus	332	501
Dog	299	467
Hedgehog	296	465
Cow	294	463
Pig	162	330
Horse	328	493
Mouse	134	301
Rat	176	344
Hamster	93	258
Zebrafish	258	428
```

Human 328 and Hamster 93 are 235 residues apart. In the viewer, Mouse, Rat,
Hamster and Zebrafish begin NACHT in column 372 and the other eight rows in
column 371, because the overlay maps each row's residue coordinates through the
gaps in that row before drawing.

## 9. Look for missing annotations

Pfam calls the leucine-rich repeats with two families, PF00560 and PF13516, and
Cow, Hedgehog and Zebrafish have neither:

```bash
grep -E "PF00560|PF13516" family-domains.gff | cut -f1 | sort | uniq -c
```

```
      3 Chimp
      2 Dog
      1 Hamster
      2 Horse
      3 Human
      1 Mouse
      3 Pig
      2 Rat
      4 Rhesus
```

A blank region means the protein lacks the domain or its entry, often an
unreviewed gene model, has no call there. At one letter per column, a row with
residues under the blank differs from a row of gaps.

[![](../media/protein-family-closeup.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A14%2C%22rowHeight%22%3A20%2C%22scrollX%22%3A-476%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D)

The left edge of the PYD block at one letter per column. The five rows with the
domain are green. Cow fills all 75 of those columns with residues and has no
pyrin domain called over them, and Horse fills 73 of them. Mouse, Rat and
Hamster are mostly dashes there, and Hamster has 24 residues in the 75 columns.

## 10. Share the view

An alignment this size opened from your own computer does not fit in the page
URL, so the header says **Not in the link**. Put the three files on a server
that sends CORS headers over HTTPS (`raw.githubusercontent.com` works), and name
the URLs:

```json
{
  "msaview": {
    "type": "MsaView",
    "colWidth": 0.7,
    "residueColor": { "scale": { "scheme": "clustalx_protein_dynamic" } },
    "msaFilehandle": { "uri": "https://example.org/family.afa" },
    "treeFilehandle": { "uri": "https://example.org/family.nwk" },
    "gffFilehandle": { "uri": "https://example.org/family-domains.gff" },
    "highlights": [{ "start": 39, "end": 113, "label": "PYD, Pfam PF02758" }]
  }
}
```

URL-encode that and append it to the app as `#data=`. The link holds the file
addresses, so it works at any size. The optional `highlights` takes 1-based
inclusive columns.

[![](../media/protein-family-link.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A370%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A0.7%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A39%2C%22end%22%3A113%2C%22label%22%3A%22PYD%2C%20Pfam%20PF02758%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1.nh%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnlrp1-domains.gff%22%7D%7D%7D)

The three hosted files opened from that link, with columns 39 to 113 banded and
labelled PYD across all twelve rows.

## Reproduce it end to end

[`build_protein_family.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_protein_family.sh)
runs the four commands above in order:

1. It fetches one sequence per accession from UniProt and names each FASTA
   record by its label.
2. ClustalW aligns the records and infers a neighbor-joining tree.
3. `react-msaview-cli interpro` writes InterPro's precomputed Pfam matches for
   the accessions as a GFF, in each protein's residue numbering.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_protein_family.sh
bash build_protein_family.sh
```

With no arguments the script writes the accession list above and builds the
three files beside it. Point it at your own list for another family:

```bash
bash build_protein_family.sh my-accessions.tsv out/
```

## See also

- [CLI](https://gmod.org/JBrowseMSA/cli)
- [User guide](https://gmod.org/JBrowseMSA/guide)
- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [Where p53's damaging variants fall](https://gmod.org/JBrowseMSA/tutorials/p53_variant_effects)
- [The SARS-CoV-2 furin insert and PDB 6VXX](https://gmod.org/JBrowseMSA/tutorials/spike_structure)

## References

- Bateman A, et al. UniProt: the Universal Protein Knowledgebase in 2025.
  _Nucleic Acids Research_ 53:D609-D617.
- Blum M, et al. InterPro: the protein sequence classification resource in 2025.
  _Nucleic Acids Research_ 53:D444-D456.
- Larkin MA, et al. Clustal W and Clustal X version 2.0. _Bioinformatics_
  23:2947-2948.
- Broz P, Dixit VM. Inflammasomes: mechanism of assembly, regulation and
  signalling. _Nature Reviews Immunology_ 16:407-420.
