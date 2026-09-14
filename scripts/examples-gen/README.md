# Building the real-data phylogeny examples

This directory builds the real-data examples in the gallery
(`packages/examples`) and the docs from scratch, so every file records where its
data came from and which commands produced it.

## TL;DR

```sh
# one-time: install the aligner
sudo apt-get install clustalw        # Debian/Ubuntu
# brew install clustal-w             # macOS

# rebuild the data files from the committed sequence snapshots (deterministic,
# offline): align -> tree -> write the data files
node scripts/examples-gen/generate.mjs        # or: pnpm examples:gen

# re-download the sequences from UniProt first (refreshes datasets/<name>.fasta)
node scripts/examples-gen/generate.mjs --fetch

# limit to some datasets
node scripts/examples-gen/generate.mjs myd88 ace2
```

Output goes to `packages/examples/data/` as plain files: `<name>.aln` for the
alignment, `<name>.nh` for the tree and `<name>-domains.gff` for the domain
overlay. The gallery imports them with Vite's `?raw`, the screenshot specs read
them, and `scripts/screenshots/writeExampleData.mjs` copies them into the demo
app so a `?data=` link can fetch one. The script generates these files, so edit
the inputs here and re-run.

## What a dataset is

Each dataset is one tab-separated file under `datasets/`:

```
# comments start with #
<UniProt accession>   <TAB>   <row label>
Q99836                        Human
P22366                        Mouse
...
```

That file is the whole human-authored input: a curated list of accessions and
the short label each row gets in the viewer. The first row is the reference (for
`relativeTo`, see below).

Beside each `.tsv`, `datasets/<name>.fasta` holds the exact sequences fetched.
The pipeline aligns that snapshot by default, so regeneration is deterministic
and offline and git shows the precise sequences. UniProt entries change over
time; run with `--fetch` to refresh the snapshot from UniProt and review the
diff.

Current datasets:

A ✦ in the last column marks datasets that ship a committed InterPro domain
overlay (`<name>-domains.gff`).

| File               | Family                                                    | What it shows                                                                                                                          | Paper                                     | Dom |
| ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --- |
| `myd88.tsv`        | MyD88 TLR/IL-1R adaptor across mammals + 3 bats           | `relativeTo=Human` identity dots; lineage-specific substitutions; Death + TIR two-domain architecture                                  | Tian et al. 2023, Sci. Adv. (PMC10162675) | ✦   |
| `globin.tsv`       | Hemoglobin α/β, myoglobin, neuroglobin, cytoglobin        | tree groups by globin **type** across species, the signature of gene duplication                                                       | Zuckerkandl & Pauling 1965                |     |
| `ace2.tsv`         | ACE2 (SARS-CoV-2 receptor) across mammals                 | dot view shows the few spike-contact residues that differ between hosts; peptidase M2 + collectrin domains                             | Damas et al. 2020, PNAS                   | ✦   |
| `opsins.tsv`       | Vertebrate visual pigments                                | tree sorts by opsin class; 7TM-GPCR domain overlay                                                                                     | Yokoyama 2000, Prog. Retin. Eye Res.      | ✦   |
| `histone_h4.tsv`   | Histone H4 across eukaryotes                              | one of the most conserved proteins known; near-flat alignment                                                                          |                                           |     |
| `cytochrome_c.tsv` | Cytochrome c across eukaryotic life                       | molecular clock; tree spans >1 Gy                                                                                                      | Fitch & Margoliash 1967, Science          |     |
| `prestin.tsv`      | Prestin (SLC26A5) hearing motor                           | echolocators converge in the gene tree; SLC26 transmembrane + STAS domains                                                             | Li et al. 2010, Curr. Biol.               | ✦   |
| `p53.tsv`          | Tumor suppressor p53 across mammals                       | conserved DNA-binding core and variable termini; TAD/DBD/tetramerization domains                                                       | Lane 1992, Nature                         | ✦   |
| `ef1a.tsv`         | EF-1α / EF-Tu across the three domains of life            | universal GTPase rooting the tree of life; 3-domain EF architecture                                                                    | Iwabe et al. 1989, PNAS                   | ✦   |
| `insulin.tsv`      | Insulin / IGF preprohormone                               | signal + B + C + A peptide segments across vertebrates                                                                                 |                                           |     |
| `aquaporin.tsv`    | Aquaporin (MIP) channel family                            | shared 6-TM MIP fold; tree splits water channels from aquaglyceroporins                                                                |                                           | ✦   |
| `hox.tsv`          | Hox transcription factors (human, PG1→PG13)               | divergent proteins sharing one conserved homeodomain; overlay marks that single block                                                  | Gehring et al. 1994, Annu. Rev. Biochem.  | ✦   |
| `kinase.tsv`       | Src-family kinases (8 human + SRC mouse/chicken)          | SH3 + SH2 + kinase in every row; the contact arcs from `contacts.mjs` mark how the three domains pack                                  | Xu et al. 1999, Mol. Cell                 | ✦   |
| `nlrp1.tsv`        | NLRP1 inflammasome sensor across 12 vertebrates           | shared NACHT/WH/HD2 + FIIND/UPA/CARD core; N-terminal PYD only in primates, dog, hedgehog                                              | Broz & Dixit 2016, Nat. Rev. Immunol.     | ✦   |
| `trna.stock`       | Transfer RNA cloverleaf (Rfam RF00005 seed subset)        | `SS_cons` renders as a base-paired track over the alignment                                                                            | Sprinzl & Vassilenko 2005, NAR            |     |
| `hammerhead.stock` | Hammerhead ribozyme type III (Rfam RF00008 seed subset)   | catalytic RNA; `SS_cons` shows the three-way helix junction                                                                            | Pley et al. 1994, Nature                  |     |
| `corona_fse.stock` | Coronavirus frameshift element (Rfam RF00507 seed subset) | a pseudoknot: `SS_cons` writes it `A`/`a` because it crosses stem 1 instead of nesting inside it, and the arc track draws the crossing | Baranov et al. 2005, Virology             |     |

