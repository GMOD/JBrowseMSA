# The SARS-CoV-2 furin insert and PDB 6VXX

The SARS-CoV-2 spike protein has four residues, PRRA, that its closest relatives
lack, and the loop holding them has no coordinates in PDB 6VXX, the first
cryo-EM structure of the trimer. For eleven coronavirus spikes, we:

- align the proteins and infer a tree
- add the InterPro domains and mark the four residues
- map the SARS-CoV-2 row onto 6VXX chain A to find the residues it resolved
- compare a fully resolved region and check the numbers against the raw data
- open the result from one link

## Prerequisites

- `curl` and `jq`
- python3, for the build script's JSON lookups
- MAFFT, `apt install mafft` on Debian or Ubuntu, `brew install mafft` on macOS
- FastTree, `apt install fasttree`, or `brew install fasttree`
- [react-msaview-cli](https://gmod.org/JBrowseMSA/cli) for the domain GFF,
  `npm install -g react-msaview-cli`, NodeJS v22+

## The data

Eleven spike glycoproteins as NCBI holds them, the UniProtKB entry for the
SARS-CoV-2 one, InterPro release 111.0 for the domains, and PDBe for everything
about the structure. Nothing to download: the commands below fetch these.

| What it is                                                                                     | File                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| All eleven protein sequences in one efetch request, shown here with one accession, for example | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=YP_009724390.1&rettype=fasta&retmode=text) |
| The UniProtKB entry, for its sequence and its feature table                                    | [P0DTC2.json](https://rest.uniprot.org/uniprotkb/P0DTC2.json)                                                                     |
| Precomputed Pfam matches for one accession                                                     | [P0DTC2](https://www.ebi.ac.uk/interpro/api/entry/pfam/protein/uniprot/P0DTC2/)                                                   |
| The SIFTS residue correspondence between UniProt and the PDB entry                             | [6vxx](https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/6vxx)                                                                      |
| Which residues of chain A have coordinates                                                     | [A](https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/6vxx/chain/A)                                                       |
| The sequence the entry deposited, tags included                                                | [6vxx](https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/6vxx)                                                                   |
| The structure itself, for a structure viewer                                                   | [6VXX.cif](https://files.rcsb.org/download/6VXX.cif)                                                                              |

Every PDBe and UniProt endpoint here serves a single record per request and
sends `Access-Control-Allow-Origin: *`.

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                       | File                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| The alignment                                    | [spike.afa](https://gmod.org/JBrowseMSA/demo/data/spike/spike.afa)                 |
| Its tree                                         | [spike.nwk](https://gmod.org/JBrowseMSA/demo/data/spike/spike.nwk)                 |
| Its domains                                      | [spike-domains.gff](https://gmod.org/JBrowseMSA/demo/data/spike/spike-domains.gff) |
| The three layers, as the build script wrote them | [spike-layers.json](https://gmod.org/JBrowseMSA/demo/data/spike/spike-layers.json) |

</details>

## 1. Choose the rows

Three columns: the NCBI protein, the label the viewer draws, and the UniProtKB
entry for the same protein where one exists.

```
YP_009724390.1	SARS-CoV-2	P0DTC2
QHR63300.2	RaTG13	A0ABF7PLN6
UAY13217.1	BANAL-20-52	-
QIA48632.1	Pangolin-GX	-
NP_828851.1	SARS-CoV	P59594
YP_009047204.1	MERS-CoV	K9N5Q8
YP_001039953.1	HKU4	A3EX94
YP_173238.1	HKU1	Q0ZME7
YP_009555241.1	OC43	P36334
NP_073551.1	229E	P15423
YP_003767.1	NL63	Q6Q1S2
```

Save that as `rows.tsv`, tab separated. The label becomes the FASTA defline, the
tree tip, the GFF `seq_id` and the `row` field of every layer, and the viewer
matches them by it.

InterPro keys its precomputed matches by the third column, where a `-` means
UniProtKB has no entry for that spike: BANAL-20-52, the Laos bat virus, and
Pangolin-GX, the GX-P5L isolate, exist only as GenBank records.

## 2. Fetch the sequences

Fetch all eleven in one request, then relabel each record by virus:

```bash
# a comma-separated id list fetches all eleven in one efetch call
ids=$(cut -f1 rows.tsv | paste -sd,)
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi\
?db=protein&id=$ids&rettype=fasta&retmode=text" -o spike-ncbi.fasta
```

Read the lengths before aligning anything:

```
SARS-CoV-2   YP_009724390.1   1273 aa
RaTG13       QHR63300.2       1269 aa
BANAL-20-52  UAY13217.1       1269 aa
Pangolin-GX  QIA48632.1       1267 aa
SARS-CoV     NP_828851.1      1255 aa
MERS-CoV     YP_009047204.1   1353 aa
HKU4         YP_001039953.1   1352 aa
HKU1         YP_173238.1      1356 aa
OC43         YP_009555241.1   1353 aa
229E         NP_073551.1      1173 aa
NL63         YP_003767.1      1356 aa
```

All eleven are full-length spikes of 1173 to 1356 residues, with no outlier that
would mark a fragment or a stray polyprotein.

## 3. Align them and infer a tree

```bash
mafft --auto spike.fasta > spike.afa
```

`--auto` picks L-INS-i for eleven sequences, and the five-second run writes 1660
columns, 304 more than the longest input.

```bash
# -lg is the amino-acid substitution model; the Newick goes to stdout and the
# progress to stderr
FastTree -lg spike.afa > spike.nwk
```

```
(SARS-CoV-2:0.007478676,BANAL-20-52:0.004978619,(RaTG13:0.009142493,
(Pangolin-GX:0.038420176,(SARS-CoV:0.140352604,((229E:0.227306296,
NL63:0.306929144)1.000:1.267772518,((MERS-CoV:0.289975358,HKU4:0.170994428)...
```

[![](../media/spike-structure-alignment.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A0.8%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%7D%7D)

Eleven spikes in 1660 columns, rows ordered by the tree. The left half, S1,
breaks into blocks separated by long gaps, and the right half, S2, runs nearly
unbroken.

## 4. Add the InterPro domains

InterPro precomputes matches for every UniProtKB sequence in that entry's
numbering, so its coordinates apply to an NCBI row only when the two are the
same protein. A length check finds those rows:

```bash
# same length means substitutions only, so residue n is residue n in both;
# a length difference is an indel, and every boundary after it has moved
curl -sf "https://rest.uniprot.org/uniprotkb/P0DTC2.fasta" |
  tail -n +2 | tr -d '\n' | wc -c
```

```
1273
```

The SARS-CoV-2 row is also 1273 residues. The same check for every row with an
accession:

```
SARS-CoV-2   P0DTC2 same length, 0 substitution(s)
RaTG13       A0ABF7PLN6 same length, 0 substitution(s)
BANAL-20-52  no UniProtKB entry, so no precomputed matches
Pangolin-GX  no UniProtKB entry, so no precomputed matches
SARS-CoV     P59594 same length, 1 substitution(s)
MERS-CoV     K9N5Q8 same length, 2 substitution(s)
HKU4         A3EX94 same length, 0 substitution(s)
HKU1         Q0ZME7 is 1351 aa against the row's 1356, so its numbering is not the row's: dropped
OC43         P36334 same length, 2 substitution(s)
229E         P15423 same length, 0 substitution(s)
NL63         Q6Q1S2 same length, 0 substitution(s)
```

Eight rows pass. The HKU1 RefSeq protein and UniProt entry are isolates five
residues apart, so its domains would land five residues off past the indel.

The eight go into `spike-uniprot.tsv`, one accession and label per line:

```bash
react-msaview-cli interpro spike-uniprot.tsv -o spike-domains.gff
```

```
InterPro release 111.0; reading precomputed pfam matches...
  [1/8] P0DTC2: 4 pfam entries
  ...
8 fetched, 0 from /home/you/.cache/react-msaview-cli/interpro
```

[![](../media/spike-structure-domains.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A0.8%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike-domains.gff%22%7D%7D%7D)

Pfam domains on eight rows. The betacoronavirus rows share an S1 N-terminal
domain, S1 receptor-binding and S1 C-terminal domains, then S2, while 229E and
NL63 have one alphacoronavirus S1 box and an S1/S2 linker. The three rows the
arrows mark are empty.

## 5. Mark the PRRA insert

The insert has no entry in a feature table, so find it in the sequence:

```bash
awk '/^>SARS-CoV-2/{getline; print index($0, "PRRA")}' spike.fasta
```

```
681
```

PRRA is residues 681 to 684, in alignment columns 992 to 995. A `highlights`
entry in residue coordinates with `"mark": "bracket"` outlines those columns and
labels them in a Highlights strip above the first row, and the viewer converts
the coordinates to columns:

```json
"highlights": [
  {
    "row": "SARS-CoV-2",
    "start": 681,
    "end": 684,
    "label": "PRRA insert",
    "mark": "bracket"
  },
  {
    "row": "SARS-CoV-2",
    "start": 685,
    "end": 686,
    "label": "Furin cleavage",
    "mark": "bracket"
  }
]
```

[![](../media/spike-structure-insertion.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A522%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-21318%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22relativeTo%22%3A%22SARS-CoV-2%22%2C%22highlights%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A319%2C%22end%22%3A541%2C%22label%22%3A%22RBD%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A437%2C%22end%22%3A508%2C%22label%22%3A%22RBM%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A681%2C%22end%22%3A684%2C%22label%22%3A%22PRRA%20insert%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A685%2C%22end%22%3A686%2C%22label%22%3A%22Furin%20cleavage%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A816%2C%22end%22%3A837%2C%22label%22%3A%22Fusion%20peptide%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A920%2C%22end%22%3A970%2C%22label%22%3A%22HR1%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A1163%2C%22end%22%3A1202%2C%22label%22%3A%22HR2%22%2C%22mark%22%3A%22bracket%22%7D%5D%7D%7D)

The S1/S2 junction at residue resolution, every row read against SARS-CoV-2: a
dot is the same residue, a letter a different one. The boxed columns are PRRA,
and the Highlights strip labels them and the furin cleavage site UniProt
annotates at 685-686.

Columns 992 to 994 are gaps in all ten other rows, and column 995 has a residue
only in the four rows furthest from SARS-CoV-2 in the tree.

## 6. Map the row onto 6VXX

A PDB entry numbers residues its own way, so SIFTS supplies the row-to-structure
correspondence:

```bash
curl -s https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/6vxx |
  jq -c '.["6vxx"].UniProt.P0DTC2.mappings[] | select(.chain_id == "A") |
         {unp_start, unp_end, start: .start.residue_number,
          end: .end.residue_number, identity}'
```

```
{"unp_start":14,"unp_end":1211,"start":33,"end":1230,"identity":0.97}
```

SIFTS returns one block, offset by 19, with an identity of 0.97. The deposited
construct explains both:

```bash
curl -s https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/6vxx |
  jq -r '.["6vxx"][0] | .length, .sequence[:32], .sequence[-51:]'
```

```
1281
MGILPSPGMPALLSLVSLLSVLLMGCVAETGT
GSGRENLYFQGGGGSGYIPEAPRDGQAYVRKDGEWVLLSTFLGHHHHHHHH
```

The 1281-residue entity opens with 32 residues that are not spike, which set the
offset of 19. Comparing the mapped stretch with the row prints five differences:

```
6VXX 701 is S where row residue 682 is R
6VXX 702 is G where row residue 683 is R
6VXX 704 is G where row residue 685 is R
6VXX 1005 is P where row residue 986 is K
6VXX 1006 is P where row residue 987 is V
```

Three differences are at the cleavage site, which the construct disables, and
K986P and V987P hold the prefusion conformation.

Author numbering is a third system again:

```bash
curl -s https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/6vxx/chain/A |
  jq -c '.["6vxx"].molecules[0].chains[0].observed[0].start'
```

```
{"residue_number":46,"author_residue_number":27,"author_insertion_code":null,"struct_asym_id":"A"}
```

The residue the authors call 27 is position 46 of the entry's SEQRES. The layer
uses `label_seq_id` throughout, because author numbering has insertion codes
that integer arithmetic gets wrong.

The `residueMappings` layer holds the SIFTS block as a segment, the gaps as
`unobserved`, and the row's ungapped length, which the viewer checks before
applying the mapping:

```json
"residueMappings": [
  {
    "row": "SARS-CoV-2",
    "accession": "P0DTC2",
    "structure": {
      "id": "6VXX",
      "kind": "experimental",
      "asymId": "A",
      "url": "https://files.rcsb.org/download/6VXX.cif"
    },
    "segments": [
      { "rowStart": 14, "rowEnd": 1211, "structStart": 33, "structEnd": 1230 }
    ],
    "unobserved": [
      [33, 45], [89, 98], [163, 183], [192, 204], [265, 281], [464, 465],
      [474, 480], [488, 507], [521, 521], [640, 659], [696, 707], [847, 872],
      [1167, 1230]
    ],
    "rowLength": 1273,
    "generated": { "by": "sifts", "date": "2026-09-13" }
  }
]
```

Of the row's 1273 residues, 972 are mapped and observed, 226 mapped and not
resolved, and 75 outside the construct. The layer draws nothing, so the three
states also go in a `columnTracks` text track:

```json
{
  "id": "6vxx-coverage",
  "name": "6VXX chain A",
  "kind": "text",
  "row": "SARS-CoV-2",
  "data": "NNNNNNNNNNNNNUUUUUUUUUUUUUOOOOOOOOOO...",
  "encoding": {
    "color": {
      "scale": {
        "domain": ["O", "U", "N"],
        "range": ["#2e7d32", "#e65100", "#cfd8dc"]
      }
    }
  }
}
```

[![](../media/spike-structure-mapping.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A450%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A0.8%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%226vxx-coverage%22%2C%22name%22%3A%226VXX%20chain%20A%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22SARS-CoV-2%22%2C%22data%22%3A%22NNNNNNNNNNNNNUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUOOOOOOOOUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUOOOOOOOOUUUUUUUOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22O%22%2C%22U%22%2C%22N%22%5D%2C%22range%22%3A%5B%22%232e7d32%22%2C%22%23e65100%22%2C%22%23cfd8dc%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A319%2C%22end%22%3A541%2C%22label%22%3A%22RBD%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A437%2C%22end%22%3A508%2C%22label%22%3A%22RBM%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A681%2C%22end%22%3A684%2C%22label%22%3A%22PRRA%20insert%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A685%2C%22end%22%3A686%2C%22label%22%3A%22Furin%20cleavage%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A816%2C%22end%22%3A837%2C%22label%22%3A%22Fusion%20peptide%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A920%2C%22end%22%3A970%2C%22label%22%3A%22HR1%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A1163%2C%22end%22%3A1202%2C%22label%22%3A%22HR2%22%2C%22mark%22%3A%22bracket%22%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22accession%22%3A%22P0DTC2%22%2C%22structure%22%3A%7B%22id%22%3A%226VXX%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F6VXX.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A14%2C%22rowEnd%22%3A1211%2C%22structStart%22%3A33%2C%22structEnd%22%3A1230%7D%5D%2C%22unobserved%22%3A%5B%5B33%2C45%5D%2C%5B89%2C98%5D%2C%5B163%2C183%5D%2C%5B192%2C204%5D%2C%5B265%2C281%5D%2C%5B464%2C465%5D%2C%5B474%2C480%5D%2C%5B488%2C507%5D%2C%5B521%2C521%5D%2C%5B640%2C659%5D%2C%5B696%2C707%5D%2C%5B847%2C872%5D%2C%5B1167%2C1230%5D%5D%2C%22rowLength%22%3A1273%2C%22generated%22%3A%7B%22by%22%3A%22sifts%22%2C%22date%22%3A%222026-11-09%22%7D%7D%5D%7D%7D)

The correspondence over the whole alignment. The ribbon is chain A of 6VXX along
the SARS-CoV-2 row: green where the model resolves a residue, orange where it
declares one it did not resolve, gray outside the construct. The boxed columns
are the unresolved loop.

[![](../media/spike-structure-loop.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A540%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-21054%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22relativeTo%22%3A%22SARS-CoV-2%22%2C%22turnedOffTracks%22%3A%7B%22position-ruler%22%3Afalse%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%226vxx-coverage%22%2C%22name%22%3A%226VXX%20chain%20A%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22SARS-CoV-2%22%2C%22data%22%3A%22NNNNNNNNNNNNNUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUOOOOOOOOUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUOOOOOOOOUUUUUUUOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22O%22%2C%22U%22%2C%22N%22%5D%2C%22range%22%3A%5B%22%232e7d32%22%2C%22%23e65100%22%2C%22%23cfd8dc%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A319%2C%22end%22%3A541%2C%22label%22%3A%22RBD%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A437%2C%22end%22%3A508%2C%22label%22%3A%22RBM%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A681%2C%22end%22%3A684%2C%22label%22%3A%22PRRA%20insert%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A685%2C%22end%22%3A686%2C%22label%22%3A%22Furin%20cleavage%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A816%2C%22end%22%3A837%2C%22label%22%3A%22Fusion%20peptide%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A920%2C%22end%22%3A970%2C%22label%22%3A%22HR1%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A1163%2C%22end%22%3A1202%2C%22label%22%3A%22HR2%22%2C%22mark%22%3A%22bracket%22%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22accession%22%3A%22P0DTC2%22%2C%22structure%22%3A%7B%22id%22%3A%226VXX%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F6VXX.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A14%2C%22rowEnd%22%3A1211%2C%22structStart%22%3A33%2C%22structEnd%22%3A1230%7D%5D%2C%22unobserved%22%3A%5B%5B33%2C45%5D%2C%5B89%2C98%5D%2C%5B163%2C183%5D%2C%5B192%2C204%5D%2C%5B265%2C281%5D%2C%5B464%2C465%5D%2C%5B474%2C480%5D%2C%5B488%2C507%5D%2C%5B521%2C521%5D%2C%5B640%2C659%5D%2C%5B696%2C707%5D%2C%5B847%2C872%5D%2C%5B1167%2C1230%5D%5D%2C%22rowLength%22%3A1273%2C%22generated%22%3A%7B%22by%22%3A%22sifts%22%2C%22date%22%3A%222026-11-09%22%7D%7D%5D%7D%7D)

The S1/S2 junction at residue resolution, with a ruler numbering the SARS-CoV-2
row. 6VXX declares residues 696 to 707, row residues 677 to 688, and the ribbon
reads U across all twelve, over PRRA and the cleavage site beside it.

## 7. Compare a fully resolved region

The control is the same row, chain and layer at the first heptad repeat:

[![](../media/spike-structure-control.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A14%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-17472%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%226vxx-coverage%22%2C%22name%22%3A%226VXX%20chain%20A%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22SARS-CoV-2%22%2C%22data%22%3A%22NNNNNNNNNNNNNUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUOOOOOOOOUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUOOOOOOOOUUUUUUUOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22O%22%2C%22U%22%2C%22N%22%5D%2C%22range%22%3A%5B%22%232e7d32%22%2C%22%23e65100%22%2C%22%23cfd8dc%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A920%2C%22end%22%3A970%2C%22label%22%3A%22HR1%22%2C%22mark%22%3A%22bracket%22%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22accession%22%3A%22P0DTC2%22%2C%22structure%22%3A%7B%22id%22%3A%226VXX%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F6VXX.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A14%2C%22rowEnd%22%3A1211%2C%22structStart%22%3A33%2C%22structEnd%22%3A1230%7D%5D%2C%22unobserved%22%3A%5B%5B33%2C45%5D%2C%5B89%2C98%5D%2C%5B163%2C183%5D%2C%5B192%2C204%5D%2C%5B265%2C281%5D%2C%5B464%2C465%5D%2C%5B474%2C480%5D%2C%5B488%2C507%5D%2C%5B521%2C521%5D%2C%5B640%2C659%5D%2C%5B696%2C707%5D%2C%5B847%2C872%5D%2C%5B1167%2C1230%5D%5D%2C%22rowLength%22%3A1273%2C%22generated%22%3A%7B%22by%22%3A%22sifts%22%2C%22date%22%3A%222026-11-09%22%7D%7D%5D%7D%7D)

HR1 at residue resolution, row residues 920-970, structure residues 939-989. The
ribbon reads O for all 51, over the most conserved columns in the figure, and it
is blank where SARS-CoV-2 has no residue and 229E and NL63 have an insertion.

Coverage across the regions UniProt annotates on this row:

| Region                   | Observed | Declared, not resolved |
| ------------------------ | -------: | ---------------------: |
| RBD (319-541)            |      193 |                     30 |
| RBM (437-508)            |       42 |                     30 |
| PRRA insert (681-684)    |        0 |                      4 |
| Furin cleavage (685-686) |        0 |                      2 |
| Fusion peptide (816-837) |       12 |                     10 |
| HR1 (920-970)            |       51 |                      0 |
| HR2 (1163-1202)          |        0 |                     40 |

HR2 sits past residue 1147, where the model stops.

## 8. Check it against the raw data

Three commands recover the key numbers from the source data:

```bash
# the insert, in the row the viewer draws
awk '/^>SARS-CoV-2/{getline; print index($0, "PRRA")}' spike.fasta

# the block the mapping's one segment came from
curl -s https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/6vxx |
  jq -c '.["6vxx"].UniProt.P0DTC2.mappings[] | select(.chain_id == "A") |
         [.unp_start, .unp_end, .start.residue_number, .end.residue_number]'

# the stretch the furin loop falls in, in label_seq_id
curl -s https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/6vxx/chain/A |
  jq -c '.["6vxx"].molecules[0].chains[0].observed[9,10] |
         [.start.residue_number, .end.residue_number]'
```

```
681
[14,1211,33,1230]
[660,695]
[708,846]
```

The highlight starts at 681 and `[14,1211,33,1230]` is the segment in the layer.
The observed stretches end at 695 and resume at 708, so 696 to 707, row residues
677 to 688, have no coordinates.

## 9. Open the result from one link

<!-- usage: web -->

An alignment does not fit in a link, so the three files go behind URLs and the
three layers go in the link:

```json
{
  "msaview": {
    "type": "MsaView",
    "colWidth": 0.8,
    "rowHeight": 22,
    "residueColor": { "scale": { "scheme": "clustalx_protein_dynamic" } },
    "msaFilehandle": { "uri": "https://example.org/spike.afa" },
    "treeFilehandle": { "uri": "https://example.org/spike.nwk" },
    "gffFilehandle": { "uri": "https://example.org/spike-domains.gff" }
  }
}
```

Add the `columnTracks`, `highlights` and `residueMappings` entries from above,
then URL-encode the object as `#data=`.

[![](../media/spike-structure-final.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A0.8%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fspike%2Fspike-domains.gff%22%7D%2C%22showDomainLegend%22%3Afalse%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%226vxx-coverage%22%2C%22name%22%3A%226VXX%20chain%20A%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22SARS-CoV-2%22%2C%22data%22%3A%22NNNNNNNNNNNNNUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUOOOOOOOOUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUOOOOOOOOUUUUUUUOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%22O%22%2C%22U%22%2C%22N%22%5D%2C%22range%22%3A%5B%22%232e7d32%22%2C%22%23e65100%22%2C%22%23cfd8dc%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A319%2C%22end%22%3A541%2C%22label%22%3A%22RBD%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A437%2C%22end%22%3A508%2C%22label%22%3A%22RBM%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A681%2C%22end%22%3A684%2C%22label%22%3A%22PRRA%20insert%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A685%2C%22end%22%3A686%2C%22label%22%3A%22Furin%20cleavage%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A816%2C%22end%22%3A837%2C%22label%22%3A%22Fusion%20peptide%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A920%2C%22end%22%3A970%2C%22label%22%3A%22HR1%22%2C%22mark%22%3A%22bracket%22%7D%2C%7B%22row%22%3A%22SARS-CoV-2%22%2C%22start%22%3A1163%2C%22end%22%3A1202%2C%22label%22%3A%22HR2%22%2C%22mark%22%3A%22bracket%22%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22SARS-CoV-2%22%2C%22accession%22%3A%22P0DTC2%22%2C%22structure%22%3A%7B%22id%22%3A%226VXX%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F6VXX.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A14%2C%22rowEnd%22%3A1211%2C%22structStart%22%3A33%2C%22structEnd%22%3A1230%7D%5D%2C%22unobserved%22%3A%5B%5B33%2C45%5D%2C%5B89%2C98%5D%2C%5B163%2C183%5D%2C%5B192%2C204%5D%2C%5B265%2C281%5D%2C%5B464%2C465%5D%2C%5B474%2C480%5D%2C%5B488%2C507%5D%2C%5B521%2C521%5D%2C%5B640%2C659%5D%2C%5B696%2C707%5D%2C%5B847%2C872%5D%2C%5B1167%2C1230%5D%5D%2C%22rowLength%22%3A1273%2C%22generated%22%3A%7B%22by%22%3A%22sifts%22%2C%22date%22%3A%222026-11-09%22%7D%7D%5D%7D%7D)

The tree, the domains, the 6VXX ribbon, and the seven regions of the SARS-CoV-2
row as brackets in the Highlights strip, with the RBM on a second lane under the
RBD. At this zoom the PRRA insert and fusion peptide brackets have no room for
their labels, and hovering either one shows its name.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same three hosted files
and takes the three layers from `spike-layers.json`:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/spike/"
layers <- jsonlite::fromJSON(paste0(data, "spike-layers.json"),
  simplifyVector = FALSE)
w <- msaview(
  msa = paste0(data, "spike.afa"),
  tree = paste0(data, "spike.nwk"),
  gff = paste0(data, "spike-domains.gff"),
  residue_color = "clustalx_protein_dynamic",
  column_tracks = layers$columnTracks,
  highlights = layers$highlights,
  residue_mappings = layers$residueMappings
)
w
ggplot2::ggsave("spike-structure-final-r.png",
  msaview_plot(w, tracks = c("6vxx-coverage", "conservation",
    "highlight-brackets")),
  width = 12, height = 6)
```

![](../media/spike-structure-final-r.png)

The eleven spikes over 1,660 columns, the InterPro domains keyed on the right,
the seven SARS-CoV-2 regions as brackets in the Highlights strip and outlines
over the alignment, and the 6VXX chain A row along the top: green where the
structure resolves a residue, orange where it does not, grey past the construct.
`msaview_plot()` drops a label that would print over another, so the strip
leaves the furin cleavage site and the fusion peptide unlabeled. The residue
mapping reaches the widget `w`, which looks residues up in 6VXX, and draws
nothing in a static figure.

<!-- /usage -->

A host looks a row residue up in the structure and gets `undefined` where the
mapping has no answer:

```js
model.structureResidue('SARS-CoV-2', 970) // 6VXX 989, observed
model.structureResidue('SARS-CoV-2', 681) // 6VXX 700, not observed
model.structureResidue('SARS-CoV-2', 1250) // undefined: past the construct
model.structureResidue('RaTG13', 681) // undefined: no mapping for that row
model.rowResidue('6VXX', 700) // SARS-CoV-2, residue 681
```

## Reproduce it end to end

[`build_spike_structure.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_spike_structure.sh)
runs the commands above in order:

1. It fetches the eleven protein sequences in one efetch request and relabels
   each record by its virus.
2. MAFFT aligns the sequences and FastTree infers a tree.
3. `react-msaview-cli interpro` writes the domain GFF from InterPro's
   precomputed matches, dropping the domains of any row whose NCBI record and
   UniProt entry differ in length.
4. It reads UniProt's feature table, the SIFTS correspondence and PDBe's polymer
   coverage of 6VXX chain A, writes them as the snapshot layers, and checks the
   result against the raw sequence.

The script needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_spike_structure.sh
bash build_spike_structure.sh
```

With no arguments the script writes the row table above and builds all four
files beside it. Pass your own table for another family and structure:

```bash
bash build_spike_structure.sh my-rows.tsv out/
```

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [An alignment linked to its structure](https://gmod.org/JBrowseMSA/tutorials/structure_link)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [CLI](https://gmod.org/JBrowseMSA/cli)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Walls AC, Park YJ, Tortorici MA, Wall A, McGuire AT, Veesler D. Structure,
  Function, and Antigenicity of the SARS-CoV-2 Spike Glycoprotein. _Cell_
  181:281-292.
- Zhou P, Yang XL, Wang XG, et al. A pneumonia outbreak associated with a new
  coronavirus of probable bat origin. _Nature_ 579:270-273.
- Temmam S, Vongphayloth K, Baquero E, et al. Bat coronaviruses related to
  SARS-CoV-2 and infectious for human cells. _Nature_ 604:330-336.
- Lam TT, Jia N, Zhang YW, et al. Identifying SARS-CoV-2-related coronaviruses
  in Malayan pangolins. _Nature_ 583:282-285.
- Dana JM, Gutmanas A, Tyagi N, et al. SIFTS: updated Structure Integration with
  Function, Taxonomy and Sequences resource allows 40-fold increase in coverage
  of structure-based annotations for proteins. _Nucleic Acids Research_
  47:D482-D489.
- Katoh K, Standley DM. MAFFT multiple sequence alignment software version 7.
  _Molecular Biology and Evolution_ 30:772-780.
- Price MN, Dehal PS, Arkin AP. FastTree 2: approximately maximum-likelihood
  trees for large alignments. _PLoS ONE_ 5:e9490.
- Blum M, et al. InterPro: the protein sequence classification resource in 2025.
  _Nucleic Acids Research_ 53:D444-D456.
- Bateman A, et al. UniProt: the Universal Protein Knowledgebase in 2025.
  _Nucleic Acids Research_ 53:D609-D617.
