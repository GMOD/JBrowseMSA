# AlphaFold confidence across a protein family

AlphaFold scores every residue it models with pLDDT, a confidence from 0 to 100
that AlphaFold DB bands as very high (above 90), confident (70 to 90), low (50
to 70) and very low (below 50). TDP-43, the protein the _TARDBP_ gene encodes,
has three folded domains and a 150-residue C-terminal region, so its models
score at both ends of that range, and the folded domains should score high in
every model. For fourteen vertebrate TDP-43 orthologs, we:

- fetch the UniProt sequences, align them and infer a tree
- read the pLDDT from each AlphaFold model and add the mean per column as a
  track
- mark the Pfam domains and each row's runs under pLDDT 50
- add one strip per domain with each row's band
- check two columns against the model files and open the result

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- python3, standard library only

## The data

Fourteen UniProtKB entries and their AlphaFold models. AlphaFold DB is keyed on
UniProt accession, so one accession fetches the sequence and the model both.
Nothing to download: the commands below fetch these.

| What it is                                                                      | File                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Every sequence in one request, shown here with two of the fourteen accessions   | [uniprotkb-accessions](https://rest.uniprot.org/uniprotkb/accessions?accessions=Q13148,Q921F2&format=fasta) |
| One AlphaFold record per accession, which names its files, for example          | [Q13148](https://alphafold.ebi.ac.uk/api/prediction/Q13148)                                                 |
| The model that record names, whose B-factor column holds the pLDDT, for example | [AF-Q13148-F1-model_v6.pdb](https://alphafold.ebi.ac.uk/files/AF-Q13148-F1-model_v6.pdb)                    |
| The Pfam matches of the human sequence                                          | [Q13148](https://www.ebi.ac.uk/interpro/api/entry/pfam/protein/uniprot/Q13148)                              |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                      | File                                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The row table the commands below start from                     | [tardbp-rows.tsv](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp-rows.tsv)         |
| The alignment they write                                        | [tardbp.afa](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp.afa)                   |
| Its tree                                                        | [tardbp.nwk](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp.nwk)                   |
| The runs each model scores under 50                             | [tardbp-lowconf.gff](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp-lowconf.gff)   |
| The band each row falls in per domain                           | [tardbp-rowdata.json](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp-rowdata.json) |
| The tracks and the highlights, the layers the links below carry | [tardbp-layers.json](https://gmod.org/JBrowseMSA/demo/data/tdp43/tardbp-layers.json)   |

</details>

## 1. Name the rows

Write one species per line: the label the viewer draws, then the UniProtKB
accession. The label becomes the FASTA defline, the tree tip, the GFF seq_id and
the `row` of every layer.

```
Human	Q13148
Mouse	Q921F2
Cow	G3MX91
Elephant	G3TD75
Opossum	A0A5F8GU32
Platypus	F7EDX1
Chicken	Q5ZLN5
Turtle	K7FJ67
Lizard	A0A670IXJ6
Frog	Q28F51
Coelacanth	H3BC22
Zebrafish	Q802C7
Seabream	A0A671WI33
Ghostshark	A0A4W3GN84
```

Both teleost entries are the `tardbpb` paralog, which runs the full length of
the protein.

## 2. Fetch the sequences

One request takes every accession, and a short script rewrites each defline to
the species label:

```bash
accessions=$(awk -F'\t' '{printf "%s%s", sep, $2; sep=","}' rows.tsv)
curl -sf "https://rest.uniprot.org/uniprotkb/accessions?accessions=$accessions&format=fasta" \
  -o tardbp-uniprot.fasta
```

```
  Human        Q13148       414 aa
  Mouse        Q921F2       414 aa
  Cow          G3MX91       414 aa
  Elephant     G3TD75       414 aa
  Opossum      A0A5F8GU32   414 aa
  Platypus     F7EDX1       414 aa
  Chicken      Q5ZLN5       414 aa
  Turtle       K7FJ67       414 aa
  Lizard       A0A670IXJ6   415 aa
  Frog         Q28F51       409 aa
  Coelacanth   H3BC22       412 aa
  Zebrafish    Q802C7       412 aa
  Seabream     A0A671WI33   406 aa
  Ghostshark   A0A4W3GN84   404 aa
```

## 3. Align and infer a tree

ClustalW aligns the sequences in input order and infers a neighbor-joining tree:

```bash
clustalw -INFILE=tardbp.fasta -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE=tardbp.afa
clustalw -INFILE=tardbp.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
tr -d '[:space:]' < tardbp.ph > tardbp.nwk
```

```
14 rows, 431 columns
(((((Human:0.01799,((Chicken:0.01026,(Turtle:0.00330,Lizard:0.02575):0.00303):0.00546,
(Frog:0.07202,(Coelacanth:0.08469,((Zebrafish:0.08572,Seabream:0.08841):0.05655,
Ghostshark:0.07870):0.03228):0.01066):0.02077):0.01299):0.00134,Mouse:0.01773):0.00213,
Cow:0.00108):0.00132,Platypus:0.00236):0.00000,Elephant:0.00238,Opossum:0.00000);
```

[![](../media/alphafold_confidence-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%7D%7D)

Fourteen rows of 431 columns, 387 of which have a residue in every row. The gaps
cluster in the right third, right of the C-terminal callout. The mammal rows sit
on branches of 0.001 to 0.02 substitutions per site, and on those distances
neighbor joining places Human beside the sauropsids, outside the other mammals.

## 4. Read the pLDDT from the models

The AlphaFold API record for each accession names its model file. Send a
`User-Agent` header, since the API answers a request without one with a 403:

```bash
url=$(curl -sf -A "$UA" "https://alphafold.ebi.ac.uk/api/prediction/Q13148" |
  python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["pdbUrl"])')
curl -sf -A "$UA" "$url" -o models/Q13148.pdb
```

AlphaFold writes each residue's pLDDT into the B-factor column of its CA atom,
beside the residue name, so one pass reads the model's sequence and confidence
together:

```python
def read_model(path):
    seq, plddt = '', []
    for line in open(path):
        if line.startswith('ATOM') and line[12:16].strip() == 'CA':
            seq += THREE_TO_ONE[line[17:20]]
            plddt.append(float(line[60:66]))
    return seq, plddt
```

A model follows the UniProt sequence of the day it was built, so the script
compares it to the row letter by letter first:

```
  Human        Q13148       model 414 aa matches the row, mean pLDDT  65.2, 156 residues under 50
  Mouse        Q921F2       model 414 aa matches the row, mean pLDDT  63.8, 162 residues under 50
  Cow          G3MX91       model 414 aa matches the row, mean pLDDT  61.6, 172 residues under 50
  Elephant     G3TD75       model 414 aa matches the row, mean pLDDT  62.0, 178 residues under 50
  Opossum      A0A5F8GU32   model 414 aa matches the row, mean pLDDT  62.4, 169 residues under 50
  Platypus     F7EDX1       model 414 aa matches the row, mean pLDDT  61.9, 175 residues under 50
  Chicken      Q5ZLN5       model 414 aa matches the row, mean pLDDT  65.8, 155 residues under 50
  Turtle       K7FJ67       model 414 aa matches the row, mean pLDDT  61.4, 175 residues under 50
  Lizard       A0A670IXJ6   model 415 aa matches the row, mean pLDDT  62.3, 173 residues under 50
  Frog         Q28F51       model 409 aa matches the row, mean pLDDT  66.5, 156 residues under 50
  Coelacanth   H3BC22       model 412 aa matches the row, mean pLDDT  61.5, 167 residues under 50
  Zebrafish    Q802C7       model 412 aa matches the row, mean pLDDT  65.9, 149 residues under 50
  Seabream     A0A671WI33   model 406 aa matches the row, mean pLDDT  61.6, 170 residues under 50
  Ghostshark   A0A4W3GN84   model 404 aa matches the row, mean pLDDT  62.0, 172 residues under 50
```

Every model matches its row. The column track holds the rounded mean over the
rows with a residue in each column, and a `text` track writes each column's band
as one letter, `V`, `C`, `L` or `D` from very high to very low:

```python
means = [round(sum(values) / len(values)) for values in by_column]
bands = ''.join(band(m) for m in means)
```

```
columns by mean pLDDT band: 6 very high, 214 confident, 24 low, 187 very low
```

[![](../media/alphafold_confidence-2.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%7D%7D)

The mean pLDDT per column as bars, with its band below in AlphaFold DB's colors.
Three blue blocks of confident columns sit between two dips, and the columns
from 272 to the right edge are very low.

## 5. Mark the Pfam domains

InterPro serves the Pfam matches of the human sequence in one request:

```bash
curl -sf https://www.ebi.ac.uk/interpro/api/entry/pfam/protein/uniprot/Q13148 \
  -o tardbp-pfam.json
```

The script writes each match as a highlight on the Human row, in that row's
residue numbering:

```
TDP43_N  PF18694 Human 4-76: columns 5-77, mean pLDDT  84.0
RRM1     PF00076 Human 106-164: columns 112-170, mean pLDDT  85.5
RRM2     PF00076 Human 193-241: columns 203-251, mean pLDDT  82.7
TDP43_C  PF20910 Human 262-371: columns 272-387, mean pLDDT  38.4
```

[![](../media/alphafold_confidence-3.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A4%2C%22end%22%3A76%2C%22label%22%3A%22TDP43_N%204-76%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A106%2C%22end%22%3A164%2C%22label%22%3A%22RRM1%20106-164%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A193%2C%22end%22%3A241%2C%22label%22%3A%22RRM2%20193-241%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A262%2C%22end%22%3A371%2C%22label%22%3A%22TDP43_C%20262-371%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%5D%7D%7D>)

The four Pfam matches (TDP43_N, RRM1, RRM2 and TDP43_C) as blue bands over the
alignment, under the mean pLDDT and band tracks. The first three bands sit under
confident columns and the fourth under very low ones.

## 6. Mark each row's low-confidence runs

The script writes each model's runs of five or more residues under pLDDT 50 to a
GFF, in that row's residue numbering:

```python
gff.write(f'{label}\tAlphaFold\tpolypeptide_region\t{start + 1}\t{i}\t.\t.\t.\t'
          f'Name=pLDDT<50;color=%23ff7d45\n')
```

```
71 runs of 5 or more residues under pLDDT 50 across the 14 rows
```

[![](../media/alphafold_confidence-4.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-lowconf.gff%22%7D%2C%22showDomainLegend%22%3Afalse%7D%7D)

Each row's runs under pLDDT 50 in orange over its residues. Every row has a run
near Human residues 80 to 101 and one filling the C-terminal region, and every
row but Zebrafish has a short run near residues 181 to 187.

## 7. Add one strip per domain

For each row and Pfam domain, the script writes the band of the row's mean pLDDT
over the domain's columns:

```json
{
  "Human": {
    "TDP43_N": "confident",
    "RRM1": "confident",
    "TDP43_C": "very low"
  }
}
```

```
TDP43_N  14 rows confident
RRM1     14 rows confident
RRM2     14 rows confident
TDP43_C  14 rows very low
```

Four `strip` panels read those fields through one scale from band to color under
one `legend.title`, so the four share one legend:

```json
"rowPanels": [
  {
    "kind": "strip",
    "encoding": {
      "fill": {
        "field": "RRM1",
        "legend": { "title": "pLDDT band" },
        "scale": {
          "domain": ["very high", "confident", "low", "very low"],
          "range": ["#0053d6", "#65cbf3", "#ffdb13", "#ff7d45"]
        }
      }
    }
  }
]
```

[![](../media/alphafold_confidence-5.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-rowdata.json%22%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22TDP43_N%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22TDP43_N%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22RRM1%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22RRM1%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22RRM2%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22RRM2%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22TDP43_C%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22TDP43_C%22%2C%22width%22%3A14%7D%5D%7D%7D)

Four strips between the tree and the alignment, one per Pfam domain. Three are
confident in all fourteen rows and the fourth is very low in all fourteen.

## 8. Check two columns against the models

The script reads each model file at one column inside RRM1 and one inside the
C-terminal region:

```
RRM1, alignment column 133 (Human residue 127):
  Human        F  86.4
  Mouse        F  87.6
  Cow          F  84.4
  Elephant     F  85.2
  Opossum      F  84.9
  Platypus     F  85.1
  Chicken      F  87.9
  Turtle       F  84.8
  Lizard       F  85.5
  Frog         F  88.2
  Coelacanth   F  82.8
  Zebrafish    F  87.3
  Seabream     F  82.4
  Ghostshark   F  85.2
TDP43_C, alignment column 316 (Human residue 303):
  Human        Q  47.4
  Mouse        Q  40.7
  Cow          Q  31.6
  Elephant     Q  30.5
  Opossum      Q  33.3
  Platypus     Q  32.8
  Chicken      Q  45.2
  Turtle       Q  31.9
  Lizard       Q  32.9
  Frog         Q  46.6
  Coelacanth   Q  34.5
  Zebrafish    S  39.3
  Seabream     T  30.9
  Ghostshark   P  48.8
```

[![](../media/alphafold_confidence-6.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A20%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-2380%2C%22relativeTo%22%3A%22Human%22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-lowconf.gff%22%7D%2C%22showDomainLegend%22%3Afalse%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A127%2C%22end%22%3A127%2C%22label%22%3A%22Human%20127%22%7D%5D%7D%7D)

The RRM1 column at residue resolution, every row compared with the Human row: a
dot is the same residue, a letter a different one. The boxed column 133 is Human
residue 127, phenylalanine in all fourteen rows, which score 82.4 to 88.2. The
orange boxes at the right edge are the runs under 50 that begin near Human
residue 181.

[![](../media/alphafold_confidence-ctd-column.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A20%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-6000%2C%22relativeTo%22%3A%22Human%22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-lowconf.gff%22%7D%2C%22showDomainLegend%22%3Afalse%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A303%2C%22end%22%3A303%2C%22label%22%3A%22Human%20303%22%7D%5D%7D%7D)

The TDP43_C column at residue resolution, where the boxed column 316, Human
residue 303, sits in an orange run under 50 in every row. The rows score 30.5 to
48.8 there, and three have a different residue.

One stretch of the C-terminal region rises out of the very low band:

```
inside TDP43_C, columns 335-339 rise to a mean of 52, which is Human residues 320-324
```

[![](../media/alphafold_confidence-7.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A20%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-6400%2C%22relativeTo%22%3A%22Human%22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-lowconf.gff%22%7D%2C%22showDomainLegend%22%3Afalse%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A320%2C%22end%22%3A324%2C%22label%22%3A%22Human%20320-324%22%7D%5D%7D%7D)

Human residues 320 to 324, where the band track turns yellow. In most rows the
orange run under 50 stops at the boxed columns and starts again after them.
Conicella et al. 2016 measured a transient helix over Human residues 321 to 340
by NMR.

## 9. Open the result

<!-- usage: web -->

The snapshot loads the four files by URL:

```json
{
  "msaview": {
    "type": "MsaView",
    "colWidth": 3.2,
    "rowHeight": 22,
    "colorSchemeName": "clustalx_protein_dynamic",
    "msaFilehandle": { "uri": "https://example.org/tardbp.afa" },
    "treeFilehandle": { "uri": "https://example.org/tardbp.nwk" },
    "gffFilehandle": { "uri": "https://example.org/tardbp-lowconf.gff" },
    "treeMetadataFilehandle": {
      "uri": "https://example.org/tardbp-rowdata.json"
    }
  }
}
```

Add the `columnTracks`, `highlights` and `rowPanels` entries from
`tardbp-layers.json` beside them, URL-encode the object, and append it to the
app URL as `#data=`, about 6,200 characters in all.

[![](../media/alphafold_confidence-8.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A540%2C%22treeAreaWidth%22%3A190%2C%22colWidth%22%3A3.2%2C%22rowHeight%22%3A22%2C%22colorSchemeName%22%3A%22clustalx_protein_dynamic%22%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22plddt-mean%22%2C%22name%22%3A%22Mean%20pLDDT%22%2C%22kind%22%3A%22bar%22%2C%22values%22%3A%5B48%2C55%2C63%2C80%2C84%2C89%2C89%2C89%2C88%2C83%2C75%2C67%2C68%2C76%2C81%2C85%2C86%2C89%2C88%2C87%2C87%2C87%2C79%2C80%2C81%2C88%2C89%2C89%2C88%2C87%2C89%2C89%2C87%2C88%2C87%2C86%2C82%2C80%2C85%2C85%2C88%2C90%2C89%2C88%2C84%2C81%2C76%2C78%2C80%2C79%2C79%2C84%2C83%2C86%2C89%2C88%2C88%2C87%2C85%2C84%2C89%2C89%2C87%2C83%2C79%2C71%2C71%2C80%2C81%2C78%2C80%2C83%2C86%2C88%2C88%2C88%2C86%2C84%2C76%2C64%2C49%2C46%2C40%2C44%2C47%2C41%2C42%2C42%2C44%2C41%2C40%2C43%2C45%2C44%2C43%2C43%2C39%2C43%2C44%2C41%2C40%2C38%2C37%2C35%2C39%2C40%2C49%2C55%2C60%2C72%2C81%2C85%2C87%2C89%2C87%2C86%2C89%2C87%2C87%2C87%2C86%2C89%2C89%2C89%2C90%2C90%2C90%2C91%2C90%2C89%2C89%2C89%2C86%2C86%2C86%2C88%2C82%2C79%2C89%2C85%2C89%2C85%2C87%2C82%2C78%2C81%2C82%2C79%2C80%2C85%2C83%2C84%2C89%2C89%2C89%2C89%2C84%2C87%2C81%2C80%2C79%2C81%2C84%2C83%2C80%2C85%2C87%2C84%2C83%2C81%2C84%2C87%2C88%2C87%2C83%2C84%2C86%2C88%2C89%2C85%2C87%2C82%2C81%2C70%2C60%2C52%2C47%2C44%2C43%2C44%2C46%2C46%2C40%2C45%2C42%2C47%2C47%2C51%2C55%2C62%2C74%2C83%2C86%2C86%2C86%2C82%2C81%2C80%2C80%2C79%2C78%2C77%2C86%2C85%2C85%2C86%2C86%2C87%2C86%2C86%2C85%2C84%2C83%2C80%2C81%2C84%2C87%2C83%2C81%2C87%2C85%2C86%2C81%2C82%2C80%2C82%2C77%2C81%2C86%2C87%2C89%2C88%2C85%2C86%2C80%2C76%2C76%2C77%2C80%2C77%2C75%2C79%2C79%2C75%2C70%2C71%2C77%2C78%2C79%2C77%2C71%2C71%2C77%2C77%2C83%2C80%2C84%2C77%2C80%2C71%2C70%2C58%2C56%2C44%2C38%2C40%2C41%2C46%2C43%2C42%2C43%2C42%2C44%2C41%2C39%2C42%2C38%2C38%2C36%2C39%2C42%2C35%2C34%2C36%2C36%2C37%2C39%2C34%2C33%2C35%2C36%2C37%2C35%2C33%2C38%2C36%2C36%2C35%2C36%2C36%2C35%2C37%2C35%2C38%2C38%2C38%2C34%2C36%2C35%2C34%2C34%2C32%2C33%2C35%2C38%2C34%2C34%2C34%2C34%2C34%2C37%2C40%2C47%2C46%2C52%2C51%2C52%2C55%2C51%2C48%2C51%2C51%2C51%2C50%2C48%2C48%2C48%2C40%2C34%2C38%2C39%2C37%2C35%2C36%2C33%2C35%2C37%2C38%2C36%2C34%2C35%2C34%2C31%2C28%2C44%2C33%2C33%2C35%2C35%2C36%2C40%2C34%2C33%2C34%2C36%2C35%2C34%2C34%2C43%2C36%2C34%2C33%2C31%2C31%2C32%2C32%2C31%2C34%2C30%2C33%2C31%2C31%2C33%2C33%2C35%2C33%2C33%2C34%2C34%2C29%2C32%2C32%2C33%2C32%2C35%2C34%2C37%2C33%2C35%2C37%2C34%2C35%2C33%2C35%2C34%2C35%2C33%2C36%2C34%2C39%2C37%2C40%2C39%2C40%2C41%2C43%2C45%2C43%2C44%2C52%2C46%5D%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22color%22%3A%22%234e79a7%22%2C%22height%22%3A60%7D%2C%7B%22id%22%3A%22plddt-band%22%2C%22name%22%3A%22pLDDT%20band%22%2C%22kind%22%3A%22text%22%2C%22data%22%3A%22DLLCCCCCCCCLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLDDDDDDDDDDDDDDDDDDDDDDDDDDDLLCCCCCCCCCCCCCCCVVVVVCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDLLLCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLLLLLDLLLLDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDLD%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22V%22%2C%22C%22%2C%22L%22%2C%22D%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-lowconf.gff%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftdp43%2Ftardbp-rowdata.json%22%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22TDP43_N%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22TDP43_N%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22RRM1%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22RRM1%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22RRM2%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22RRM2%22%2C%22width%22%3A14%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22TDP43_C%22%2C%22legend%22%3A%7B%22title%22%3A%22pLDDT%20band%22%7D%2C%22scale%22%3A%7B%22domain%22%3A%5B%22very%20high%22%2C%22confident%22%2C%22low%22%2C%22very%20low%22%5D%2C%22range%22%3A%5B%22%230053d6%22%2C%22%2365cbf3%22%2C%22%23ffdb13%22%2C%22%23ff7d45%22%5D%7D%7D%7D%2C%22header%22%3A%22TDP43_C%22%2C%22width%22%3A14%7D%5D%2C%22showDomainLegend%22%3Afalse%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A4%2C%22end%22%3A76%2C%22label%22%3A%22TDP43_N%204-76%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A106%2C%22end%22%3A164%2C%22label%22%3A%22RRM1%20106-164%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A193%2C%22end%22%3A241%2C%22label%22%3A%22RRM2%20193-241%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A262%2C%22end%22%3A371%2C%22label%22%3A%22TDP43_C%20262-371%22%2C%22color%22%3A%22rgba(78%2C121%2C167%2C0.18)%22%7D%5D%7D%7D>)

The final view, with the two tracks above, the four strips beside the tree, the
Pfam bands in blue and each row's runs under pLDDT 50 in orange.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the four hosted files, and
`msaview()` takes the row data and layers from `tardbp-layers.json` through
jsonlite as they stand:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/tdp43/"
layers <- jsonlite::fromJSON(paste0(data, "tardbp-layers.json"),
  simplifyVector = FALSE)
w <- msaview(
  msa = paste0(data, "tardbp.afa"),
  tree = paste0(data, "tardbp.nwk"),
  gff = paste0(data, "tardbp-lowconf.gff"),
  color_scheme = "clustalx_protein_dynamic",
  row_data = jsonlite::fromJSON(paste0(data, "tardbp-rowdata.json")),
  column_tracks = layers$columnTracks,
  highlights = layers$highlights,
  row_panels = layers$rowPanels
)
w
ggplot2::ggsave("alphafold-confidence-r.png",
  msaview_plot(w, tracks = c("plddt-mean", "plddt-band")),
  width = 12, height = 6)
```

![](../media/alphafold-confidence-r.png)

The 14 rows in ggplot2, with the four domain strips beside the tree and the Pfam
bands in blue. The mean pLDDT bars above stay high over the N-terminal domain
and the two RRMs and drop across the C-terminal domain, where every row has a
long orange run under 50.

<!-- /usage -->

## Reproduce it end to end

[`build_alphafold_confidence.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_alphafold_confidence.sh)
runs the commands and the Python above in order:

1. It fetches the fourteen sequences from UniProt and names each FASTA record by
   its species label, which every layer uses as the row name.
2. ClustalW aligns the records and infers a neighbor-joining tree.
3. It downloads each AlphaFold model and the human Pfam matches, and stops if a
   model's sequence differs from its row.
4. It writes the tracks, highlights, GFF and strip fields, then prints the
   residue check of step 8.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_alphafold_confidence.sh
bash build_alphafold_confidence.sh
```

With no arguments the script writes the row table above, builds every file
beside it and prints every number on this page. For another family, pass a table
of labels and UniProt accessions:

```bash
bash build_alphafold_confidence.sh my-rows.tsv out/
```

The script takes the first `Human` line as the reference row, and its `SHORT`
map names the Pfam domains for the highlights and strips.

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [Where p53's damaging variants fall](https://gmod.org/JBrowseMSA/tutorials/p53_variant_effects)
- [Hemoglobin's two subunits and the interfaces between them](https://gmod.org/JBrowseMSA/tutorials/protein_complex)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Jumper J, Evans R, Pritzel A, et al. Highly accurate protein structure
  prediction with AlphaFold. _Nature_ 596:583-589.
- Tunyasuvunakool K, Adler J, Wu Z, et al. Highly accurate protein structure
  prediction for the human proteome. _Nature_ 596:590-596.
- Varadi M, Anyango S, Deshpande M, et al. AlphaFold Protein Structure Database:
  massively expanding the structural coverage of protein-sequence space with
  high-accuracy models. _Nucleic Acids Res_ 50:D439-D444.
- Conicella AE, Zerze GH, Mittal J, Fawzi NL. ALS mutations disrupt phase
  separation mediated by alpha-helical structure in the TDP-43 low-complexity
  C-terminal domain. _Structure_ 24:1537-1549.
- Lukavsky PJ, Daujotyte D, Tollervey JR, et al. Molecular basis of UG-rich RNA
  recognition by the human splicing factor TDP-43. _Nat Struct Mol Biol_
  20:1443-1449.
- Thompson JD, Higgins DG, Gibson TJ. CLUSTAL W: improving the sensitivity of
  progressive multiple sequence alignment through sequence weighting,
  position-specific gap penalties and weight matrix choice. _Nucleic Acids Res_
  22:4673-4680.