The `.stock` datasets are RNA; see "RNA structural alignments" below.

## The pipeline (`generate.mjs`)

For each dataset, in order:

1. **Fetch** (only with `--fetch`, or if the snapshot is missing). For every
   accession, GET `https://rest.uniprot.org/uniprotkb/<acc>.fasta` and rewrite
   the header to the row label, writing the committed snapshot
   `datasets/<name>.fasta`. Otherwise the script uses the committed snapshot as
   is.

2. **Align.** Run ClustalW:

   ```sh
   clustalw -INFILE=input.fasta -ALIGN -TYPE=PROTEIN \
            -OUTPUT=FASTA -OUTFILE=aligned.afa
   ```

   ClustalW is progressive, fast, deterministic and needs no configuration,
   which is enough for a demo of a single gene family. For a publication tree
   use MAFFT or MUSCLE with IQ-TREE or RAxML instead.

3. **Tree.** Run ClustalW again on the alignment to infer a neighbor-joining
   tree (Newick, written to `aligned.ph`):

   ```sh
   clustalw -INFILE=aligned.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
   ```

   The tree is inferred from the alignment, so the examples show its
   phylogenetic signal: globins group by type, opsins by class.

The script writes the aligned FASTA (unwrapped to one line per row) as
`<name>.aln` and the one-line Newick as `<name>.nh`. Row labels in the alignment
and the tree are identical, and the viewer pairs a tree leaf to its alignment
row by label.

`build/` is gitignored scratch. Git holds `datasets/*` (the accession TSVs, the
`.fasta` sequence snapshots and any `-domains.gff`) and the generated files in
`packages/examples/data/`, so the data is reproducible and also present without
network access at build time.

## The `relativeTo` reference row

For MyD88 and ACE2 the first dataset row is `Human`. The gallery components pass
`relativeTo="Human"` to `MSAViewer`, which renders a `.` in every other row
wherever it matches the reference and the letter only where it differs. On a
highly conserved protein this leaves only the lineage- or host-specific
substitutions as letters, the same reading aid comparative-genomics figures use.

## Domain overlays: committed `datasets/<name>-domains.gff`

The project's own CLI produces each domain annotation once, and git holds it as
`datasets/<name>-domains.gff`; `generate.mjs` copies the file into
`packages/examples/data/` beside the alignment. The GFF `seq_id`s are the
dataset row labels and the coordinates are in ungapped sequence space. The
viewer maps them onto alignment columns (`seqPosToGlobalCol`), so domains line
up on a gapped alignment.

**Preferred method: precomputed InterPro (`interpro`).** The EBI InterPro API
serves precomputed matches for every UniProtKB sequence, and these inputs are
UniProt accessions, so no scan has to run. This path returns in seconds, gives
the same result for a given InterPro release (stamped in the GFF header) and
needs no email. It reads `datasets/<name>.tsv` directly:

```sh
node packages/cli/dist/index.js interpro \
     scripts/examples-gen/datasets/opsins.tsv \
     -o scripts/examples-gen/datasets/opsins-domains.gff   # --database pfam (default)
```

