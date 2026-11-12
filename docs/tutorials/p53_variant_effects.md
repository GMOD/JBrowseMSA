# Where p53's damaging variants fall

_TP53_ is the gene most often mutated in human cancer. Clinical laboratories
report its damaging mutations in patients, a model predicts the effect of every
possible substitution, and a laboratory screen measured thousands of variants in
cells. For fifteen vertebrate p53 proteins, human to zebrafish, we:

- fetch the proteins, align them and infer a tree
- add ClinVar, AlphaMissense and a saturation screen as bar tracks
- open the three tracks from one link
- zoom to the hotspots, the N-terminal control and the oligomerization domain
- check one residue against the source files

## Prerequisites

- `curl`, `jq` and `awk`
- MAFFT and FastTree. `apt install mafft fasttree` on Debian or Ubuntu,
  `brew install mafft fasttree` on macOS, or run the biocontainers with docker:
  `quay.io/biocontainers/mafft:7.525--h031d066_1` and
  `quay.io/biocontainers/fasttree:2.1.11--h031d066_4`. The build script takes
  either.

## The data

Sequences from NCBI RefSeq, the clinical classifications from ClinVar, the
predictions from AlphaMissense as the AlphaFold entry publishes them, and one
saturation screen from MaveDB. Nothing to download: the commands below fetch
these.

