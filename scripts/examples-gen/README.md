# Building the real-data phylogeny examples

This directory builds the "real biology" examples in the gallery
(`packages/examples`) and docs **reproducibly and from scratch**, so the data
provenance and the method are fully visible rather than being opaque blobs
pasted into a source file.

Getting a good protein-family alignment + tree is not hard once the steps are
written down — the problem is that they usually _aren't_ written down. This is
the whole pipeline, every step, nothing hidden.

## TL;DR

```sh
# one-time: install the aligner
sudo apt-get install clustalw        # Debian/Ubuntu
# brew install clustal-w             # macOS

# rebuild constants from the committed sequence snapshots (deterministic,
# offline): align -> tree -> write TS constants
node scripts/examples-gen/generate.mjs        # or: pnpm examples:gen

# re-download the sequences from UniProt first (refreshes datasets/<name>.fasta)
node scripts/examples-gen/generate.mjs --fetch

# limit to some datasets
node scripts/examples-gen/generate.mjs myd88 ace2
```

Output is written to `packages/examples/src/examples/generatedData.ts` as plain
string constants (`myd88MSA`, `myd88Tree`, `globinMSA`, …) that the gallery, the
SVG figures and the screenshot specs all import. That file is **generated — do
not edit it by hand**; edit the inputs here and re-run.

## What a dataset is

Each dataset is one tiny tab-separated file under `datasets/`:

```
# comments start with #
<UniProt accession>   <TAB>   <row label>
Q99836                        Human
P22366                        Mouse
...
```

That's the entire human-authored input: a curated list of accessions and the
short label each row should get in the viewer. The first row is treated as the
reference (for `relativeTo`, see below).

Alongside each `.tsv`, the **exact fetched sequences** are committed as
`datasets/<name>.fasta`. That snapshot — not a live UniProt request — is what
the pipeline aligns by default, so regeneration is deterministic and offline and
the precise sequences are visible in git. UniProt entries can change over time;
run with `--fetch` to deliberately refresh the snapshot from UniProt (and review
the diff) rather than having it drift silently underfoot.

Current datasets:

A ✦ in the last column marks datasets that ship a committed InterProScan domain
overlay (`<name>-domains.gff`).

| File               | Family                                                  | Story it tells                                                                                        | Paper                                     | Dom |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | --- |
| `myd88.tsv`        | MyD88 TLR/IL-1R adaptor across mammals + 3 bats         | `relativeTo=Human` identity-dots; lineage-specific substitutions; Death + TIR two-domain architecture | Tian et al. 2023, Sci. Adv. (PMC10162675) | ✦   |
| `globin.tsv`       | Hemoglobin α/β, myoglobin, neuroglobin, cytoglobin      | tree groups by globin **type**, not species — gene duplication                                        | Zuckerkandl & Pauling 1965                |     |
| `ace2.tsv`         | ACE2 (SARS-CoV-2 receptor) across mammals               | dot view exposes the few spike-contact residues driving host range; peptidase M2 + collectrin domains | Damas et al. 2020, PNAS                   | ✦   |
| `opsins.tsv`       | Vertebrate visual pigments                              | tree sorts by opsin class; + real 7TM-GPCR domain overlay                                             | Yokoyama 2000, Prog. Retin. Eye Res.      | ✦   |
| `histone_h4.tsv`   | Histone H4 across eukaryotes                            | one of the most conserved proteins known — near-flat alignment                                        |                                           |     |
| `cytochrome_c.tsv` | Cytochrome c across eukaryotic life                     | classic molecular clock; tree spans >1 Gy                                                             | Fitch & Margoliash 1967, Science          |     |
| `prestin.tsv`      | Prestin (SLC26A5) hearing motor                         | echolocators converge in the gene tree; SLC26 transmembrane + STAS domains                            | Li et al. 2010, Curr. Biol.               | ✦   |
| `p53.tsv`          | Tumor suppressor p53 across mammals                     | conserved DNA-binding core vs variable termini; multi-domain TAD/DBD/tetramerization                  | Lane 1992, Nature                         | ✦   |
| `ef1a.tsv`         | EF-1α / EF-Tu across the three domains of life          | universal GTPase rooting the tree of life; 3-domain EF architecture                                   | Iwabe et al. 1989, PNAS                   | ✦   |
| `insulin.tsv`      | Insulin / IGF preprohormone                             | signal + B + C + A peptide segments across vertebrates                                                |                                           |     |
| `aquaporin.tsv`    | Aquaporin (MIP) channel family                          | shared 6-TM MIP fold; tree splits water channels from aquaglyceroporins — groups by function          | —                                         | ✦   |
| `hox.tsv`          | Hox transcription factors (human, PG1→PG13)             | divergent proteins sharing one conserved homeodomain; overlay marks that single block                 | Gehring et al. 1994, Annu. Rev. Biochem.  | ✦   |
| `trna.stock`       | Transfer RNA cloverleaf (Rfam RF00005 seed subset)      | RNA secondary structure: `SS_cons` renders as a base-paired track over the alignment                  | Sprinzl & Vassilenko 2005, NAR            |     |
| `hammerhead.stock` | Hammerhead ribozyme type III (Rfam RF00008 seed subset) | catalytic RNA: `SS_cons` shows the three-way helix junction; counterpoint to tRNA                     | Pley et al. 1994, Nature                  |     |