Every committed `…-domains.gff` here comes from this command. Pfam gives one
signature per domain (Death + TIR for MyD88, the four p53 domains, the 3-domain
EF architecture); `--database cdd` or any other InterPro member database also
works.

**Fallback: live InterProScan (`interproscan`).** Use it only for sequences that
are not in UniProtKB (custom, edited or predicted), which have no precomputed
match. It submits each ungapped sequence to the EBI InterProScan API (~1–5 min
per sequence, email required) or to a local, Docker or Singularity install:

```sh
node packages/cli/dist/index.js interproscan \
     scripts/examples-gen/build/opsins/input.fasta \
     -o scripts/examples-gen/datasets/opsins-domains.gff \
     --programs PfamA,CDD --email you@example.org
```

## Adding a new example

1. Create `datasets/mygene.tsv` (accession `<TAB>` label; reference row first).
2. Add `{ name: 'mygene' }` to the `datasets` array in `generate.mjs`.
3. `node scripts/examples-gen/generate.mjs mygene` writes `mygene.aln` and
   `mygene.nh` to `packages/examples/data/`.
4. (optional)
   `node packages/cli/dist/index.js interpro datasets/mygene.tsv -o datasets/mygene-domains.gff`
   for a `mygene-domains.gff` overlay (precomputed InterPro).
5. Import the files in `packages/examples/src/examples/data.ts`, write a
   component that draws them, and register both in `catalog.ts` and `index.ts`.

## RNA structural alignments (`.stock` datasets)

Structured-RNA families take a different path from the protein `.tsv` datasets.
An Rfam seed alignment is already a hand-curated structural alignment with a
consensus secondary structure (`#=GC SS_cons`, WUSS notation), and re-aligning
it would break the column-to-structure correspondence. The script keeps the
committed `datasets/<name>.stock` verbatim as the alignment, and `generate.mjs`
only:

- runs ClustalW `-TREE -TYPE=DNA` on its sequences to infer a neighbor-joining
  tree (mapping `U`→`T` and Rfam insert gaps `.`→`-` for the inference only),
  then injects that tree as `#=GF NH`, where the parser (`StockholmMSA.getTree`)
  reads it; and
- writes one `<name>.stock` file with the tree embedded, and no separate `.nh`.

The viewer shows `SS_cons` as a "Secondary-structure" track and colors every
WUSS bracket type (`<>`, `()`, `[]`, `{}`) by base pairing, so the tRNA acceptor
stem (parens) and the D, anticodon and T arms (angle brackets) all show over
their alignment columns.

To add one, put the curated Rfam subset in `datasets/<name>.stock` (a normal
Stockholm file with `#=GC SS_cons` and no tree), add
`{ name: '<name>', kind: 'rna-stockholm' }` to the `datasets` array, and run
`generate.mjs <name>`. `trna.stock` is a 24-sequence subset of the RF00005 seed
(full seed: 954 sequences) and `hammerhead.stock` a 20-sequence subset of
RF00008 (full seed: 85); their row labels are the raw Rfam `accession/coords`
ids, as in the lysine example. `corona_fse.stock` is 18 of the 51 RF00507 seed
rows, one per lineage across the four coronavirus genera, and it relabels its
rows: a reader can't identify the virus from `NC_004718.3/13399-13476`, so the
row is labelled `SARS-CoV`. Each label's source row stays in the file as a
`#=GS <label> AC <id>` line, so the subset records exactly which seed rows it
took.

## Arcs

The viewer draws pairs of positions as arcs (see `docs/layers.md`). An RNA
Stockholm file already pairs its columns through `SS_cons`. A protein pairing
loads as a `columnTracks` entry, and the examples here take theirs from the same
accession the sequence came from. The insulin example's three disulfide bonds
are the `Disulfide bond` features of UniProt P01308, read off the entry and
written into the component as residue pairs of the `Human` row:

```sh
curl 'https://rest.uniprot.org/uniprotkb/P01308.json?fields=ft_disulfid'
```

Positions from a feature table are already in that sequence's own numbering,
which `row` on the track expects, so nothing has to be recomputed against the
alignment.

A contact map has the same form with a longer derivation, so a script builds it:
`contacts.mjs` computes C-beta pairs under 8 Å in a PDB entry and keeps the ones
whose two ends sit in different domains of the committed domain GFF. Those pairs
mark how the domains pack, and the thousands of pairs between neighbouring
residues are dropped. The mmCIF parsing, the SIFTS lookup and the numbering
check live in `structure.mjs`, shared with the two scripts below.