| What it is                                                                                              | File                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 660 vertebrate orthologs NCBI lists for _TP53_, GeneID 7157, the source of the accession list below | [orthologs](https://api.ncbi.nlm.nih.gov/datasets/v2alpha/gene/id/7157/orthologs?taxon_filter=vertebrates)                                                                  |
| One protein per accession, all fifteen in one request, shown here with the human accession only         | [efetch.fasta](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=NP_000537.3&rettype=fasta&retmode=text)                                              |
| ClinVar's _TP53_ missense records, searched and then summarized                                         | [esearch.fcgi](https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&retmax=5000&term=TP53%5Bgene%5D+AND+%22missense+variant%22%5Bmolecular+consequence%5D) |
| The AlphaFold entry for P04637, which names its AlphaMissense file                                      | [P04637](https://alphafold.ebi.ac.uk/api/prediction/P04637)                                                                                                                 |
| That file, 7,467 substitutions with a pathogenicity score each                                          | [AF-P04637-F1-aa-substitutions.csv](https://alphafold.ebi.ac.uk/files/AF-P04637-F1-aa-substitutions.csv)                                                                    |
| The Giacomelli 2018 screen, scores for 8,274 variants, CC0                                              | [scores](https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000068-a-1/scores)                                                                                           |
| The alignment the commands below write, which the link in step 7 opens                                  | [p53-vertebrates.afa](https://gmod.org/JBrowseMSA/demo/data/p53/p53-vertebrates.afa)                                                                                        |
| Its tree                                                                                                | [p53-vertebrates.nh](https://gmod.org/JBrowseMSA/demo/data/p53/p53-vertebrates.nh)                                                                                          |

The build script writes the domain bands in as residue numbers, taken from
[UniProt's annotation of P04637](https://rest.uniprot.org/uniprotkb/P04637.json?fields=ft_domain,ft_region).

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                 | File                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| The three tracks, as the viewer takes them | [p53-layers.json](https://gmod.org/JBrowseMSA/demo/data/p53/p53-layers.json) |

</details>

## 1. Choose the rows

NCBI lists the vertebrate orthologs of _TP53_:

```bash
curl -s 'https://api.ncbi.nlm.nih.gov/datasets/v2alpha/gene/id/7157/orthologs?taxon_filter=vertebrates&page_size=1000' |
  jq -r '.reports[].gene | [.taxname, .common_name, .gene_id] | @tsv'
```

The query returns 660 species, and the list below takes fifteen. Human is
`NP_000537.3`, the product of `NM_000546`, the transcript ClinVar numbers its
variants on.

```
NP_000537.3	Human
XP_045231359.1	Macaque
XP_027375188.1	Cow
XP_047612858.1	Pig
NP_001189334.1	Horse
XP_025284307.1	Dog
XP_010594888.1	Elephant
XP_030101782.1	Mouse
NP_112251.2	Rat
XP_056673571.1	Opossum
NP_990595.1	Chicken
XP_065426476.1	Turtle
XP_062840611.1	Anole
NP_001001903.1	Frog
XP_073805887.1	Zebrafish
```

Save that as `accessions.tsv`, tab separated.

## 2. Fetch the sequences

One request takes the whole list, and an `awk` pass renames each record from its
accession to its label:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
IDS=$(cut -f1 accessions.tsv | paste -sd,)
curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=$IDS&rettype=fasta&retmode=text" \
  > p53-refseq.fa

# every layer below names a row by the label the viewer draws
awk 'NR == FNR {split($0, row, "\t"); label[row[1]] = row[2]; next}
  /^>/ {split($0, field, " "); print ">" label[substr(field[1], 2)]; next}
  NF {print}' accessions.tsv p53-refseq.fa > p53.fasta
```

Check the lengths before aligning them:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
awk '/^>/ {if (name) print name, n; name = $0; n = 0; next} {n += length($0)}
  END {print name, n}' p53.fasta
```

```
>Human 393
>Macaque 393
>Cow 386
>Pig 386
>Horse 381
>Dog 381
>Elephant 390
>Mouse 390
>Rat 391
>Opossum 361
>Chicken 367
>Turtle 409
>Anole 395
>Frog 362
>Zebrafish 374
```

The lengths run from 361 to 409, with no outlier that would mark a truncated
model.

## 3. Align them and infer a tree

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
# --anysymbol accepts a record with an X or a U in it
mafft --auto --anysymbol p53.fasta > p53.afa

# -lg is the amino-acid substitution model; FastTree reads the alignment and
# writes Newick with a support value on each internal node
FastTree -lg -quiet p53.afa > p53.nh
```

Over the 478 alignment columns, FastTree joins the two rodents at support 1.000
and human with macaque at 0.997, but its deep splits reach only 0.295 and 0.310,
so the tree orders the rows for reading and its deep topology is unsupported.

[![](../media/p53-variant-alignment.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A400%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%7D%7D)

Fifteen p53 orthologs with the FastTree tree, in residue colors, gap-free
through the middle of the protein and gapped at both ends.

## 4. Count ClinVar's pathogenic variants per residue

The script reads the classification from each record and keeps the pathogenic
and likely pathogenic ones, because a search term matching "pathogenic" also
matches "Conflicting classifications of pathogenicity":

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
EUTILS=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
TERM='TP53[gene] AND "missense variant"[molecular consequence]'
curl -sf "$EUTILS/esearch.fcgi?db=clinvar&retmode=json&retmax=5000&term=$(
  jq -rn --arg t "$TERM" '$t | @uri'
)" | jq -r '.esearchresult.idlist[]' > clinvar.ids

# esummary takes 200 ids at a time. Keep only what the submitters classify as
# pathogenic, and take the variant name, which carries the protein change
split -l 200 clinvar.ids clinvar.batch.
for batch in clinvar.batch.*; do
  curl -sf "$EUTILS/esummary.fcgi?db=clinvar&retmode=json&id=$(paste -sd, "$batch")" |
    jq -r '.result | del(.uids) | .[]
      | select(.germline_classification.description
        | IN("Pathogenic", "Likely pathogenic", "Pathogenic/Likely pathogenic"))
      | .variation_set[].variation_name' >> clinvar.changes
  # NCBI asks unauthenticated callers to stay under three requests a second
  sleep 0.4
done
```

Of 1,519 missense records, 253 pass the filter. The count per residue reads
`p.Arg248Gln` out of `NM_000546.6(TP53):c.743G>A (p.Arg248Gln)` and drops the
nonsense changes with `grep -v 'Ter)$'`, since a stop truncates the protein
instead of exchanging one residue:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
grep '^NM_000546' clinvar.changes |
  grep -oE '\(p\.[A-Z][a-z]{2}[0-9]+[A-Z][a-z]{2}\)' |
  grep -v 'Ter)$' |
  grep -oE '[0-9]+' |
  awk -v n=393 '{count[$1]++}
    END {for (i = 1; i <= n; i++) printf "%s%d", (i > 1 ? "," : ""), count[i]}'
```

The 253 variants fall on 104 of the 393 residues, 94% of them inside the
DNA-binding domain.

[![](../media/p53-variant-clinvar.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A440%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A102%2C%22end%22%3A292%2C%22label%22%3A%22DNA-binding%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

ClinVar pathogenic missense variants per residue of the Human row, under the two
UniProt bands. Each row below Human is drawn as a diff against it, so a matching
residue is a dot.

## 5. Average AlphaMissense scores per residue

AlphaMissense scores every possible substitution, and the AlphaFold entry for an
accession names its file:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
UA='msaview-tutorial (https://gmod.org/JBrowseMSA)'
AM_URL=$(curl -sf -A "$UA" https://alphafold.ebi.ac.uk/api/prediction/P04637 |
  jq -r '.[0].amAnnotationsUrl')
curl -sf -A "$UA" "$AM_URL" -o alphamissense.csv
```

The command below averages the 19 scores, each 0 to 1, at each of the 393
residues, reading the position out of the `M1A` in the first column:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
tail -n +2 alphamissense.csv |
  awk -F, -v n=393 '{
    pos = substr($1, 2, length($1) - 2)
    sum[pos] += $2
    seen[pos]++
  }
  END {for (i = 1; i <= n; i++)
    printf "%s%.2f", (i > 1 ? "," : ""), (seen[i] ? sum[i] / seen[i] : 0)}'
```

[![](../media/p53-variant-alphamissense.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A440%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A102%2C%22end%22%3A292%2C%22label%22%3A%22DNA-binding%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%5D%7D%7D>)

The AlphaMissense mean per residue of the Human row, which stays high through
the oligomerization band at the right.

## 6. Average the saturation screen per residue

Giacomelli and colleagues grew A549 cells with p53 variants beside a wild-type
copy under nutlin-3, so a variant that enriches has disabled p53 with the
wild-type protein present:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
curl -sfL https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000068-a-1/scores \
  -o mavedb.csv

# the score column against the protein change; p.Met384= is synonymous and
# p.Arg248Ter is a stop, and neither is one residue exchanged for another
tail -n +2 mavedb.csv |
  awk -F, -v n=393 '$4 ~ /^p\.[A-Z][a-z][a-z][0-9]+[A-Z][a-z][a-z]$/ &&
    $4 !~ /Ter$/ && $5 != "NA" {
    match($4, /[0-9]+/)
    pos = substr($4, RSTART, RLENGTH)
    sum[pos] += $5
    seen[pos]++
  }
  END {for (i = 1; i <= n; i++) {
    mean = seen[i] ? sum[i] / seen[i] : 0
    printf "%s%.2f", (i > 1 ? "," : ""), (mean > 0 ? mean : 0)
  }}'
```

The screen used a P72R background, so its residue 72 is an arginine where the
aligned RefSeq protein has a proline. A bar track clamps at zero, so about half
the residues draw nothing.

[![](../media/p53-variant-mavedb.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A440%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A102%2C%22end%22%3A292%2C%22label%22%3A%22DNA-binding%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

The screen's mean score per residue, in green. The bars fall almost exactly
within the DNA-binding band.

## 7. Open the three tracks from one link

Each `columnTracks` entry names the row its values index, so the viewer maps
human residue numbers onto the alignment columns:

<!-- from: scripts/build_p53_variant_effects.sh -->

```bash
jq -rj --arg msa data/p53/p53-vertebrates.afa \
  --arg tree data/p53/p53-vertebrates.nh '
  {
    msaview: {
      type: "MsaView",
      relativeTo: "Human",
      residueColor: {scale: {scheme: "clustalx_protein_dynamic"}},
      msaFilehandle: {uri: $msa},
      treeFilehandle: {uri: $tree},
      highlights: .highlights,
      columnTracks: .columnTracks
    }
  } | @uri' p53-layers.json
```

The whole snapshot travels in the link, and the server stops serving a request
line past 8,192 characters. This link stays at 8,015 because AlphaMissense goes
in as a percent against `domainMax: 100`.

<!-- usage: web -->

[![](../media/p53-variant-three-tracks.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A560%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A102%2C%22end%22%3A292%2C%22label%22%3A%22DNA-binding%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%2C%7B%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

ClinVar, AlphaMissense and the screen over one alignment, above the alignment's
conservation track. Every track rises over the DNA-binding band and falls at
both ends of the protein.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) passes the `highlights` and
`columnTracks` of `p53-layers.json` to `msaview()` as they stand, and
`msaview_plot()` draws a ggplot2 figure:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/p53/"
layers <- jsonlite::fromJSON(paste0(data, "p53-layers.json"),
  simplifyVector = FALSE)
w <- msaview(
  msa = paste0(data, "p53-vertebrates.afa"),
  tree = paste0(data, "p53-vertebrates.nh"),
  relative_to = "Human",
  color_scheme = "clustalx_protein_dynamic",
  highlights = layers$highlights,
  column_tracks = layers$columnTracks
)
w
ggplot2::ggsave("p53-variant-three-tracks-r.png",
  msaview_plot(w, tracks = c("clinvar", "alphamissense", "mavedb",
    "conservation")),
  width = 12, height = 7)
```

![](../media/p53-variant-three-tracks-r.png)

The ClinVar, AlphaMissense and MaveDB tracks over conservation on the 478
alignment columns, with the DNA-binding and oligomerization bands across the
rows.

<!-- /usage -->

Averaged over the regions UniProt annotates:

| Region                  | ClinVar | AlphaMissense | MaveDB |
| ----------------------- | ------: | ------------: | -----: |
| Transactivation 1-44    |    0.00 |          0.31 |   0.02 |
| Proline-rich 50-96      |    0.00 |          0.22 |   0.00 |
| DNA-binding 102-292     |    1.25 |          0.75 |   0.79 |
| Oligomerization 325-356 |    0.41 |          0.59 |   0.00 |

## 8. Zoom to the hotspots

The six residues most often mutated in cancer all lie in the DNA-binding domain:

[![](../media/p53-variant-hotspots.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A13%2C%22rowHeight%22%3A16%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22scrollX%22%3A-2847%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A175%2C%22end%22%3A175%2C%22label%22%3A%22175%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A245%2C%22end%22%3A245%2C%22label%22%3A%22245%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A248%2C%22end%22%3A248%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A249%2C%22end%22%3A249%2C%22label%22%3A%22248%2F249%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A273%2C%22end%22%3A273%2C%22label%22%3A%22273%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A282%2C%22end%22%3A282%2C%22label%22%3A%22282%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%2C%7B%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

The hotspot half of the DNA-binding domain, with bands labeled 175, 245, 248/249
one column apart, 273 and 282. Every row is a dot in those columns.

The rows with the human residue at each hotspot, beside three N-terminal
residues:

| Residue | Human | Rows with it | Rows gapped |
| ------- | ----- | -----------: | ----------: |
| R175    | R     |        15/15 |           0 |
| G245    | G     |        15/15 |           0 |
| R248    | R     |        15/15 |           0 |
| R249    | R     |        15/15 |           0 |
| R273    | R     |        15/15 |           0 |
| R282    | R     |        15/15 |           0 |
| P47     | P     |         6/15 |           0 |
| P72     | P     |         4/15 |           7 |
| P89     | P     |         4/15 |           0 |

## 9. Compare the N-terminal control

UniProt annotates the first hundred residues as disordered. The figure below
shows them at the hotspot figure's zoom:

[![](../media/p53-variant-control.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A13%2C%22rowHeight%22%3A16%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22scrollX%22%3A-572%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A1%2C%22end%22%3A44%2C%22label%22%3A%22Transactivation%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A50%2C%22end%22%3A96%2C%22label%22%3A%22Proline-rich%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%2C%7B%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

The N terminus, banded for the transactivation domain (1-44, running off the
left edge) and the proline-rich region (50-96). The rows differ from Human in
most columns, the ClinVar and MaveDB tracks are empty, and AlphaMissense stays
low until the DNA-binding domain starts at the right.

## 10. Zoom to the oligomerization domain

Across the 32 residues of the helix that forms the p53 tetramer, ClinVar has 13
pathogenic missense variants and AlphaMissense averages 0.59, while the screen
comes out at zero, because every raw mean there is zero or negative:

[![](../media/p53-variant-oligomerization.png)](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A620%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A13%2C%22rowHeight%22%3A16%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22scrollX%22%3A-4901%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%2C%7B%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>)

The oligomerization band at residue resolution, where the mammal rows match
Human over the helix. AlphaMissense stays high, one ClinVar bar stands over the
band, and the screen's track is blank.

## 11. Check a residue against the files

Every bar is a count or a mean over a source file, so a grep recovers it. R248
against P47:

```bash
grep 'p.Arg248' clinvar.changes                          # 6 variants
grep -E '^R248' alphamissense.csv |
  awk -F, '{s += $2; n++} END {printf "%.2f over %d\n", s / n, n}'   # 1.00 over 19
grep -E 'p\.Arg248[A-Z]' mavedb.csv | grep -v Ter |
  awk -F, '{s += $5; n++} END {printf "%.2f over %d\n", s / n, n}'   # 1.50 over 19
```

At P47 the same commands return 0 variants, 0.15 over 19, and a negative MaveDB
mean, which the build script writes as 0.

Two of the six ClinVar records at 248, `c.742C>T` and `c.741_742delinsTT`, reach
the same p.Arg248Trp, so the track counts records rather than patients.

## Reproduce it end to end

[`build_p53_variant_effects.sh`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_p53_variant_effects.sh)
runs the steps above in order:

1. It fetches the fifteen proteins from NCBI, aligns them with MAFFT and infers
   a tree with FastTree.
2. It counts the pathogenic and likely pathogenic ClinVar missense alleles at
   each residue of the human row.
3. It averages the AlphaMissense and screen scores at each residue.
4. It prints the hotspot and region tables and writes the layers file and the
   link.

The script needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_p53_variant_effects.sh
bash build_p53_variant_effects.sh out/
```

The script leaves the link in `out/p53-link.url` and runs the biocontainers when
MAFFT and FastTree are not on PATH. ClinVar updates weekly, so its counts change
between runs where the other sources do not.

[Here is what that link opens](<https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A560%2C%22treeAreaWidth%22%3A140%2C%22colWidth%22%3A2.6%2C%22rowHeight%22%3A15%2C%22relativeTo%22%3A%22Human%22%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22clustalx_protein_dynamic%22%7D%7D%2C%22turnedOffTracks%22%3A%7B%22property-conservation%22%3Atrue%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.afa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fp53%2Fp53-vertebrates.nh%22%7D%2C%22highlights%22%3A%5B%7B%22row%22%3A%22Human%22%2C%22start%22%3A102%2C%22end%22%3A292%2C%22label%22%3A%22DNA-binding%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%2C%7B%22row%22%3A%22Human%22%2C%22start%22%3A325%2C%22end%22%3A356%2C%22label%22%3A%22Oligomerization%22%2C%22color%22%3A%22rgba(255%2C140%2C0%2C0.15)%22%7D%5D%2C%22columnTracks%22%3A%5B%7B%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A8%7D%7D%7D%2C%22id%22%3A%22clinvar%22%2C%22name%22%3A%22ClinVar%20pathogenic%20missense%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%23c0392b%22%2C%22height%22%3A60%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C2%2C4%2C3%2C0%2C6%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C2%2C1%2C5%2C0%2C0%2C2%2C2%2C3%2C1%2C1%2C4%2C0%2C0%2C2%2C0%2C0%2C2%2C0%2C3%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C6%2C2%2C0%2C0%2C1%2C1%2C3%2C6%2C2%2C0%2C1%2C0%2C2%2C1%2C1%2C0%2C0%2C2%2C0%2C0%2C2%2C1%2C3%2C0%2C3%2C3%2C1%2C3%2C5%2C1%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C4%2C3%2C1%2C1%2C1%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C2%2C1%2C1%2C0%2C1%2C0%2C3%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C3%2C0%2C4%2C0%2C2%2C4%2C6%2C2%2C3%2C5%2C2%2C0%2C4%2C5%2C4%2C1%2C6%2C2%2C1%2C2%2C0%2C1%2C3%2C0%2C0%2C0%2C2%2C1%2C0%2C0%2C0%2C0%2C0%2C2%2C3%2C3%2C0%2C1%2C4%2C1%2C3%2C6%2C0%2C2%2C1%2C1%2C3%2C0%2C3%2C8%2C3%2C1%2C0%2C2%2C2%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C1%2C0%2C1%2C0%2C0%2C5%2C0%2C0%2C0%2C1%2C1%2C0%2C2%2C0%2C0%2C1%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%2C%7B%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A100%7D%7D%7D%2C%22id%22%3A%22alphamissense%22%2C%22name%22%3A%22AlphaMissense%20mean%20(x100)%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%231565c0%22%2C%22height%22%3A60%2C%22values%22%3A%5B49%2C27%2C19%2C11%2C12%2C14%2C18%2C10%2C12%2C14%2C28%2C17%2C40%2C57%2C73%2C65%2C65%2C68%2C95%2C29%2C30%2C72%2C95%2C21%2C24%2C60%2C39%2C21%2C18%2C17%2C18%2C16%2C17%2C12%2C11%2C13%2C14%2C13%2C14%2C21%2C22%2C20%2C17%2C20%2C16%2C16%2C15%2C14%2C17%2C17%2C15%2C13%2C37%2C29%2C11%2C19%2C16%2C11%2C11%2C12%2C14%2C20%2C14%2C12%2C11%2C20%2C13%2C19%2C15%2C14%2C12%2C13%2C15%2C17%2C14%2C17%2C15%2C19%2C20%2C17%2C15%2C15%2C22%2C22%2C19%2C22%2C20%2C24%2C17%2C23%2C67%2C41%2C46%2C66%2C63%2C37%2C90%2C98%2C63%2C35%2C36%2C20%2C76%2C15%2C99%2C13%2C58%2C48%2C98%2C26%2C81%2C57%2C97%2C43%2C17%2C64%2C87%2C68%2C90%2C98%2C96%2C92%2C73%2C81%2C98%2C91%2C95%2C23%2C13%2C81%2C56%2C97%2C84%2C97%2C98%2C87%2C86%2C81%2C91%2C84%2C94%2C93%2C89%2C66%2C81%2C57%2C77%2C26%2C20%2C13%2C90%2C69%2C17%2C52%2C70%2C49%2C91%2C98%2C87%2C88%2C94%2C87%2C95%2C89%2C48%2C54%2C52%2C76%2C76%2C68%2C92%2C87%2C98%2C78%2C99%2C100%2C98%2C97%2C100%2C96%2C85%2C50%2C38%2C52%2C32%2C74%2C52%2C32%2C83%2C87%2C71%2C47%2C99%2C95%2C89%2C95%2C91%2C96%2C95%2C81%2C20%2C25%2C69%2C48%2C98%2C24%2C64%2C93%2C17%2C23%2C84%2C56%2C99%2C92%2C91%2C93%2C70%2C89%2C76%2C91%2C77%2C27%2C92%2C87%2C57%2C92%2C58%2C35%2C54%2C68%2C75%2C87%2C85%2C87%2C74%2C93%2C96%2C100%2C95%2C98%2C99%2C100%2C94%2C100%2C100%2C98%2C97%2C100%2C99%2C93%2C93%2C59%2C91%2C91%2C87%2C92%2C93%2C99%2C87%2C22%2C21%2C94%2C24%2C76%2C83%2C99%2C98%2C36%2C61%2C97%2C93%2C93%2C99%2C95%2C100%2C97%2C100%2C100%2C99%2C100%2C100%2C97%2C84%2C60%2C98%2C96%2C47%2C62%2C13%2C18%2C56%2C34%2C17%2C17%2C11%2C9%2C9%2C16%2C11%2C15%2C13%2C18%2C20%2C17%2C81%2C75%2C26%2C26%2C23%2C13%2C12%2C14%2C16%2C18%2C18%2C14%2C15%2C15%2C47%2C54%2C46%2C19%2C13%2C34%2C24%2C50%2C56%2C88%2C36%2C87%2C48%2C93%2C63%2C98%2C73%2C40%2C89%2C90%2C45%2C60%2C88%2C51%2C36%2C81%2C77%2C55%2C79%2C75%2C87%2C31%2C54%2C67%2C23%2C18%2C17%2C16%2C25%2C22%2C13%2C15%2C15%2C16%2C20%2C18%2C15%2C20%2C25%2C13%2C15%2C56%2C21%2C47%2C45%2C21%2C16%2C16%2C15%2C21%2C16%2C20%2C66%2C47%2C13%2C26%2C19%2C66%2C13%2C28%2C18%2C16%2C47%2C54%2C66%5D%7D%2C%7B%22encoding%22%3A%7B%22y%22%3A%7B%22scale%22%3A%7B%22domainMax%22%3A2%7D%7D%7D%2C%22id%22%3A%22mavedb%22%2C%22name%22%3A%22MaveDB%20nutlin-3%2C%20p53WT%22%2C%22kind%22%3A%22bar%22%2C%22row%22%3A%22Human%22%2C%22color%22%3A%22%232e7d32%22%2C%22height%22%3A60%2C%22values%22%3A%5B0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.64%2C0%2C0.12%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0.05%2C0%2C0%2C0.2%2C0.41%2C0%2C0%2C0%2C0%2C0.07%2C0.02%2C0.79%2C0%2C0.65%2C0.27%2C1.63%2C0.13%2C1.41%2C0.05%2C1.27%2C0%2C0%2C0%2C0.05%2C0%2C0.12%2C0.45%2C0.21%2C0.41%2C0.4%2C0.84%2C0.81%2C1.43%2C1.5%2C0.08%2C0.06%2C1.22%2C1.04%2C1.73%2C1.07%2C1.42%2C1.3%2C0.82%2C0.5%2C0.5%2C0.79%2C0.41%2C1.21%2C0.39%2C1.37%2C0.74%2C1.16%2C0.61%2C1.07%2C0.47%2C0.39%2C0.56%2C1.47%2C1.34%2C0.03%2C0.71%2C1.31%2C0.28%2C1.36%2C1%2C1.39%2C0.79%2C1.35%2C0.8%2C1.83%2C0.85%2C0.25%2C0.04%2C0.21%2C0.78%2C0.36%2C0%2C0.64%2C0.72%2C1.69%2C1.03%2C1.24%2C1.98%2C1.1%2C0.57%2C1.99%2C0.76%2C0.65%2C0.26%2C0.11%2C0.36%2C0.24%2C0.27%2C0.1%2C0.06%2C0.47%2C0.78%2C0.13%2C0.11%2C1.35%2C1.55%2C1.44%2C0.7%2C1.26%2C0.11%2C0.07%2C0%2C0%2C0%2C0.86%2C0.25%2C1.77%2C0%2C0.01%2C0.97%2C0.01%2C0.06%2C0.89%2C0.72%2C1.22%2C1.14%2C1.46%2C1.4%2C0.64%2C1.25%2C0.45%2C1.51%2C0.41%2C0.31%2C0.61%2C0.3%2C0.1%2C0.41%2C0.29%2C0.16%2C0.68%2C0.47%2C0.6%2C1.42%2C0.48%2C1.39%2C0.55%2C1.66%2C1.06%2C1.86%2C0.76%2C1.31%2C1.31%2C1.71%2C0.91%2C1.74%2C2.16%2C1.97%2C0.93%2C1.5%2C2.08%2C0.96%2C1.41%2C0.28%2C1.25%2C1.23%2C1.42%2C0.76%2C1.42%2C1.37%2C0.92%2C0.52%2C0.46%2C0.69%2C0.53%2C0.5%2C0.81%2C1.65%2C1%2C0.87%2C0.85%2C1.53%2C1.28%2C1.48%2C1.49%2C1.71%2C1.76%2C0.52%2C0.38%2C1.98%2C0%2C0.86%2C0.63%2C0.96%2C0.03%2C0%2C1%2C1.84%2C0%2C0.1%2C0.18%2C0.13%2C0.21%2C0.03%2C0.12%2C0.36%2C0.39%2C0.33%2C0.38%2C0.56%2C0.4%2C0.6%2C0.51%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%2C0%5D%7D%5D%7D%7D>),
against the hosted copy of this alignment.

## See also

- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [AlphaFold confidence across a protein family](https://gmod.org/JBrowseMSA/tutorials/alphafold_confidence)
- [User guide](https://gmod.org/JBrowseMSA/guide)
- [CLI](https://gmod.org/JBrowseMSA/cli)

## References

- Landrum MJ, et al. ClinVar: improving access to variant interpretations and
  supporting evidence. _Nucleic Acids Research_ 46:D1062-D1067 (2018).
- Cheng J, et al. Accurate proteome-wide missense variant effect prediction with
  AlphaMissense. _Science_ 381:eadg7492 (2023).
- Varadi M, et al. AlphaFold Protein Structure Database in 2024. _Nucleic Acids
  Research_ 52:D368-D375 (2024), which serves the AlphaMissense file above.
- Giacomelli AO, et al. Mutational processes shape the landscape of TP53
  mutations in human cancer. _Nature Genetics_ 50:1381-1387 (2018), the screen
  behind `urn:mavedb:00000068-a-1`.
- Esposito D, et al. MaveDB: an open-source platform to distribute and interpret
  data from multiplexed assays of variant effect. _Genome Biology_ 20:223
  (2019).
- Katoh K, Standley DM. MAFFT multiple sequence alignment software version 7.
  _Molecular Biology and Evolution_ 30:772-780 (2013).
- Price MN, Dehal PS, Arkin AP. FastTree 2, approximately maximum-likelihood
  trees for large alignments. _PLoS ONE_ 5:e9490 (2010).