The `.stock` datasets are RNA, not protein — see "RNA structural alignments"
below.

## The pipeline (`generate.mjs`)

For each dataset, in order:

1. **Fetch** (only with `--fetch`, or if the snapshot is missing). For every
   accession, GET `https://rest.uniprot.org/uniprotkb/<acc>.fasta` and rewrite
   the header to the clean label, writing the committed snapshot
   `datasets/<name>.fasta`. Otherwise that committed snapshot is used as-is.

2. **Align.** Run ClustalW:

   ```sh
   clustalw -INFILE=input.fasta -ALIGN -TYPE=PROTEIN \
            -OUTPUT=FASTA -OUTFILE=aligned.afa
   ```

   ClustalW is progressive (fast, deterministic, zero-config) — fine for a
   readable demo of a single gene family. It is _not_ a maximum-likelihood
   phylogenetics pipeline; for publication you'd graduate to MAFFT/MUSCLE +
   IQ-TREE/RAxML. The point here is a faithful, reproducible illustration.

3. **Tree.** Run ClustalW again on the alignment to infer a neighbor-joining
   tree (Newick, written to `aligned.ph`):

   ```sh
   clustalw -INFILE=aligned.afa -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip
   ```

   This is a real tree inferred from the alignment, so the examples show genuine
   (if simple) phylogenetic signal — globins really do group by type, opsins by
   class.

The aligned FASTA (unwrapped to one line per row) and the one-line Newick are
emitted as the `…MSA` / `…Tree` constants. Row labels in the alignment and the
tree are identical, which is how the viewer pairs a tree leaf to its alignment
row.

`build/` is gitignored scratch; only `datasets/*` (the accession TSVs, the
`.fasta` sequence snapshots, and any `-domains.gff`) and the generated TS output
are committed, so the data is both reproducible _and_ present without needing
network access at build time.

## The `relativeTo` reference-row trick

For MyD88 and ACE2 the first dataset row is `Human`. The gallery components pass
`relativeTo="Human"` to `MSAViewer`, which makes every other row render a `.`
wherever it matches the reference and the actual letter only where it differs.
On a highly conserved protein this collapses the noise and makes the handful of
lineage- or host-specific substitutions jump out — the same reading aid used in
comparative-genomics figures.

## Domain overlays — committed `datasets/<name>-domains.gff`

Domain annotations are produced once with the project's own CLI and committed as
`datasets/<name>-domains.gff`; `generate.mjs` picks the file up automatically
and emits a `…DomainsGFF` constant. The GFF `seq_id`s are the dataset row labels
and the coordinates are in ungapped sequence space — the viewer maps them onto
alignment columns (`seqPosToGlobalCol`), so domains line up on a gapped
alignment.

**Preferred method — precomputed InterPro (`interpro`).** Every UniProtKB
sequence already has InterPro matches computed and served by the EBI InterPro
API, and our inputs _are_ UniProt accessions, so there is no need to run a scan
at all. This path is instant, deterministic, needs no email, and pins to a
single InterPro release (stamped in the GFF header). It reads
`datasets/<name>.tsv` directly:

```sh
node packages/cli/dist/index.js interpro \
     scripts/examples-gen/datasets/opsins.tsv \
     -o scripts/examples-gen/datasets/opsins-domains.gff   # --database pfam (default)
```

This is how every committed `…-domains.gff` here is built. Pfam gives one clean
signature per domain (e.g. Death + TIR for MyD88, the four p53 domains, the
3-domain EF architecture); `--database cdd` (or any InterPro member db) is also
available.

**Fallback — live InterProScan (`interproscan`).** Only needed for sequences
that are _not_ in UniProtKB (custom/edited/predicted), where no precomputed
match exists. It submits each ungapped sequence to the EBI InterProScan API
(slow, ~1–5 min/seq, email-gated) or to a local/Docker/Singularity install:

```sh
node packages/cli/dist/index.js interproscan \
     scripts/examples-gen/build/opsins/input.fasta \
     -o scripts/examples-gen/datasets/opsins-domains.gff \
     --programs PfamA,CDD --email you@example.org
```

## Adding a new example

1. Create `datasets/mygene.tsv` (accession `<TAB>` label; reference row first).
2. Add `{ name: 'mygene', varName: 'mygene', relativeToFirstRow: <bool> }` to
   the `datasets` array in `generate.mjs`.
3. `node scripts/examples-gen/generate.mjs mygene` → constants `mygeneMSA` /
   `mygeneTree` appear in `generatedData.ts`.
4. (optional)
   `node packages/cli/dist/index.js interpro datasets/mygene.tsv -o datasets/mygene-domains.gff`
   to add `mygeneDomainsGFF` (precomputed InterPro).
5. Add a gallery component in `packages/examples/src/examples/` that imports the
   constants, and register it in `index.ts`.

## RNA structural alignments (`.stock` datasets)

Structured-RNA families are handled differently from the protein `.tsv`
datasets. An Rfam seed alignment is **already** a hand-curated structural
alignment that carries a consensus secondary structure (`#=GC SS_cons`, WUSS
notation), so re-aligning it would destroy the column-to-structure
correspondence. The committed `datasets/<name>.stock` is therefore kept verbatim
as the alignment; `generate.mjs` only:

- runs ClustalW `-TREE -TYPE=DNA` on its sequences to infer a neighbor-joining
  tree (mapping `U`→`T` and Rfam insert gaps `.`→`-` purely for the inference),
  then injects that tree as `#=GF NH` so the parser (`StockholmMSA.getTree`)
  renders it; and
- emits a single `<var>MSA` Stockholm string constant (no separate `Tree`
  constant — the tree is embedded).

The viewer shows `SS_cons` as a dedicated "Secondary-structure" track, coloring
every WUSS bracket type (`<>`, `()`, `[]`, `{}`) by base-pairing — so e.g. the
tRNA acceptor stem (parens) and the D/anticodon/T arms (angle brackets) all
light up over the alignment columns.

To add one: drop the curated Rfam subset into `datasets/<name>.stock` (a normal
Stockholm with `#=GC SS_cons` and no tree), add
`{ name: '<name>', varName: '<var>', kind: 'rna-stockholm' }` to the `datasets`
array, and run `generate.mjs <name>`. `trna.stock` is a 24-sequence subset of
the RF00005 seed (full seed: 954 sequences) and `hammerhead.stock` a 20-sequence
subset of RF00008 (full seed: 85); the row labels are the raw Rfam
`accession/coords` ids, same as the lysine example.

## The other real examples

Two real examples predate this pipeline and are documented here for provenance:

- **Src-family kinases** (`kinaseMSA`/`kinaseTree`/`kinaseDomainsGFF` in
  `exampleData.ts`) — 10 SFKs aligned with ClustalW, domains from
  `react-msaview-cli interproscan`; same method as above, just hand-run earlier.
- **Lysine riboswitch** (`lysineMSA` in `exampleData.ts`) — not built here: it
  is the Rfam RF00168 seed alignment downloaded as Stockholm, which already
  embeds its own tree (`#=GF NH`) and secondary structure, extracted by the
  parser.