```sh
node scripts/examples-gen/contacts.mjs
```

The script writes `packages/examples/src/examples/kinaseStructure.json` with its
own provenance (entry, chain, accession, cutoff, per-domain-pair counts). The
output is JSON because the formatter rewrites a generated TS file's quoting, and
the screenshot specs read the same file the example imports.

The same file carries the SIFTS correspondence as a `residueMappings` layer (see
`docs/layers.md`). The arcs are derived from it, and the file keeps the
correspondence as well so a structure viewer can look up which residue an
alignment column holds without calling SIFTS again. `unobserved` comes from
comparing the residues the entity declares against the ones with coordinates;
`rowLength` records the row it was computed against, so the viewer can ignore
the mapping if someone later loads it beside a different alignment.

`hemoglobin.mjs` writes `hemoglobinSickle.json` for the globin example: the
SIFTS mapping of the human alpha and beta rows onto PDB 1A3N, the AlphaMissense
mean per residue of HBB, and the sickle-cell position. That position is row
residue 7, `p.Glu7Val` in HGVS, and residue 6 of chain B in the structure, and
the mapping converts between the last two. 1A3N is an α2β2 tetramer, so each
sequence has two chains in it; the script emits one chain per row, because
`model.structureResidue` returns nothing when one row maps onto one structure id
twice. The script reads the AlphaMissense table from the `amAnnotationsUrl`
field of AlphaFold's prediction record instead of building a filename by hand,
and the API returns 403 to a request with no `User-Agent`.

```sh
node scripts/examples-gen/hemoglobin.mjs
```

`ace2Interface.mjs` writes `ace2Interface.json`: the 20 residues of human ACE2
with a heavy atom within 4 Å of the SARS-CoV-2 spike receptor-binding domain in
PDB 6M0J, as `highlights` on the `Human` row. The cutoff uses all-atom distance,
not C-beta: two side chains touch through whichever atoms face each other, and a
C-beta cutoff wide enough to catch that also catches residues that only pass
nearby. The list comes out as Q24 T27 F28 D30 K31 H34 E35 E37 D38 Y41 Q42 L79
M82 Y83 N330 K353 G354 D355 R357 R393, the set the structure papers report.

```sh
node scripts/examples-gen/ace2Interface.mjs
```

`clinvar.mjs` builds a per-column layer the same way: it counts, per residue,
how many distinct missense alleles ClinVar classifies as pathogenic, and writes
`packages/examples/src/examples/p53ClinVar.json`.

```sh
node scripts/examples-gen/clinvar.mjs
```

The script handles two cases a shorter version would get wrong. It filters the
classification off each record instead of trusting the search term, because
E-utilities translates `"pathogenic"[clinical significance]` to a loose
`[All Fields]` match that also returns "Conflicting classifications of
pathogenicity". It also drops nonsense changes: a stop is not one residue
substituted for another, and it disables everything downstream, so it does not
belong on a per-residue count. As a sanity check, 94% of the variants that
remain fall inside the DNA-binding domain.

The SIFTS lookup matters most here, because a PDB entry numbers its residues its
own way, and a contact map placed on the alignment with the wrong offset still
looks plausible. `https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/<pdb>` gives
that offset. For Src, the check is that the SH2 arcs land on residue 527, the
phosphotyrosine the domain binds.

The alignment row has a third numbering, which the script also checks. Placing a
contact at UniProt residue _n_ on the row assumes the row's residue _n_ is that
residue. A full-length sequence satisfies that and a fragment does not: a domain
alignment whose rows are named `/27-137` would put every arc in the wrong place
with no error. The script reads the residue identities out of the structure,
maps them through SIFTS, and compares each one against the row's residue at that
position; on any mismatch it aborts and prints the count and the first few. For
Src all 450 checked residues agree, and an offset of one anywhere in the chain
breaks 425 of them.

## The other example data

Four files in `packages/examples/data` come from elsewhere:

- **`lysine.stock`**: the Rfam RF00168 seed alignment downloaded as Stockholm,
  which already embeds its own tree (`#=GF NH`) and secondary structure for the
  parser to extract.
- **`f12-cetacean-cds.stock` / `f12-cetacean-exons.gff`**: the DNA alignment and
  exon overlay built by `scripts/f12-cetacean`.
- **`gene-cluster.stock` / `gene-cluster.gff`**: synthetic, built by
  `scripts/gene-cluster`.

The Pfam PF00042 example and the A3M example load no file from here. They fetch
the alignment at view time, from the InterPro API and from OpenProteinSet,
because each shows a file exactly as its source publishes it.
