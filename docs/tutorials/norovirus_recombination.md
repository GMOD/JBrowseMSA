# Recombination at the norovirus ORF1/ORF2 junction

Norovirus GII has two genotype names, one for its polymerase and one for its
capsid, so a GII.P16-GII.4 Sydney genome has the polymerase of GII.P16 and the
capsid of GII.4 Sydney. The two halves meet at the ORF1/ORF2 junction, so a
recombinant row stops matching one parent there and starts matching the other.
For twelve complete GII genomes, with GII.Pe-GII.4/US/2013 as a control of the
capsid donor's own genotype, we:

- fetch the genomes and align them whole
- draw each genome's ORFs and infer one tree per ORF
- color each row by its closer parent in 200-base windows
- plot identity to each parent across the junction, for the recombinant and the
  control
- check the crossing against the bases and open the result from one link

## Prerequisites

- `curl`
- Docker, which the script uses to run MAFFT 7.525 and FastTree 2.2.0 from their
  biocontainers images.
- Python 3, standard library only

## The data

Twelve norovirus GII genomes as GenBank holds them, sequence and annotation
both. Nothing to download: the commands below fetch them from NCBI.

| What it is                                                      | File                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All twelve genomes, one request                                 | [noro.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=MK773584.1,MK762638.1,LC175468.1,NC_039476.1,KY771081.1,MK752935.1,MG892974.3,KJ196281.1,KJ196296.1,KY486271.1,NC_040876.1,NC_039475.1&rettype=fasta&retmode=text) |
| The same twelve as GenBank flatfiles, which carry the CDS spans | [noro.gb](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=MK773584.1,MK762638.1,LC175468.1,NC_039476.1,KY771081.1,MK752935.1,MG892974.3,KJ196281.1,KJ196296.1,KY486271.1,NC_040876.1,NC_039475.1&rettype=gb&retmode=text)       |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                | File                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The row table the commands below start from               | [noro-rows.tsv](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-rows.tsv)         |
| The alignment they write                                  | [noro.afa](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro.afa)                   |
| The tree from the ORF1 columns                            | [noro-orf1.nwk](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-orf1.nwk)         |
| The tree from the ORF2 columns                            | [noro-orf2.nwk](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-orf2.nwk)         |
| The three ORFs of every genome                            | [noro-orfs.gff](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-orfs.gff)         |
| Each row's closer parent in 200-base windows              | [noro-parents.gff](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-parents.gff)   |
| The 600 columns centered on the junction, 300 either side | [noro-junction.afa](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-junction.afa) |
| The identity tracks, the layers the links below carry     | [noro-layers.json](https://gmod.org/JBrowseMSA/demo/data/norovirus/noro-layers.json)   |

</details>

## 1. Fetch the genomes and their ORFs

Write one genome per line, with the label the viewer draws, the GenBank
accession, and the genotype in the record's isolate name or note. The label
becomes the FASTA defline, the tree tip and the GFF seq_id.

```
GII.P16-GII.4/US/2016	MK773584.1	GII.P16-GII.4 Sydney
GII.P16-GII.4/US/2017	MK762638.1	GII.P16-GII.4 Sydney
GII.P16-GII.4/JP/2016	LC175468.1	GII.P16_GII.4_Sydney2012
GII.P16-GII.2/CN/2016	NC_039476.1	GII.P16-GII.2
GII.P16-GII.2/HK/2016	KY771081.1	GII.P16_GII.2
GII.P16-GII.2/US/2018	MK752935.1	GII.P16-GII.2
GII.P16-GII.2/RU/2017	MG892974.3	GII.P16-GII.2
GII.Pe-GII.4/JP/2012	KJ196281.1	GII.Pe_GII.4_Sydney2012
GII.Pe-GII.4/TW/2012	KJ196296.1	GII.Pe_GII.4_Sydney2012
GII.Pe-GII.4/US/2013	KY486271.1	GII.Pe-GII.4-Sydney
GII.P7-GII.6/UK/2015	NC_040876.1	GII.P7_GII.6
GII.P17-GII.17/KR/2015	NC_039475.1	GII.P17_GII.17
```

The three GII.P16-GII.4 rows are the recombinant, GII.P16-GII.2/CN/2016 stands
for the four GII.P16-GII.2 rows as the polymerase donor, and
GII.Pe-GII.4/JP/2012 for the three GII.Pe-GII.4 rows as the capsid donor. Save
the table as `noro-rows.tsv`, then fetch all twelve in two `efetch` requests,
one for the sequences and one for the GenBank flatfiles:

```bash
ids=$(awk -F'\t' '{printf "%s%s", sep, $2; sep=","}' noro-rows.tsv)
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=$ids&rettype=fasta&retmode=text" -o noro-ncbi.fasta
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=$ids&rettype=gb&retmode=text" -o noro-ncbi.gb
```

Each record annotates three CDS features in genome order, ORF1's nonstructural
polyprotein, ORF2's VP1 and ORF3's VP2. One regular expression reads their spans
into a GFF:

```python
spans = re.findall(r'^     CDS             (\d+)\.\.(\d+)$', record, re.M)
```

```
  GII.P16-GII.4/US/2016   MK773584.1   7559 nt  ORF1 5-5104  ORF2 5085-6707  ORF3 6707-7513  GII.P16-GII.4 Sydney
  GII.P16-GII.4/US/2017   MK762638.1   7563 nt  ORF1 5-5104  ORF2 5085-6707  ORF3 6707-7513  GII.P16-GII.4 Sydney
  GII.P16-GII.4/JP/2016   LC175468.1   7570 nt  ORF1 5-5104  ORF2 5085-6707  ORF3 6707-7513  GII.P16_GII.4_Sydney2012
  GII.P16-GII.2/CN/2016   NC_039476.1  7536 nt  ORF1 5-5104  ORF2 5085-6713  ORF3 6713-7492  GII.P16-GII.2
  GII.P16-GII.2/HK/2016   KY771081.1   7546 nt  ORF1 5-5104  ORF2 5085-6713  ORF3 6713-7492  GII.P16_GII.2
  GII.P16-GII.2/US/2018   MK752935.1   7536 nt  ORF1 5-5104  ORF2 5085-6713  ORF3 6713-7492  GII.P16-GII.2
  GII.P16-GII.2/RU/2017   MG892974.3   7553 nt  ORF1 1-5100  ORF2 5081-6709  ORF3 6709-7488  GII.P16-GII.2
  GII.Pe-GII.4/JP/2012    KJ196281.1   7559 nt  ORF1 5-5104  ORF2 5085-6707  ORF3 6707-7513  GII.Pe_GII.4_Sydney2012
  GII.Pe-GII.4/TW/2012    KJ196296.1   7560 nt  ORF1 5-5104  ORF2 5085-6707  ORF3 6707-7513  GII.Pe_GII.4_Sydney2012
  GII.Pe-GII.4/US/2013    KY486271.1   7551 nt  ORF1 1-5094  ORF2 5075-6697  ORF3 6697-7503  GII.Pe-GII.4-Sydney
  GII.P7-GII.6/UK/2015    NC_040876.1  7521 nt  ORF1 5-5098  ORF2 5079-6722  ORF3 6722-7498  GII.P7_GII.6
  GII.P17-GII.17/KR/2015  NC_039475.1  7556 nt  ORF1 5-5113  ORF2 5094-6716  ORF3 6716-7495  GII.P17_GII.17
```

```
ORF1 and ORF2 overlap by 20 bases
```

## 2. Align the twelve genomes

MAFFT under `--auto` runs FFT-NS-2 on twelve sequences of 7.5 kb:

```bash
docker run --rm -v "$PWD:/work" -w /work quay.io/biocontainers/mafft:7.525--h031d066_1 \
  mafft --auto --quiet --preservecase noro.fasta > noro.afa
```

```
12 rows, 7778 columns, 2726 gap characters
```

[![](../media/norovirus_recombination-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A0.162%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%7D%7D)

Twelve norovirus genomes as one alignment beside the tree from their ORF2
columns. The conservation track dips where the rows disagree, most of all in
GII.P7-GII.6/UK/2015 and GII.P17-GII.17/KR/2015.

## 3. Draw the ORFs on every row

Load the ORF GFF from step 1 as the annotation file, and the viewer places each
genome's own spans through that row's gaps.

[![](../media/norovirus_recombination-2.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A0.162%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orfs.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22ORF1%22%2C%22ORF2%22%2C%22ORF3%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%5D%7D%7D%5D%7D%7D)

The alignment with each row's three ORFs as boxes, ORF1 blue, ORF2 red and ORF3
grey.

[![](../media/norovirus_recombination-overlap.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A34%2C%22colWidth%22%3A18%2C%22scrollX%22%3A-92106%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orfs.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22ORF1%22%2C%22ORF2%22%2C%22ORF3%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%5D%7D%7D%5D%2C%22subFeatureRows%22%3Atrue%2C%22showDomainLegend%22%3Afalse%7D%7D)

The ORF1/ORF2 boundary at base resolution, with ORF1 a blue bar and ORF2 a red
one over each row. On all twelve rows ORF2 starts on the ATG at column 5,138 and
ORF1 stops on the TGA at column 5,157.

Projecting one row, GII.P16-GII.4/US/2016, gives the column ranges the per-ORF
trees and the junction cut use:

```python
col_of_ref = [i for i, c in enumerate(seqs[REFERENCE]) if c != '-']
orf1 = (col(ref['ORF1'][0]), col(ref['ORF1'][1]))
orf2 = (col(ref['ORF2'][0]), col(ref['ORF2'][1]))
junction = (orf2[0] - FLANK, orf2[0] + FLANK)
```

```
in the alignment, GII.P16-GII.4/US/2016 has ORF1 in columns 5-5157 and ORF2 in columns 5138-6826
the junction cut is columns 4838-5437, 300 columns either side of the first base of ORF2
```

## 4. Infer a tree per ORF

Run FastTree on the ORF1 columns and on the ORF2 columns:

```bash
for orf in orf1 orf2; do
  docker run --rm -v "$PWD:/work" -w /work quay.io/biocontainers/fasttree:2.2.0--h7b50bb2_1 \
    FastTree -nt -gtr -quiet -nosupport "noro-$orf.afa" > "noro-$orf.nwk"
done
```

[![](../media/norovirus_recombination-3.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A0.162%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf1.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orfs.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22ORF1%22%2C%22ORF2%22%2C%22ORF3%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%5D%7D%7D%5D%2C%22showDomainLegend%22%3Afalse%7D%7D)

The alignment under the ORF1 tree, which draws GII.P16-GII.4/US/2016 and
GII.P16-GII.4/US/2017 directly under the four GII.P16-GII.2 rows. The ORF2 tree
in the two figures above draws GII.P16-GII.4/US/2016 directly above the three
GII.Pe-GII.4 rows, 0.0093 away.

## 5. Color each row by its closer parent

Percent identity counts the columns of a span where both rows have a base:

```python
def identity(query, subject, start, end):
    q, s = seqs[query], seqs[subject]
    both = matches = 0
    for i in range(start, end):
        if q[i] != '-' and s[i] != '-':
            both += 1
            matches += q[i] == s[i]
    return 100 * matches / both if both else 0
```

Over a whole ORF, the identity separates the two parents:

```
GII.P16-GII.4/US/2016   ORF1  98.0% to GII.P16-GII.2/CN/2016,  77.5% to GII.Pe-GII.4/JP/2012   ORF2  64.8% and  96.3%
GII.Pe-GII.4/US/2013    ORF1  77.5% to GII.P16-GII.2/CN/2016,  98.8% to GII.Pe-GII.4/JP/2012   ORF2  64.4% and  98.6%
```

In 200-base windows along every row, the same score writes a GFF of each
window's closer parent:

```python
closer, color = (
    ('GII.P16', A_COLOR) if a - b > 1
    else ('GII.4 Sydney', B_COLOR) if b - a > 1
    else ('tie', TIE_COLOR)
)
```

[![](../media/norovirus_recombination-4.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A0.162%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-parents.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22GII.P16%22%2C%22GII.4%20Sydney%22%2C%22tie%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%23bab0ac%22%5D%7D%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A5124%2C%22end%22%3A5124%2C%22label%22%3A%22breakpoint%22%7D%5D%7D%7D)

Each row's 38 windows, blue (GII.P16) where closer to the polymerase donor, red
(GII.4 Sydney) where closer to the capsid donor and grey for a tie. The three
GII.P16-GII.4 rows have 25 blue windows then 13 red, all switching at the same
base, where the other GII.P16-GII.2 rows are blue throughout and the other
GII.Pe-GII.4 rows red throughout.

## 6. Plot identity across the junction

A finer scan scores a 100-column window stepped one column at a time over the
600-column junction cut. A `bar` track holds one value per column of the file
beneath it, so the cut travels as its own file:

```python
def track_values(row, subject):
    values = []
    for i in range(len(junction[row])):
        center = offset + i
        start = max(0, center - TRACK_WINDOW // 2)
        values.append(round(identity(row, subject, start, start + TRACK_WINDOW)))
    return values
```

```
GII.P16-GII.4/US/2016 to GII.P16-GII.2/CN/2016 (polymerase donor): 600 values, 62-100%
GII.P16-GII.4/US/2016 to GII.Pe-GII.4/JP/2012 (capsid donor): 600 values, 69-99%
in the junction cut the GII.P16-GII.4/US/2016 curves change rank at column 287 of 600, column 5124 of the whole alignment
the two GII.P16-GII.4/US/2016 tracks take 6678 characters of a URL-encoded link, under the 8192-character request line the server answers
```

[![](../media/norovirus_recombination-5.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A2.1%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-junction.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A301%2C%22end%22%3A301%2C%22label%22%3A%22ORF2%20starts%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22query-a%22%2C%22name%22%3A%22to%20GII.P16-GII.2%2FCN%2F2016%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C98%2C97%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C95%2C94%2C94%2C94%2C93%2C92%2C91%2C90%2C89%2C89%2C89%2C89%2C89%2C89%2C89%2C88%2C87%2C87%2C87%2C87%2C87%2C87%2C87%2C86%2C86%2C86%2C86%2C86%2C86%2C85%2C84%2C83%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C82%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C80%2C80%2C79%2C79%2C79%2C78%2C78%2C78%2C78%2C78%2C78%2C77%2C77%2C76%2C76%2C76%2C76%2C76%2C76%2C76%2C76%2C76%2C76%2C75%2C74%2C74%2C73%2C73%2C73%2C72%2C72%2C72%2C72%2C72%2C72%2C71%2C71%2C71%2C70%2C69%2C70%2C70%2C71%2C71%2C70%2C70%2C70%2C70%2C69%2C69%2C70%2C70%2C70%2C71%2C71%2C72%2C72%2C73%2C73%2C72%2C72%2C72%2C72%2C72%2C73%2C73%2C73%2C73%2C73%2C73%2C73%2C73%2C74%2C74%2C74%2C73%2C72%2C71%2C72%2C73%2C74%2C75%2C75%2C75%2C75%2C75%2C74%2C74%2C74%2C73%2C73%2C73%2C73%2C74%2C74%2C73%2C72%2C71%2C70%2C70%2C71%2C70%2C71%2C71%2C70%2C71%2C71%2C71%2C71%2C71%2C71%2C72%2C72%2C72%2C72%2C72%2C71%2C71%2C71%2C70%2C69%2C69%2C69%2C70%2C71%2C70%2C71%2C71%2C70%2C71%2C71%2C70%2C71%2C71%2C71%2C72%2C72%2C72%2C72%2C73%2C72%2C73%2C73%2C73%2C73%2C72%2C72%2C72%2C72%2C72%2C71%2C70%2C69%2C68%2C68%2C67%2C67%2C67%2C66%2C67%2C67%2C66%2C66%2C66%2C65%2C66%2C66%2C65%2C64%2C64%2C64%2C64%2C64%2C64%2C64%2C65%2C65%2C66%2C66%2C65%2C65%2C65%2C64%2C63%2C63%2C62%2C63%2C63%2C63%2C64%2C64%2C63%2C63%2C63%2C62%2C63%2C64%2C65%2C66%2C66%2C66%2C67%2C67%2C67%2C68%2C68%2C68%2C68%2C68%2C67%2C67%2C67%2C67%2C68%2C68%2C67%2C68%2C68%2C68%2C69%2C70%2C69%2C68%2C68%2C67%2C68%2C68%2C67%2C68%2C68%2C68%2C69%2C69%2C69%2C69%2C69%2C68%2C68%2C69%2C68%2C68%2C68%2C67%2C67%2C68%2C68%2C68%2C68%2C69%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77%2C77%2C78%2C78%2C77%2C78%2C78%2C78%2C79%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22query-b%22%2C%22name%22%3A%22to%20GII.Pe-GII.4%2FJP%2F2012%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B85%2C86%2C86%2C85%2C86%2C86%2C86%2C86%2C86%2C86%2C86%2C86%2C85%2C86%2C86%2C85%2C85%2C84%2C84%2C85%2C85%2C84%2C84%2C84%2C84%2C85%2C85%2C85%2C85%2C85%2C85%2C86%2C86%2C85%2C85%2C85%2C84%2C84%2C84%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C84%2C83%2C82%2C82%2C81%2C82%2C82%2C82%2C81%2C81%2C80%2C80%2C80%2C80%2C80%2C80%2C79%2C79%2C79%2C78%2C79%2C79%2C78%2C78%2C78%2C77%2C77%2C77%2C76%2C76%2C76%2C75%2C75%2C75%2C75%2C75%2C75%2C74%2C74%2C74%2C73%2C73%2C73%2C72%2C73%2C73%2C73%2C74%2C74%2C73%2C74%2C74%2C73%2C73%2C73%2C73%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C74%2C75%2C75%2C75%2C74%2C75%2C75%2C75%2C75%2C75%2C74%2C73%2C73%2C72%2C72%2C72%2C71%2C71%2C71%2C70%2C71%2C71%2C70%2C71%2C71%2C71%2C71%2C71%2C71%2C71%2C71%2C70%2C70%2C70%2C70%2C70%2C70%2C69%2C70%2C71%2C71%2C72%2C72%2C72%2C72%2C73%2C72%2C73%2C74%2C73%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C74%2C74%2C75%2C75%2C75%2C76%2C76%2C75%2C75%2C75%2C75%2C76%2C76%2C76%2C77%2C78%2C77%2C78%2C78%2C77%2C77%2C77%2C76%2C77%2C77%2C76%2C76%2C76%2C76%2C76%2C76%2C76%2C77%2C77%2C77%2C78%2C78%2C78%2C78%2C78%2C78%2C79%2C79%2C79%2C79%2C79%2C79%2C80%2C81%2C81%2C82%2C82%2C82%2C83%2C84%2C84%2C85%2C85%2C85%2C86%2C86%2C86%2C86%2C85%2C85%2C85%2C85%2C85%2C86%2C86%2C86%2C86%2C86%2C86%2C87%2C87%2C87%2C87%2C87%2C87%2C87%2C87%2C87%2C88%2C88%2C88%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C91%2C91%2C92%2C92%2C92%2C93%2C93%2C93%2C93%2C93%2C93%2C93%2C93%2C93%2C94%2C94%2C94%2C94%2C94%2C94%2C94%2C94%2C94%2C95%2C95%2C95%2C96%2C96%2C96%2C97%2C97%2C97%2C98%2C99%2C99%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C97%2C97%2C98%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C97%2C97%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C95%2C96%2C96%2C96%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C98%2C98%2C99%2C99%2C99%2C99%2C99%2C99%2C99%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%23e15759%22%2C%22height%22%3A60%7D%5D%7D%7D)

The junction cut under the two identity curves of GII.P16-GII.4/US/2016, blue to
the polymerase donor and red to the capsid donor. Blue falls from 100% on the
left to the 60s and 70s on the right while red climbs, and the two change rank
at column 287 of the cut, column 5,124 of the alignment and 14 columns before
the first base of ORF2.

## 7. Plot the same curves for the control

GII.Pe-GII.4/US/2013 has the polymerase and the capsid of the capsid donor's
lineage. Score it against the two parents over the same 600 columns:

```
GII.Pe-GII.4/US/2013 to GII.P16-GII.2/CN/2016 (polymerase donor): 600 values, 65-91%
GII.Pe-GII.4/US/2013 to GII.Pe-GII.4/JP/2012 (capsid donor): 600 values, 96-100%
the GII.Pe-GII.4/US/2013 curves change rank at 0 columns of the cut
```

[![](../media/norovirus_recombination-6.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A2.1%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-junction.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A301%2C%22end%22%3A301%2C%22label%22%3A%22ORF2%20starts%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22control-a%22%2C%22name%22%3A%22to%20GII.P16-GII.2%2FCN%2F2016%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B82%2C83%2C83%2C82%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C83%2C82%2C83%2C83%2C82%2C82%2C81%2C81%2C82%2C82%2C81%2C81%2C81%2C81%2C82%2C82%2C82%2C82%2C82%2C82%2C83%2C83%2C82%2C82%2C82%2C81%2C81%2C81%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C81%2C80%2C79%2C79%2C78%2C79%2C79%2C79%2C78%2C78%2C77%2C77%2C77%2C77%2C77%2C77%2C76%2C76%2C77%2C76%2C77%2C77%2C76%2C77%2C77%2C76%2C76%2C76%2C75%2C75%2C75%2C74%2C74%2C74%2C74%2C74%2C74%2C73%2C74%2C74%2C73%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C73%2C73%2C74%2C74%2C73%2C73%2C73%2C73%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C74%2C75%2C75%2C75%2C74%2C75%2C75%2C75%2C75%2C75%2C74%2C73%2C73%2C72%2C72%2C72%2C71%2C72%2C72%2C71%2C72%2C72%2C71%2C72%2C72%2C72%2C72%2C72%2C72%2C72%2C72%2C71%2C71%2C71%2C71%2C71%2C71%2C70%2C71%2C72%2C72%2C73%2C73%2C73%2C73%2C74%2C74%2C75%2C76%2C75%2C75%2C75%2C74%2C75%2C75%2C74%2C75%2C75%2C74%2C75%2C75%2C74%2C75%2C76%2C76%2C77%2C77%2C77%2C78%2C78%2C77%2C77%2C77%2C77%2C78%2C78%2C78%2C79%2C80%2C79%2C80%2C80%2C79%2C80%2C80%2C79%2C79%2C79%2C78%2C78%2C78%2C78%2C78%2C78%2C78%2C79%2C79%2C79%2C80%2C80%2C80%2C80%2C80%2C80%2C81%2C81%2C81%2C81%2C81%2C81%2C82%2C83%2C83%2C84%2C84%2C84%2C85%2C85%2C85%2C86%2C86%2C86%2C87%2C87%2C87%2C87%2C86%2C86%2C86%2C86%2C86%2C87%2C87%2C87%2C87%2C87%2C87%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C88%2C89%2C89%2C88%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C89%2C89%2C89%2C89%2C89%2C88%2C87%2C88%2C88%2C87%2C86%2C85%2C84%2C83%2C83%2C83%2C84%2C84%2C84%2C85%2C84%2C83%2C84%2C84%2C84%2C85%2C86%2C86%2C85%2C85%2C85%2C85%2C85%2C85%2C84%2C83%2C82%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C81%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C80%2C79%2C79%2C79%2C78%2C78%2C79%2C79%2C79%2C79%2C78%2C78%2C77%2C77%2C77%2C77%2C77%2C77%2C77%2C77%2C77%2C77%2C77%2C76%2C76%2C75%2C75%2C75%2C74%2C74%2C74%2C74%2C74%2C74%2C73%2C73%2C73%2C72%2C71%2C72%2C72%2C73%2C73%2C72%2C72%2C72%2C72%2C71%2C71%2C72%2C72%2C72%2C73%2C73%2C74%2C74%2C75%2C75%2C74%2C74%2C74%2C74%2C74%2C75%2C75%2C75%2C75%2C75%2C75%2C75%2C75%2C76%2C76%2C76%2C75%2C74%2C73%2C74%2C75%2C76%2C77%2C77%2C77%2C77%2C77%2C76%2C76%2C76%2C75%2C75%2C75%2C75%2C76%2C76%2C75%2C74%2C73%2C73%2C73%2C73%2C72%2C73%2C73%2C72%2C73%2C73%2C73%2C73%2C73%2C73%2C74%2C74%2C74%2C74%2C74%2C73%2C73%2C73%2C72%2C71%2C71%2C71%2C71%2C72%2C71%2C72%2C72%2C71%2C72%2C72%2C71%2C72%2C72%2C72%2C73%2C73%2C73%2C73%2C74%2C73%2C74%2C74%2C74%2C74%2C73%2C73%2C73%2C73%2C73%2C72%2C71%2C70%2C69%2C69%2C68%2C69%2C69%2C69%2C70%2C70%2C69%2C69%2C69%2C68%2C69%2C69%2C68%2C67%2C67%2C67%2C67%2C67%2C67%2C67%2C68%2C68%2C69%2C69%2C68%2C68%2C68%2C67%2C66%2C66%2C65%2C66%2C66%2C66%2C67%2C67%2C66%2C66%2C66%2C65%2C66%2C67%2C68%2C68%2C68%2C68%2C69%2C69%2C69%2C70%2C70%2C70%2C70%2C70%2C69%2C69%2C69%2C69%2C70%2C70%2C69%2C70%2C70%2C70%2C71%2C72%2C71%2C70%2C70%2C69%2C70%2C70%2C69%2C70%2C70%2C70%2C71%2C71%2C71%2C71%2C71%2C70%2C70%2C71%2C70%2C70%2C70%2C69%2C69%2C70%2C70%2C70%2C70%2C71%2C72%2C73%2C74%2C75%2C76%2C77%2C78%2C78%2C78%2C78%2C78%2C77%2C78%2C78%2C78%2C79%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22control-b%22%2C%22name%22%3A%22to%20GII.Pe-GII.4%2FJP%2F2012%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C99%2C99%2C99%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C97%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C96%2C97%2C97%2C97%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C98%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C99%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%2C100%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%23e15759%22%2C%22height%22%3A60%7D%5D%7D%7D)

The junction cut under the control's two curves. Red stays between 96% and 100%
and blue between 65% and 91%, so the two never cross.

## 8. Check the crossing against the bases

Count the differences to each parent in the 500 columns either side of the
crossing, 7 against the polymerase donor before it and 142 after:

```
GII.P16-GII.4/US/2016   the 500 columns before 5124: 7/500 differences to GII.P16-GII.2/CN/2016, 103/500 to GII.Pe-GII.4/JP/2012
GII.P16-GII.4/US/2016   the 500 columns after 5124: 142/500 differences to GII.P16-GII.2/CN/2016, 19/500 to GII.Pe-GII.4/JP/2012
GII.Pe-GII.4/US/2013    the 500 columns before 5124: 103/500 differences to GII.P16-GII.2/CN/2016, 7/500 to GII.Pe-GII.4/JP/2012
GII.Pe-GII.4/US/2013    the 500 columns after 5124: 138/500 differences to GII.P16-GII.2/CN/2016, 3/500 to GII.Pe-GII.4/JP/2012
```

[![](../media/norovirus_recombination-7.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A560%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A26%2C%22colWidth%22%3A15%2C%22relativeTo%22%3A%22GII.P16-GII.4%2FUS%2F2016%22%2C%22scrollX%22%3A-76185%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22highlights%22%3A%5B%7B%22start%22%3A5124%2C%22end%22%3A5124%7D%5D%7D%7D)

Columns 5,080 to 5,163 at base resolution, every row read against
GII.P16-GII.4/US/2016, with a dot for the same base and a letter for a different
one. Left of the marked column the GII.Pe-GII.4 rows have five letters each and
the GII.P16-GII.2 rows none; right of it the counts are three and one.

## 9. Open the result from one link

<!-- usage: web -->

[![](../media/norovirus_recombination-8.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A500%2C%22treeAreaWidth%22%3A300%2C%22rowHeight%22%3A24%2C%22colWidth%22%3A0.162%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-orf2.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fnorovirus%2Fnoro-parents.gff%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22featureFill%22%2C%22field%22%3A%22Name%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22GII.P16%22%2C%22GII.4%20Sydney%22%2C%22tie%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%23bab0ac%22%5D%7D%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A5138%2C%22end%22%3A6826%2C%22label%22%3A%22ORF2%22%2C%22color%22%3A%22rgba(0%2C0%2C0%2C0.07)%22%7D%2C%7B%22start%22%3A5124%2C%22end%22%3A5124%2C%22label%22%3A%22breakpoint%22%7D%5D%7D%7D>)

The alignment, the ORF2 tree and the parent windows, with ORF2 a pale band and
the crossing a line through it.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same hosted alignment,
ORF2 tree and window GFF, with the window fill as a `scale_row_color()` layer
and the ORF2 band and the crossing as highlights. `w` alone opens the viewer in
RStudio or a notebook, and `msaview_plot()` draws it as a ggplot2 figure:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/norovirus"
w <- msaview(
  msa = file.path(data, "noro.afa"),
  tree = file.path(data, "noro-orf2.nwk"),
  gff = file.path(data, "noro-parents.gff")
) +
  scale_row_color("Name", channel = "featureFill", range = c(
    "GII.P16" = "#4e79a7", "GII.4 Sydney" = "#e15759", tie = "#bab0ac"
  )) +
  geom_msa_highlight(start = 5138, end = 6826, label = "ORF2",
    color = "grey75") +
  geom_msa_highlight(start = 5124, end = 5124, label = "breakpoint")
w
ggplot2::ggsave("norovirus_recombination-8-r.png", msaview_plot(w),
  width = 12, height = 5)
```

![](../media/norovirus_recombination-8-r.png)

The twelve genomes beside the ORF2 tree as a ggplot2 figure, each window filled
by its closer parent. The three GII.P16-GII.4 rows run blue to the breakpoint
line at 5,124 and red after it, inside the grey ORF2 band.

<!-- /usage -->

## Reproduce it end to end

[`build_norovirus_recombination.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_norovirus_recombination.sh)
runs the steps above in order:

1. It fetches the twelve genomes and their GenBank records from NCBI, writing
   the sequences under their labels and the ORFs as a GFF.
2. MAFFT aligns the genomes, and FastTree builds one tree from the ORF1 columns
   and another from the ORF2 columns, since a recombinant sits in a different
   clade on each side of the junction.
3. It scores every row against the two parents, as a GFF of 200-base windows and
   as bar tracks of identity across the junction.
4. It counts the differences to each parent in the 500 columns either side of
   the crossing, for the recombinant and the control.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_norovirus_recombination.sh
bash build_norovirus_recombination.sh
```

With no arguments the script writes the row table above and prints every number
on this page, in about a minute, most of it the two Docker pulls. Pass your own
table for another set of genomes:

```bash
bash build_norovirus_recombination.sh my-rows.tsv out/
```

Four labels at the top of the script name the recombinant, its two parents and
the control.

## See also

- [The recombination breakpoint in XBB's spike gene](https://gmod.org/JBrowseMSA/tutorials/recombination_breakpoint)
- [Eight mitochondrial genomes and the genes on them](https://gmod.org/JBrowseMSA/tutorials/mitogenome_genes)
- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Ludwig-Begall LF, Mauroy A, Thiry E. Norovirus recombinants: recurrent in the
  field, recalcitrant in the lab. _J Gen Virol_ 99:970-988.
- Cannon JL, Barclay L, Collins NR, et al. Genetic and epidemiologic trends of
  norovirus outbreaks in the United States from 2013 to 2016 demonstrated
  emergence of novel GII.4 recombinant viruses. _J Clin Microbiol_ 55:2208-2221.
- Chhabra P, de Graaf M, Parra GI, et al. Updated classification of norovirus
  genogroups and genotypes. _J Gen Virol_ 100:1393-1406.
- Katoh K, Standley DM. MAFFT multiple sequence alignment software version 7:
  improvements in performance and usability. _Mol Biol Evol_ 30:772-780.
- Price MN, Dehal PS, Arkin AP. FastTree 2: approximately maximum-likelihood
  trees for large alignments. _PLoS One_ 5:e9490.
