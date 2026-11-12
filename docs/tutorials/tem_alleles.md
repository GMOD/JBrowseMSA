# TEM beta-lactamase alleles and what they hydrolyze

NCBI's Reference Gene Catalog names 233 TEM beta-lactamase alleles, many with a
phenotype: broad-spectrum or extended-spectrum, each with or without inhibitor
resistance. The 286-residue proteins differ from TEM-1 by a few substitutions,
four of which the literature ties to extended-spectrum activity and three to
inhibitor resistance. For 46 alleles, we:

- align them and infer a tree
- give each row its phenotype and its residue at seven named positions
- draw the positions as strips and as bands
- compare the two groups of positions against a control
- open the result from one link

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- python3, standard library only

## The data

Two files of the AMRFinderPlus database, and four this page writes from them.
The build script fetches the two. Nothing to download.

| What it is                                                               | File                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The catalog, one row per allele with its phenotype and protein accession | [ReferenceGeneCatalog.txt](https://ftp.ncbi.nlm.nih.gov/pathogen/Antimicrobial_resistance/AMRFinderPlus/database/latest/ReferenceGeneCatalog.txt) |
| The reference proteins the catalog's accessions point at                 | [AMRProt.fa](https://ftp.ncbi.nlm.nih.gov/pathogen/Antimicrobial_resistance/AMRFinderPlus/database/latest/AMRProt.fa)                             |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is              | File                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| The 46 selected alleles | [tem-alleles.tsv](https://gmod.org/JBrowseMSA/demo/data/tem/tem-alleles.tsv)   |
| Their alignment         | [tem.afa](https://gmod.org/JBrowseMSA/demo/data/tem/tem.afa)                   |
| Its tree                | [tem.nwk](https://gmod.org/JBrowseMSA/demo/data/tem/tem.nwk)                   |
| The row table           | [tem-rowdata.json](https://gmod.org/JBrowseMSA/demo/data/tem/tem-rowdata.json) |

</details>

## 1. Pick the alleles

The catalog's `product_name` holds the phenotype and its `gene_family` column is
`blaTEM`, so the selection takes the twelve lowest-numbered alleles of each
phenotype:

```python
number = re.fullmatch(r'blaTEM-(\d+)', row['allele'])
phenotype = row['product_name'].split(' class A')[0]
if not number or phenotype not in PHENOTYPES:
    continue
candidates[phenotype].append((int(number.group(1)), row))
```

```
broad-spectrum: 16 alleles in the catalog, 12 kept
extended-spectrum: 83 alleles in the catalog, 12 kept
inhibitor-resistant broad-spectrum: 30 alleles in the catalog, 12 kept
inhibitor-resistant extended-spectrum: 10 alleles in the catalog, 10 kept
46 alleles selected, lengths 285 aa x 1, 286 aa x 45
```

The 94 TEM alleles whose product name is a plain `class A beta-lactamase`, with
no phenotype, stay out.

## 2. Align and infer a tree

```bash
clustalw -INFILE=tem.fasta -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE=tem.afa
clustalw -INFILE=tem.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
tr -d '[:space:]' < tem.ph > tem.nwk
```

```
46 rows, 286 alignment columns
```

One column per residue of TEM-1. TEM-178 is the only allele of another length,
at 285 residues, and its deletion is the alignment's one gap.

[![](../media/tem_alleles-alignment.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A920%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A4.2%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%7D%7D)

Forty-six alleles beside the tree ClustalW inferred from them, with the 31
varying positions as white and off-color specks in otherwise single-colored
columns.

## 3. Write the row table

Each row gets its phenotype and its residue at the seven positions of step 4,
keyed by allele name:

```python
record = {'phenotype': phenotype[row], 'subclass': subclass[row]}
for position in fields:
    record[f'Ambler {position}'] = aligned[row][ambler_column[position]]
```

```
wrote ./tem-rowdata.json: 46 rows, 10 fields, 11 kB
```

Eleven kilobytes percent-encode past 8,000 characters, so the snapshot names the
file instead and the viewer fetches it at startup:

```json
{
  "type": "MsaView",
  "msaFilehandle": { "uri": "https://example.org/tem.afa" },
  "treeFilehandle": { "uri": "https://example.org/tem.nwk" },
  "treeMetadataFilehandle": { "uri": "https://example.org/tem-rowdata.json" },
  "encodings": [{ "channel": "tipLabel", "field": "phenotype" }]
}
```

[![](../media/tem_alleles-tip-labels.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A920%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A4.2%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%7D%7D)

The `tipLabel` channel reading the phenotype field: olive for extended-spectrum,
cyan for inhibitor-resistant broad-spectrum, purple for inhibitor-resistant
extended-spectrum, salmon for broad-spectrum. Most olive rows are in the top
half and most cyan rows in the bottom half, and 6 of the tree's 44 internal
nodes hold alleles of one phenotype.

## 4. Map Ambler numbering onto the columns

Ambler numbering runs from 3 to 290 over TEM-1's 286 residues. The script maps
each position through the TEM-1 row and checks the result against the residues
the reviews name:

```python
found = {p: reference[ambler_column[p]] for p in sorted(TEM1_RESIDUES)}
wrong = {p: r for p, r in found.items() if r != TEM1_RESIDUES[p]}
if wrong:
    raise SystemExit(f'Ambler mapping is off: {wrong}')
```

```
TEM-1 residues at the named Ambler positions: 69M 70S 73K 104E 130S 164R 166E 234K 238G 240E 244R 276N
the mapping is Ambler = residue index + 2 up to 238, + 3 from 240 to 252, + 4 from 254
Ambler [104, 164, 238, 240, 69, 244, 276] are columns 102, 162, 236, 237, 67, 241, 272
```

All twelve residues the reviews name for TEM-1, the catalytic S70 and K73 and
the omega-loop E166 among them, come out where the mapping says.

[![](../media/tem_alleles-ambler.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1002%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%2C%22conservation%22%3Atrue%2C%22position-ruler%22%3Afalse%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22scrollX%22%3A-5016%2C%22relativeTo%22%3A%22TEM-1%22%7D%7D)

Columns 229 to 286 under the position ruler, every row read against the pinned
TEM-1 row. Ambler numbering skips 239 and 253, so the boxed columns 236 and 237
are Ambler 238 and 240, and 249 and 250 are Ambler 252 and 254.

## 5. Draw the positions as strips

Four positions carry the extended-spectrum substitutions (104, 164, 238, 240),
three the inhibitor-resistance ones (69, 244, 276), and the eighth is step 7's
control. Each is a `strip` row panel, and the eight share one `legend.title`:

```json
"rowPanels": [
  { "kind": "strip", "encoding": { "fill": { "field": "phenotype" } }, "width": 14, "header": "phenotype" },
  { "kind": "strip", "encoding": { "fill": { "field": "Ambler 104", "legend": { "title": "residue" } } }, "width": 12, "header": "104" }
]
```

[![](../media/tem_alleles-strips.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A920%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A4.2%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22phenotype%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22broad-spectrum%22%2C%22extended-spectrum%22%2C%22inhibitor-resistant%20broad-spectrum%22%2C%22inhibitor-resistant%20extended-spectrum%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%2359a14f%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A14%2C%22header%22%3A%22phenotype%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20104%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22104%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20164%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22164%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20238%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22238%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20240%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22240%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%2069%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%2269%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20244%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22244%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20276%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22276%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20265%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22265%22%7D%5D%7D%7D)

The phenotype strip and the eight position strips between the tree and the
alignment, in the order 104, 164, 238, 240, 69, 244, 276, 265. Olive and purple
rows show a minority residue in the first four strips, cyan rows in the next
three.

```
Ambler 104: E 36, K 10
Ambler 164: R 29, S 11, H 6
Ambler 238: G 40, S 5, R 1
Ambler 240: E 41, K 5
Ambler 69: M 31, L 8, V 4, I 3
Ambler 244: R 42, S 2, C 1, L 1
Ambler 276: N 38, D 8
Ambler 265: T 42, M 4
```

## 6. Compare the two groups of positions

For each allele, whether it differs from TEM-1 at any of the four
extended-spectrum positions, and at any of the three inhibitor-resistance ones:

```
ESBL positions 104/164/238/240: broad-spectrum 0/12, extended-spectrum 12/12, inhibitor-resistant broad-spectrum 0/12, inhibitor-resistant extended-spectrum 10/10
inhibitor positions 69/244/276: broad-spectrum 0/12, extended-spectrum 0/12, inhibitor-resistant broad-spectrum 12/12, inhibitor-resistant extended-spectrum 7/10
```

Every extended-spectrum allele carries a substitution at 104, 164, 238 or 240
and no broad-spectrum allele does, and the three inhibitor-resistance positions
split the other way.

The eight positions also go over the alignment columns as `highlights`, which
take 1-based columns where a band has no `row`, so Ambler 238 is `start: 236`:

```json
"highlights": [{ "start": 236, "end": 236, "label": "Ambler 238" }]
```

[![](../media/tem_alleles-highlights.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A920%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A4.2%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A102%2C%22end%22%3A102%2C%22label%22%3A%22Ambler%20104%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A162%2C%22end%22%3A162%2C%22label%22%3A%22Ambler%20164%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A236%2C%22end%22%3A236%2C%22label%22%3A%22Ambler%20238%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A237%2C%22end%22%3A237%2C%22label%22%3A%22Ambler%20240%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A67%2C%22end%22%3A67%2C%22label%22%3A%22Ambler%2069%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A241%2C%22end%22%3A241%2C%22label%22%3A%22Ambler%20244%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A272%2C%22end%22%3A272%2C%22label%22%3A%22Ambler%20276%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A261%2C%22end%22%3A261%2C%22label%22%3A%22Ambler%20265%22%2C%22color%22%3A%22rgba(120%2C120%2C120%2C0.35)%22%7D%5D%2C%22showDomainLegend%22%3Afalse%7D%7D>)

Eight bands over the 286 columns, seven red and the control grey, each labeled
with its Ambler position.

`relativeTo` names a row, and the viewer draws a residue matching TEM-1 as a dot
and a differing one as its letter, under a pinned copy of the TEM-1 row:

```json
"relativeTo": "TEM-1"
```

In R the same field is `msaview(relative_to = "TEM-1")` or
`+ stat_msa_diff("TEM-1")`, and in Python the `relative_to` trait.

[![](../media/tem_alleles-esbl.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A952%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22scrollX%22%3A-5016%2C%22relativeTo%22%3A%22TEM-1%22%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A102%2C%22end%22%3A102%2C%22label%22%3A%22Ambler%20104%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A162%2C%22end%22%3A162%2C%22label%22%3A%22Ambler%20164%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A236%2C%22end%22%3A236%2C%22label%22%3A%22Ambler%20238%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A237%2C%22end%22%3A237%2C%22label%22%3A%22Ambler%20240%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A67%2C%22end%22%3A67%2C%22label%22%3A%22Ambler%2069%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A241%2C%22end%22%3A241%2C%22label%22%3A%22Ambler%20244%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A272%2C%22end%22%3A272%2C%22label%22%3A%22Ambler%20276%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A261%2C%22end%22%3A261%2C%22label%22%3A%22Ambler%20265%22%2C%22color%22%3A%22rgba(120%2C120%2C120%2C0.35)%22%7D%5D%2C%22showDomainLegend%22%3Afalse%7D%7D>)

Ambler 238 and 240 at residue resolution, every row read against TEM-1. The
boxed columns read G and E in the pinned TEM-1 row, S and K in olive and purple
rows, and a dot in every salmon and cyan row.

## 7. Read the control position

For every variable position, how its residues split across the four phenotypes,
scored by Cramer's V over the residue-by-phenotype table:

```
position  residues                  Cramer's V
     104  36E,10K                         0.60
     164  29R,11S,6H                      0.57
     276  38N,8D                          0.48
      69  31M,8L,4V,3I                    0.47
      39  38Q,8K                          0.42
     240  41E,5K                          0.39
     238  40G,5S,1R                       0.37
     ...
     265  42T,4M                          0.22
```

The control is the lowest-scoring position with minor residues in at least three
alleles, so the column has something to read:

```
control position: Ambler 265, T in TEM-1, minor residues in 4 alleles, Cramer's V 0.22
```

[![](../media/tem_alleles-control.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A952%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22scrollX%22%3A-5016%2C%22relativeTo%22%3A%22TEM-1%22%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A102%2C%22end%22%3A102%2C%22label%22%3A%22Ambler%20104%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A162%2C%22end%22%3A162%2C%22label%22%3A%22Ambler%20164%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A236%2C%22end%22%3A236%2C%22label%22%3A%22Ambler%20238%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A237%2C%22end%22%3A237%2C%22label%22%3A%22Ambler%20240%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A67%2C%22end%22%3A67%2C%22label%22%3A%22Ambler%2069%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A241%2C%22end%22%3A241%2C%22label%22%3A%22Ambler%20244%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A272%2C%22end%22%3A272%2C%22label%22%3A%22Ambler%20276%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A261%2C%22end%22%3A261%2C%22label%22%3A%22Ambler%20265%22%2C%22color%22%3A%22rgba(120%2C120%2C120%2C0.35)%22%7D%5D%2C%22showDomainLegend%22%3Afalse%7D%7D>)

Ambler 265 at the resolution of the figure above. The four alleles reading M
cover three of the four phenotypes: TEM-110 broad-spectrum, TEM-9 and TEM-4
extended-spectrum, TEM-68 inhibitor-resistant extended-spectrum.

## 8. Check it against the raw data

The check reads the letters from the unaligned NCBI sequences by Ambler
arithmetic and compares them with the row table:

```python
letters = [unaligned[row][residue_of_ambler[p]] for p in fields]
from_table = [table[row][f'Ambler {p}'] for p in fields]
if letters != from_table:
    raise SystemExit(f'{row}: the FASTA reads {letters}, the row table {from_table}')
```

```
allele     104  164  238  240   69  244  276  265  phenotype
TEM-1        E    R    G    E    M    R    N    T  broad-spectrum
TEM-2        E    R    G    E    M    R    N    T  broad-spectrum
TEM-3        K    R    S    E    M    R    N    T  extended-spectrum
TEM-10       E    S    G    K    M    R    N    T  extended-spectrum
TEM-12       E    S    G    E    M    R    N    T  extended-spectrum
TEM-30       E    R    G    E    M    S    N    T  inhibitor-resistant broad-spectrum
TEM-32       E    R    G    E    I    R    N    T  inhibitor-resistant broad-spectrum
TEM-125      E    S    G    E    L    R    D    T  inhibitor-resistant extended-spectrum
```

TEM-3 reads E104K and G238S, TEM-10 R164S and E240K, TEM-12 R164S, TEM-30 R244S,
TEM-32 M69I, and TEM-125 R164S with M69L and N276D, the substitutions the
primary literature gives for each allele.

## 9. Open the result from one link

<!-- usage: web -->

[![](../media/tem_alleles-final.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A920%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A4.2%2C%22rowHeight%22%3A16%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Ftem%2Ftem-rowdata.json%22%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22phenotype%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22phenotype%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22broad-spectrum%22%2C%22extended-spectrum%22%2C%22inhibitor-resistant%20broad-spectrum%22%2C%22inhibitor-resistant%20extended-spectrum%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%2359a14f%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A14%2C%22header%22%3A%22phenotype%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20104%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22104%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20164%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22164%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20238%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22238%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20240%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22240%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%2069%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%2269%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20244%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22244%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20276%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22276%22%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22Ambler%20265%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22C%22%2C%22D%22%2C%22E%22%2C%22G%22%2C%22H%22%2C%22I%22%2C%22K%22%2C%22L%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%2C%22%2386bcb6%22%2C%22%23d37295%22%2C%22%23a0cbe8%22%2C%22%238cd17d%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22residue%22%7D%7D%7D%2C%22width%22%3A12%2C%22header%22%3A%22265%22%7D%5D%2C%22highlights%22%3A%5B%7B%22start%22%3A102%2C%22end%22%3A102%2C%22label%22%3A%22Ambler%20104%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A162%2C%22end%22%3A162%2C%22label%22%3A%22Ambler%20164%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A236%2C%22end%22%3A236%2C%22label%22%3A%22Ambler%20238%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A237%2C%22end%22%3A237%2C%22label%22%3A%22Ambler%20240%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A67%2C%22end%22%3A67%2C%22label%22%3A%22Ambler%2069%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A241%2C%22end%22%3A241%2C%22label%22%3A%22Ambler%20244%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A272%2C%22end%22%3A272%2C%22label%22%3A%22Ambler%20276%22%2C%22color%22%3A%22rgba(225%2C87%2C89%2C0.35)%22%7D%2C%7B%22start%22%3A261%2C%22end%22%3A261%2C%22label%22%3A%22Ambler%20265%22%2C%22color%22%3A%22rgba(120%2C120%2C120%2C0.35)%22%7D%5D%7D%7D>)

One view over the three hosted files, with the `tipLabel` encoding, the nine
strips and the eight bands.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same three files,
`geom_msa_rowdata()` takes the row table as `jsonlite::fromJSON()` returns it,
and one loop adds a strip per Ambler position:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/tem/"
rows <- jsonlite::fromJSON(paste0(data, "tem-rowdata.json"))
phenotype <- c(
  "broad-spectrum" = "#4e79a7", "extended-spectrum" = "#e15759",
  "inhibitor-resistant broad-spectrum" = "#59a14f",
  "inhibitor-resistant extended-spectrum" = "#b07aa1"
)
residue <- c(C = "#4e79a7", D = "#f28e2b", E = "#e15759", G = "#76b7b2",
  H = "#59a14f", I = "#edc948", K = "#b07aa1", L = "#ff9da7", M = "#9c755f",
  N = "#bab0ac", R = "#86bcb6", S = "#d37295", T = "#a0cbe8", V = "#8cd17d")
ambler <- c(104, 164, 238, 240, 69, 244, 276, 265)
column <- c(102, 162, 236, 237, 67, 241, 272, 261)

w <- msaview(msa = paste0(data, "tem.afa"), tree = paste0(data, "tem.nwk"),
    color_scheme = "clustalx_protein_dynamic") +
  geom_msa_rowdata(rows) +
  scale_row_color("phenotype", channel = "tipLabel") +
  geom_msa_strip("phenotype", range = phenotype)
for (a in ambler) {
  w <- w + geom_msa_strip(paste("Ambler", a), range = residue,
    header = as.character(a), title = "residue")
}
w <- w + geom_msa_highlight(data.frame(start = column, end = column,
  label = paste("Ambler", ambler),
  color = ifelse(ambler == 265, "rgba(120,120,120,0.35)",
    "rgba(225,87,89,0.35)")))
w
ggplot2::ggsave("tem_alleles-final-r.png",
  msaview_plot(w, tracks = "conservation"), width = 12, height = 9)
```

![](../media/tem_alleles-final-r.png)

ggmsaview draws the same strips, bands and conservation track, with one key for
the residue strips and each row name in its phenotype's color.

<!-- /usage -->

## Reproduce it end to end

[`build_tem_alleles.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_tem_alleles.sh)
runs the commands above in order:

1. It downloads the catalog and the reference proteins, then keeps the twelve
   lowest-numbered alleles of each phenotype.
2. ClustalW aligns the alleles and infers a tree.
3. It maps each Ambler position through the TEM-1 row and writes the row table.
4. It picks the control position and checks the row table against the unaligned
   NCBI sequences.

The script needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_tem_alleles.sh
bash build_tem_alleles.sh
```

The script prints every number on this page.

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [An RSV phylogeny from a public Nextstrain build](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale)
- [An H5N1 surveillance figure](https://gmod.org/JBrowseMSA/tutorials/influenza_surveillance_figure)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Feldgarden M, Brover V, Gonzalez-Escalona N, et al. AMRFinderPlus and the
  Reference Gene Catalog facilitate examination of the genomic links among
  antimicrobial resistance, stress response, and virulence. _Sci Rep_ 11:12728.
- Ambler RP, Coulson AF, Frere JM, et al. A standard numbering scheme for the
  class A beta-lactamases. _Biochem J_ 276:269-270.
- Bradford PA. Extended-spectrum beta-lactamases in the 21st century. _Clin
  Microbiol Rev_ 14:933-951.
- Cantón R, Morosini MI, de la Maza OM, de la Pedrosa EG. IRT and CMT
  beta-lactamases and inhibitor resistance. _Clin Microbiol Infect_ 14 Suppl
  1:53-62.
- Salverda ML, De Visser JA, Barlow M. Natural evolution of TEM-1
  beta-lactamase: experimental reconstruction and clinical relevance. _FEMS
  Microbiol Rev_ 34:1015-1036.
