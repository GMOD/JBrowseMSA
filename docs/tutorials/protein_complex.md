# Hemoglobin's two subunits and the interfaces between them

Hemoglobin is a tetramer of two alpha and two beta chains, held together at two
kinds of interface: alpha1beta1 within a dimer, and alpha1beta2, which moves
when the tetramer binds oxygen. The viewer holds one sequence per row, so each
of eleven vertebrates gets one row with both chains concatenated. We:

- align each subunit and concatenate the pair per species
- mark the subunit spans and infer a tree
- draw the cross-chain residue pairs of PDB 2HHB as arcs
- compare conservation at the interfaces, the core and the surface
- open the result from one link

## Prerequisites

- `curl`
- ClustalW, `apt install clustalw` on Debian or Ubuntu, `brew install clustal-w`
  on macOS. ClustalW both aligns and infers a tree, so this page needs no other
  aligner.
- python3 with Biopython, `pip install biopython`, for the contacts and the
  solvent exposure

## The data

Twenty-two globin proteins as NCBI RefSeq holds them, and one crystal structure
from RCSB. Nothing to download: the commands below fetch both.

| What it is                                                                   | File                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| All 22 protein sequences in one request, shown here with the human pair only | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=NP_000549.1,NP_000509.1&rettype=fasta&retmode=text) |
| The human deoxyhemoglobin tetramer, PDB 2HHB, as mmCIF                       | [2HHB.cif](https://files.rcsb.org/download/2HHB.cif)                                                                                       |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                            | File                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The row table the commands below start from                           | [hemoglobin-rows.tsv](https://gmod.org/JBrowseMSA/demo/data/hemoglobin/hemoglobin-rows.tsv)         |
| The alignment they write                                              | [hemoglobin.afa](https://gmod.org/JBrowseMSA/demo/data/hemoglobin/hemoglobin.afa)                   |
| Its tree                                                              | [hemoglobin.nwk](https://gmod.org/JBrowseMSA/demo/data/hemoglobin/hemoglobin.nwk)                   |
| The subunit spans                                                     | [hemoglobin-subunits.gff](https://gmod.org/JBrowseMSA/demo/data/hemoglobin/hemoglobin-subunits.gff) |
| The contacts and the chain mappings, the layers the links below carry | [hemoglobin-layers.json](https://gmod.org/JBrowseMSA/demo/data/hemoglobin/hemoglobin-layers.json)   |

</details>

## 1. Name the rows

One species per line: the label the viewer draws, then a RefSeq protein per
subunit. The label becomes the FASTA defline, the tree tip, the GFF seq_id and
the `row` of every layer.

```
Human	NP_000549.1	NP_000509.1
Macaque	NP_001038189.1	NP_001157900.1
Mouse	NP_032244.2	NP_001188320.1
Rat	NP_001007723.1	NP_942071.2
Cow	NP_001070890.2	NP_776342.1
Pig	NP_001432111.1	NP_001138313.1
Horse	NP_001078901.1	NP_001157490.1
Platypus	XP_028905054.1	XP_028913684.1
Chicken	NP_001004376.1	NP_990820.1
Zebrafish	NP_571332.3	NP_001003431.2
Trout	NP_001118023.1	XP_021413554.1
```

## 2. Fetch the sequences

One `efetch` request takes every accession, and a script splits the result into
one FASTA per subunit, labeled by species:

```bash
ids=$(awk -F'\t' '{printf "%s%s,%s", sep, $2, $3; sep=","}' rows.tsv)
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=$ids&rettype=fasta&retmode=text" \
  -o globins-ncbi.fasta
```

```
Human      alpha NP_000549.1     142 aa   beta NP_000509.1     147 aa
Macaque    alpha NP_001038189.1  142 aa   beta NP_001157900.1  147 aa
Mouse      alpha NP_032244.2     142 aa   beta NP_001188320.1  147 aa
Rat        alpha NP_001007723.1  142 aa   beta NP_942071.2     147 aa
Cow        alpha NP_001070890.2  142 aa   beta NP_776342.1     145 aa
Pig        alpha NP_001432111.1  142 aa   beta NP_001138313.1  147 aa
Horse      alpha NP_001078901.1  142 aa   beta NP_001157490.1  147 aa
Platypus   alpha XP_028905054.1  141 aa   beta XP_028913684.1  147 aa
Chicken    alpha NP_001004376.1  142 aa   beta NP_990820.1     147 aa
Zebrafish  alpha NP_571332.3     143 aa   beta NP_001003431.2  147 aa
Trout      alpha NP_001118023.1  143 aa   beta XP_021413554.1  147 aa
```

Every alpha is 141 to 143 residues and every beta 145 to 147, initiator
methionine included, so the two subunits differ in length per species. Each row
is one species' adult alpha and adult beta chain, _HBA1_ and _HBB_ in human.

## 3. Align the subunits separately

Alpha and beta are paralogs, so an aligner given both would put them in shared
columns. ClustalW aligns each subunit on its own:

```bash
for sub in alpha beta; do
  clustalw -INFILE=$sub.fasta -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
    -OUTPUT=FASTA -OUTFILE=$sub.afa
done
```

`-OUTORDER=INPUT` keeps the rows in the table's order, so concatenating the
alignments is a loop over the labels:

```python
alpha = read('alpha.afa')
beta = read('beta.afa')
with open('hemoglobin.afa', 'w') as fh:
    for name, a in alpha.items():
        fh.write(f'>{name}\n{a}{beta[name]}\n')
```

```
alpha: 143 columns, beta: 147 columns
concatenated: 290 columns, beta starts at column 144
```

[![](../media/protein_complex-1.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A460%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A4.4%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%7D%7D)
Eleven rows of 290 columns, the alpha block left of column 144 and the beta
block right of it, with the tree from step 5.

## 4. Mark the subunits

Each row's two spans go in a GFF in that row's own residue numbering, so the
boundary lands correctly where the alpha chain is shorter or longer. A `color=`
attribute sets the overlay's color:

```python
alen = len(a.replace('-', ''))
blen = len(b.replace('-', ''))
g.write(f'{name}\tRefSeq\tpolypeptide_region\t1\t{alen}\t.\t.\t.\t'
        f'Name=alpha;signature_desc=hemoglobin subunit alpha;color=%234e79a7\n')
g.write(f'{name}\tRefSeq\tpolypeptide_region\t{alen + 1}\t{alen + blen}\t.\t.\t.\t'
        f'Name=beta;signature_desc=hemoglobin subunit beta;color=%23e15759\n')
```

```
Human	RefSeq	polypeptide_region	1	142	.	.	.	Name=alpha;signature_desc=hemoglobin subunit alpha;color=%234e79a7
Human	RefSeq	polypeptide_region	143	289	.	.	.	Name=beta;signature_desc=hemoglobin subunit beta;color=%23e15759
```

[![](../media/protein_complex-2.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A460%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A4.4%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin-subunits.gff%22%7D%2C%22showDomainLegend%22%3Afalse%7D%7D)

Alpha in blue and beta in red, as the overlay draws the two spans.

[![](../media/protein_complex-3.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A520%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-2596%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin-subunits.gff%22%7D%2C%22showDomainLegend%22%3Afalse%7D%7D)

The subunit boundary at residue resolution. The last alpha residue is R in every
row, and the Cow row has two gap columns where its beta chain starts two
residues later.

## 5. Infer a tree

```bash
clustalw -INFILE=hemoglobin.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
tr -d '[:space:]' < hemoglobin.ph > hemoglobin.nwk
```

```
(((Human:0.02366,Macaque:0.02133):0.03786,((Mouse:0.04913,Rat:0.11350):0.04393,
(Platypus:0.14248,(Chicken:0.15042,(Zebrafish:0.18011,Trout:0.16126):0.13737):0.03453)
:0.02900):0.01972):0.00663,(Cow:0.07886,Pig:0.07794):0.00138,Horse:0.07648);
```

Zebrafish and Trout sit at the end of the longest branch, then Chicken, then
Platypus, with the seven placentals filling the rest.

## 6. Read the contacts off the structure

In PDB 2HHB, the human deoxy tetramer at 1.74 Å, chain A touches chain B across
the alpha1beta1 interface and chain D across alpha1beta2:

```sh
curl -sf https://files.rcsb.org/download/2HHB.cif -o 2hhb.cif
```

Biopython's `NeighborSearch` finds every residue pair with a heavy atom of each
within 4 Å:

```python
from Bio.PDB import MMCIFParser, NeighborSearch

def contacts(c1, c2, cutoff=4.0):
    ns = NeighborSearch([a for r in c2 for a in r])
    pairs = set()
    for r in c1:
        for atom in r:
            for other in ns.search(atom.coord, cutoff):
                pairs.add((r.id[1], other.get_parent().id[1]))
    return sorted(pairs)

model = MMCIFParser(QUIET=True).get_structure('2HHB', '2hhb.cif')[0]
alpha1beta1 = contacts(model['A'], model['B'])
alpha1beta2 = contacts(model['A'], model['D'])
```

The RefSeq rows keep the initiator methionine and the crystal's mature chains do
not, so the script locates each chain inside the Human row:

```
chain A (141 aa) is row residues 2-142 of Human, chain B (146 aa) is 144-289
the Human row is 289 residues: alpha 1-142, beta 143-289
alpha1beta1: 32 residue pairs within 4.0 A, 14 alpha residues and 17 beta residues
alpha1beta2: 26 residue pairs within 4.0 A, 14 alpha residues and 14 beta residues
```

Chain residue n is row residue n + 1 within its subunit, and beta residue n is
row residue 143 + n. Each pair becomes an arc in an `arc` column track, and a
`text` track classes every other residue as buried, exposed or in between, from
`ShrakeRupley` over the tetramer divided by the residue type's maximum
accessible area.

```
residue classes on the Human row: 29 at alpha1beta1, 28 at alpha1beta2, 73 buried, 107 exposed, 52 in between
```

[![](../media/protein_complex-4.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A540%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A4.4%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%222hhb-contacts%22%2C%22name%22%3A%222HHB%20chain%20contacts%22%2C%22kind%22%3A%22arc%22%2C%22row%22%3A%22Human%22%2C%22arcs%22%3A%5B%7B%22start%22%3A32%2C%22end%22%3A265%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A266%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A37%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A251%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A254%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A262%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A115%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A119%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A176%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A198%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A178%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A38%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A39%2C%22end%22%3A243%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A41%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A288%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A45%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A92%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A182%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A186%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A248%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A96%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A97%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A98%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A177%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A178%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%5D%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%222hhb-class%22%2C%22name%22%3A%222HHB%20residue%20class%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22Human%22%2C%22data%22%3A%22OEOEEEBOEOBEEBOEEBEEEBOEBBOOBBO1BB11122B222O2EOEEEEEBEEBEEOBEEOBEOBEEBBEEBEEBEEOBEEEBEEOBEE22O2222OEOOO1BBB1BB11EB1EO111EO1OBB1OBBEOBOEOOEEE22OEEOEEEOEEOBEEBBEEOEOEEBBBOBBB1BB12222B22EB2EOEEOEEEEOB1EBEEBEEEBEEEBOOOOEBOEEOEEBEEEBOEEBEEOBEEE2O222BOE2OB1BB11BB11EO1EE111EO11BB1EBBEBBBEBBEEE22%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%221%22%2C%222%22%2C%22B%22%2C%22E%22%2C%22O%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%2C%22%23f1ce63%22%2C%22%23ffffff%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000549.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A2%2C%22rowEnd%22%3A142%2C%22structStart%22%3A1%2C%22structEnd%22%3A141%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%2C%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000509.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22B%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A144%2C%22rowEnd%22%3A289%2C%22structStart%22%3A1%2C%22structEnd%22%3A146%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%5D%7D%7D)

58 arcs from the alpha block to the beta block, blue for alpha1beta1 and red for
alpha1beta2. The class track under them is blue and red on the interface
columns, grey where a residue is buried and yellow where it is exposed.

## 7. Compare conservation across the classes

Per class, the mean share of the ten other rows with the Human letter:

```
alpha1beta1 interface     29 residues, mean identity 0.77, 10 identical in all 11 rows
alpha1beta2 interface     28 residues, mean identity 0.92, 20 identical in all 11 rows
buried, no interface      73 residues, mean identity 0.78, 21 identical in all 11 rows
exposed, no interface    107 residues, mean identity 0.69, 22 identical in all 11 rows
23 of 58 contact pairs have both residues identical in all 11 rows
```

The alpha1beta2 residues are the most conserved class, with 20 of the 28
identical from human to trout.

[![](../media/protein_complex-5.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A600%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-748%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22relativeTo%22%3A%22Human%22%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%222hhb-contacts%22%2C%22name%22%3A%222HHB%20chain%20contacts%22%2C%22kind%22%3A%22arc%22%2C%22row%22%3A%22Human%22%2C%22arcs%22%3A%5B%7B%22start%22%3A32%2C%22end%22%3A265%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A266%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A37%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A251%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A254%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A262%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A115%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A119%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A176%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A198%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A178%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A38%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A39%2C%22end%22%3A243%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A41%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A288%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A45%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A92%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A182%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A186%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A248%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A96%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A97%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A98%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A177%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A178%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%5D%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%222hhb-class%22%2C%22name%22%3A%222HHB%20residue%20class%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22Human%22%2C%22data%22%3A%22OEOEEEBOEOBEEBOEEBEEEBOEBBOOBBO1BB11122B222O2EOEEEEEBEEBEEOBEEOBEOBEEBBEEBEEBEEOBEEEBEEOBEE22O2222OEOOO1BBB1BB11EB1EO111EO1OBB1OBBEOBOEOOEEE22OEEOEEEOEEOBEEBBEEOEOEEBBBOBBB1BB12222B22EB2EOEEOEEEEOB1EBEEBEEEBEEEBOOOOEBOEEOEEBEEEBOEEBEEOBEEE2O222BOE2OB1BB11BB11EO1EE111EO11BB1EBBEBBBEBBEEE22%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%221%22%2C%222%22%2C%22B%22%2C%22E%22%2C%22O%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%2C%22%23f1ce63%22%2C%22%23ffffff%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000549.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A2%2C%22rowEnd%22%3A142%2C%22structStart%22%3A1%2C%22structEnd%22%3A141%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%2C%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000509.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22B%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A144%2C%22rowEnd%22%3A289%2C%22structStart%22%3A1%2C%22structEnd%22%3A146%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A43%2C%22end%22%3A43%2C%22label%22%3A%22alpha%20Tyr42%22%7D%5D%7D%7D)

The alpha1beta2 interface at residue resolution, every row read against the
Human row: a dot is the same residue, a letter a different one. The boxed column
is alpha Tyr42, which contacts Asp99 of the beta chain.

[![](../media/protein_complex-6.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A600%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A22%2C%22rowHeight%22%3A22%2C%22scrollX%22%3A-2288%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22relativeTo%22%3A%22Human%22%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%222hhb-contacts%22%2C%22name%22%3A%222HHB%20chain%20contacts%22%2C%22kind%22%3A%22arc%22%2C%22row%22%3A%22Human%22%2C%22arcs%22%3A%5B%7B%22start%22%3A32%2C%22end%22%3A265%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A266%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A37%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A251%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A254%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A262%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A115%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A119%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A176%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A198%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A178%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A38%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A39%2C%22end%22%3A243%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A41%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A288%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A45%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A92%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A182%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A186%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A248%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A96%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A97%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A98%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A177%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A178%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%5D%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%222hhb-class%22%2C%22name%22%3A%222HHB%20residue%20class%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22Human%22%2C%22data%22%3A%22OEOEEEBOEOBEEBOEEBEEEBOEBBOOBBO1BB11122B222O2EOEEEEEBEEBEEOBEEOBEOBEEBBEEBEEBEEOBEEEBEEOBEE22O2222OEOOO1BBB1BB11EB1EO111EO1OBB1OBBEOBOEOOEEE22OEEOEEEOEEOBEEBBEEOEOEEBBBOBBB1BB12222B22EB2EOEEOEEEEOB1EBEEBEEEBEEEBOOOOEBOEEOEEBEEEBOEEBEEOBEEE2O222BOE2OB1BB11BB11EO1EE111EO11BB1EBBEBBBEBBEEE22%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%221%22%2C%222%22%2C%22B%22%2C%22E%22%2C%22O%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%2C%22%23f1ce63%22%2C%22%23ffffff%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000549.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A2%2C%22rowEnd%22%3A142%2C%22structStart%22%3A1%2C%22structEnd%22%3A141%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%2C%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000509.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22B%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A144%2C%22rowEnd%22%3A289%2C%22structStart%22%3A1%2C%22structEnd%22%3A146%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%5D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A112%2C%22end%22%3A112%2C%22label%22%3A%22alpha%20111%22%7D%5D%7D%7D)

The alpha1beta1 interface at the same resolution. The boxed column is alpha 111,
the residue of that interface whose contact pair varies most, and it reads a
different letter in most rows.

## 8. Check it against the raw data

The letters in every row at the Tyr42 to Asp99 pair, and at the alpha1beta1 pair
that varies most:

```
alpha1beta2 Tyr42-Asp99: row residues 43 and 242, columns 43 and 243
  Human      Y D
  Macaque    Y D
  Mouse      Y D
  Rat        Y D
  Cow        Y D
  Pig        Y D
  Horse      Y D
  Platypus   Y D
  Chicken    Y D
  Zebrafish  Y D
  Trout      Y D
alpha1beta1, most variable: row residues 112 and 258, columns 113 and 259
  Human      A A
  Macaque    A A
  Mouse      S G
  Rat        C G
  Cow        S A
  Pig        A A
  Horse      V A
  Platypus   R A
  Chicken    I A
  Zebrafish  M A
  Trout      I A
```

Alpha 111 and beta 115 pack against each other in the crystal, and the alpha
side reads seven letters across the rows.

## 9. Open the result from one link

<!-- usage: web -->

The alignment, the tree and the GFF go behind URLs, and the layers fit in the
link:

```json
{
  "msaview": {
    "type": "MsaView",
    "colWidth": 4.4,
    "rowHeight": 22,
    "residueColor": { "scale": { "scheme": "clustalx_protein_dynamic" } },
    "msaFilehandle": { "uri": "https://example.org/hemoglobin.afa" },
    "treeFilehandle": { "uri": "https://example.org/hemoglobin.nwk" },
    "gffFilehandle": { "uri": "https://example.org/hemoglobin-subunits.gff" },
    "showDomains": false
  }
}
```

Add the `columnTracks` and `residueMappings` entries from
`hemoglobin-layers.json` beside those, then URL-encode the object as `#data=`.

[![](../media/protein_complex-7.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A460%2C%22treeAreaWidth%22%3A150%2C%22colWidth%22%3A4.4%2C%22rowHeight%22%3A22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin.nwk%22%7D%2C%22gffFilehandle%22%3A%7B%22uri%22%3A%22data%2Fhemoglobin%2Fhemoglobin-subunits.gff%22%7D%2C%22showDomains%22%3Afalse%2C%22showDomainLegend%22%3Afalse%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%222hhb-contacts%22%2C%22name%22%3A%222HHB%20chain%20contacts%22%2C%22kind%22%3A%22arc%22%2C%22row%22%3A%22Human%22%2C%22arcs%22%3A%5B%7B%22start%22%3A32%2C%22end%22%3A265%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A266%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A32%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A267%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A35%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A271%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A36%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A37%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A251%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A104%2C%22end%22%3A274%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A254%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A108%2C%22end%22%3A270%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A111%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A258%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A112%2C%22end%22%3A262%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A115%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A118%2C%22end%22%3A259%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A119%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A176%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A120%2C%22end%22%3A198%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A173%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A123%2C%22end%22%3A255%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A177%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A127%2C%22end%22%3A178%2C%22color%22%3A%22%234e79a7%22%7D%2C%7B%22start%22%3A38%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A39%2C%22end%22%3A243%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A41%2C%22end%22%3A289%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A42%2C%22end%22%3A288%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A43%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A45%2C%22end%22%3A240%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A92%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A182%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A183%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A93%2C%22end%22%3A186%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A95%2C%22end%22%3A248%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A96%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A97%2C%22end%22%3A244%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A98%2C%22end%22%3A242%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A141%2C%22end%22%3A180%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A177%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A178%2C%22color%22%3A%22%23e15759%22%7D%2C%7B%22start%22%3A142%2C%22end%22%3A179%2C%22color%22%3A%22%23e15759%22%7D%5D%2C%22height%22%3A70%7D%2C%7B%22id%22%3A%222hhb-class%22%2C%22name%22%3A%222HHB%20residue%20class%22%2C%22kind%22%3A%22text%22%2C%22row%22%3A%22Human%22%2C%22data%22%3A%22OEOEEEBOEOBEEBOEEBEEEBOEBBOOBBO1BB11122B222O2EOEEEEEBEEBEEOBEEOBEOBEEBBEEBEEBEEOBEEEBEEOBEE22O2222OEOOO1BBB1BB11EB1EO111EO1OBB1OBBEOBOEOOEEE22OEEOEEEOEEOBEEBBEEOEOEEBBBOBBB1BB12222B22EB2EOEEOEEEEOB1EBEEBEEEBEEEBOOOOEBOEEOEEBEEEBOEEBEEOBEEE2O222BOE2OB1BB11BB11EO1EE111EO11BB1EBBEBBBEBBEEE22%22%2C%22encoding%22%3A%7B%22color%22%3A%7B%22scale%22%3A%7B%22domain%22%3A%5B%221%22%2C%222%22%2C%22B%22%2C%22E%22%2C%22O%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23e15759%22%2C%22%238c8c8c%22%2C%22%23f1ce63%22%2C%22%23ffffff%22%5D%7D%7D%7D%2C%22height%22%3A16%7D%5D%2C%22residueMappings%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000549.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22A%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A2%2C%22rowEnd%22%3A142%2C%22structStart%22%3A1%2C%22structEnd%22%3A141%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%2C%7B%22row%22%3A%22Human%22%2C%22accession%22%3A%22NP_000509.1%22%2C%22structure%22%3A%7B%22id%22%3A%222HHB%22%2C%22kind%22%3A%22experimental%22%2C%22asymId%22%3A%22B%22%2C%22url%22%3A%22https%3A%2F%2Ffiles.rcsb.org%2Fdownload%2F2HHB.cif%22%7D%2C%22segments%22%3A%5B%7B%22rowStart%22%3A144%2C%22rowEnd%22%3A289%2C%22structStart%22%3A1%2C%22structEnd%22%3A146%7D%5D%2C%22unobserved%22%3A%5B%5D%2C%22rowLength%22%3A289%2C%22generated%22%3A%7B%22by%22%3A%22sequence%20match%22%2C%22date%22%3A%222026-10-19%22%7D%7D%5D%7D%7D)

The contact arcs and the class track above the alignment, with the subunit spans
loaded and the overlay off, so the residue colors show through.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the hosted alignment, tree
and subunit GFF, and takes both layers from `hemoglobin-layers.json`.
`features = FALSE` leaves the GFF overlay out, as the link does:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/hemoglobin/"
layers <- jsonlite::fromJSON(paste0(data, "hemoglobin-layers.json"),
  simplifyVector = FALSE)
w <- msaview(
  msa = paste0(data, "hemoglobin.afa"),
  tree = paste0(data, "hemoglobin.nwk"),
  gff = paste0(data, "hemoglobin-subunits.gff"),
  color_scheme = "clustalx_protein_dynamic",
  column_tracks = layers$columnTracks,
  residue_mappings = layers$residueMappings
)
w
ggplot2::ggsave("protein-complex-final-r.png",
  msaview_plot(w, tracks = c("2hhb-contacts", "2hhb-class", "conservation"),
    features = FALSE),
  width = 12, height = 6)
```

![](../media/protein-complex-final-r.png)

The eleven fused alpha-beta rows over 290 columns in ClustalX colors, under the
58 2HHB contact arcs (blue for alpha1beta1, red for alpha1beta2), the residue
class row and conservation. The residue mappings reach `w` and draw nothing
here.

<!-- /usage -->

The script writes a `residueMappings` record per chain for the Human row, and
the two share an entry id, so a host looking a residue up the other way passes a
chain:

```js
model.structureResidue('Human', 43) // 2HHB chain A, residue 42
model.structureResidue('Human', 242) // 2HHB chain B, residue 99
model.structureResidue('Human', 143) // undefined: the beta initiator, in no chain
model.rowResidue('2HHB', 42) // undefined: both chains have a residue 42
model.rowResidue('2HHB', 42, 'A') // Human, residue 43
```

## Reproduce it end to end

[`build_protein_complex.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_protein_complex.sh)
runs the steps above in order:

1. It fetches the 22 proteins from NCBI and writes one FASTA per subunit.
2. ClustalW aligns each subunit, the script concatenates the pair per species
   with a GFF marking each span, and ClustalW infers the tree.
3. It finds the residue pairs within 4 Å across the two interfaces of PDB 2HHB,
   classes the other human residues, and writes the layers.
4. It reports the conservation of each class and the letters at one contact pair
   per interface.

The script needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_protein_complex.sh
bash build_protein_complex.sh
```

With no arguments the script builds all four files and prints every number on
this page. Pass your own table for another complex and structure:

```bash
bash build_protein_complex.sh my-rows.tsv out/
```

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [The SARS-CoV-2 furin insert and PDB 6VXX](https://gmod.org/JBrowseMSA/tutorials/spike_structure)
- [An alignment linked to its structure](https://gmod.org/JBrowseMSA/tutorials/structure_link)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Fermi G, Perutz MF, Shaanan B, Fourme R. The crystal structure of human
  deoxyhaemoglobin at 1.74 Å resolution. _J Mol Biol_ 175:159-174.
- Perutz MF. Stereochemistry of cooperative effects in haemoglobin. _Nature_
  228:726-739.
- Baldwin J, Chothia C. Haemoglobin: the structural changes related to ligand
  binding and its allosteric mechanism. _J Mol Biol_ 129:175-220.
- Tien MZ, Meyer AG, Sydykova DK, Spielman SJ, Wilke CO. Maximum allowed solvent
  accessibilites of residues in proteins. _PLoS ONE_ 8:e80635.
- Cock PJA, Antao T, Chang JT, et al. Biopython: freely available Python tools
  for computational molecular biology and bioinformatics. _Bioinformatics_
  25:1422-1423.
