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

# regenerate every dataset (fetch -> align -> tree -> write TS constants)
node scripts/examples-gen/generate.mjs

# or just some of them
node scripts/examples-gen/generate.mjs myd88 ace2
```

Output is written to
`packages/examples/src/examples/generatedData.ts` as plain string constants
(`myd88MSA`, `myd88Tree`, `globinMSA`, …) that the gallery, the SVG figures and
the screenshot specs all import. That file is **generated — do not edit it by
hand**; edit the inputs here and re-run.

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

Current datasets:

| File              | Family | Story it tells |
| ----------------- | ------ | -------------- |
| `myd88.tsv`       | MyD88 TLR/IL-1R adaptor across mammals + 3 bats | `relativeTo=Human` identity-dots; lineage-specific substitutions |
| `globin.tsv`      | Hemoglobin α/β, myoglobin, neuroglobin, cytoglobin | tree groups by globin **type**, not species — gene duplication |
| `ace2.tsv`        | ACE2 (SARS-CoV-2 receptor) across mammals | dot view exposes the few spike-contact residues driving host range |
| `opsins.tsv`      | Vertebrate visual pigments | tree sorts by opsin class; + real 7TM-GPCR domain overlay |

## The pipeline (`generate.mjs`)

For each dataset, in order:

1. **Fetch.** For every accession, GET
   `https://rest.uniprot.org/uniprotkb/<acc>.fasta` and rewrite the header to
   the clean label. Result: `build/<name>/input.fasta`.

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

`build/` is gitignored scratch; only `datasets/*` (inputs) and the generated TS
(output) are committed, so the data is both reproducible _and_ present without
needing network access at build time.

## The `relativeTo` reference-row trick

For MyD88 and ACE2 the first dataset row is `Human`. The gallery components pass
`relativeTo="Human"` to `MSAViewer`, which makes every other row render a `.`
wherever it matches the reference and the actual letter only where it differs.
On a highly conserved protein this collapses the noise and makes the handful of
lineage- or host-specific substitutions jump out — the same reading aid used in
comparative-genomics figures.

## Domain overlays (InterProScan) — the one out-of-band step

Domain annotations come from InterProScan, which is a slow network/compute job
(~1–5 min per sequence against the EBI API), so it is **not** run by
`generate.mjs`. Instead the GFF is produced once with the project's own CLI and
committed as `datasets/<name>-domains.gff`; `generate.mjs` picks it up
automatically and emits a `…DomainsGFF` constant.

```sh
# produce datasets/opsins-domains.gff from the fetched (ungapped) sequences
node packages/cli/dist/index.js interproscan \
     scripts/examples-gen/build/opsins/input.fasta \
     -o scripts/examples-gen/datasets/opsins-domains.gff \
     --programs PfamA,CDD --email you@example.org
```

The CLI degaps each row before submission, so GFF coordinates are in ungapped
sequence space; the viewer maps them back onto alignment columns
(`seqPosToGlobalCol`), so domains line up even on a gapped alignment. The GFF
`seq_id`s match the dataset row labels.

## Adding a new example

1. Create `datasets/mygene.tsv` (accession `<TAB>` label; reference row first).
2. Add `{ name: 'mygene', varName: 'mygene', relativeToFirstRow: <bool> }` to the
   `datasets` array in `generate.mjs`.
3. `node scripts/examples-gen/generate.mjs mygene` → constants `mygeneMSA` /
   `mygeneTree` appear in `generatedData.ts`.
4. (optional) Run InterProScan as above to add `mygeneDomainsGFF`.
5. Add a gallery component in `packages/examples/src/examples/` that imports the
   constants, and register it in `index.ts`.

## The other real examples

Two real examples predate this pipeline and are documented here for provenance:

- **Src-family kinases** (`kinaseMSA`/`kinaseTree`/`kinaseDomainsGFF` in
  `exampleData.ts`) — 10 SFKs aligned with ClustalW, domains from
  `react-msaview-cli interproscan`; same method as above, just hand-run earlier.
- **Lysine riboswitch** (`lysineMSA` in `exampleData.ts`) — not built here: it is
  the Rfam RF00168 seed alignment downloaded as Stockholm, which already embeds
  its own tree (`#=GF NH`) and secondary structure, extracted by the parser.
