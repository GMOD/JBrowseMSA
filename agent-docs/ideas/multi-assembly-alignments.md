# Precomputed alignments for mouse, fly and worm

The human gene explorer reads a gene's whole 100-way alignment with one random
read from a hosted bgzip. `scripts/gene-explorer/build-data.mjs` now builds the
same three-file index for `mm39`, `dm6` and `ce11` (and the bigger `dm6-124way`
/ `ce11-135way`), keyed by the species' own symbols and with `.cds` sequence
names that match the GenArk 2bit the explorer already displays those species on.
What is left is hosting the outputs and wiring `website/src/lib/geneExplorer.ts`
to use them. The survey behind the choice of assemblies is in
`scripts/gene-explorer/README.md`.

## Host

Run the builds (dm6 and ce11 are minutes; mm39 is a 168 MB download) and copy
each alignment's five files to `s3://jbrowse.org/demos/msaview/<db>-<N>way/`
with the `aws s3 cp` commands in the README.

## Wire

`geneExplorer.ts` keys everything off `species.humanFastPath`. Replace that
boolean with a per-taxon hosted-alignment table, absent for species without one:

```ts
const HOSTED_MSA: Record<number, { base: string; file: string; db: string }> = {
  9606: {
    base: `${DEMOS}/100way`,
    file: 'hg38.knownCanonical.multiz100way.aa.fa.gz',
    db: 'hg38',
  },
  10090: {
    base: `${DEMOS}/mm39-35way`,
    file: 'mm39.knownCanonical.multiz35way.aa.fa.gz',
    db: 'mm39',
  },
  7227: {
    base: `${DEMOS}/dm6-27way`,
    file: 'dm6.refGene.multiz27way.aa.fa.gz',
    db: 'dm6',
  },
  6239: {
    base: `${DEMOS}/ce11-26way`,
    file: 'ce11.refGene.multiz26way.aa.fa.gz',
    db: 'ce11',
  },
}
```

Per entry the website needs:

- `MSA_GZ` = `${base}/${file}`; `.gzi`, `.idx`, `.cds` by suffix as today. The
  `getMsaIndex` / `getCdsIndex` memos become per-url (a `Map<url, Promise>`),
  since `memoizedTextIndex` currently closes over one url.
- `TREE_URI` = `${base}/${db}.multiz${N}way.nh` — carry `N` in the table or
  derive it from the file name.
- `querySeqName` = `db` (`'hg38'` is hard-coded in `fetchGeneMsa` and
  `msaViewHosted`; the reference row of every block is named by the db).
- `msaName` = the symbol as the species writes it (`Trp53`, `Antp`, `lin-12`).
  The `.idx` keys are case-exact, so look up with the symbol NCBI/mygene
  resolved, not the typed one (the human path had exactly this bug with `tp53`).

## The `.cds` sidecar replaces `gene_table`

For a non-human gene the explorer today calls NCBI Datasets (locus), UniProt
(accession + sequence) and E-utils `gene_table` (the CDS model), then picks an
isoform by UniProt length. With a hosted alignment the `.cds` line for the
symbol is the CDS model — the one the alignment was translated from, so the MSA
row and the `connectedFeature` share codon ordinals by construction, the same
argument the human path makes for knownCanonical over RefSeq Select. So
`loadSpeciesGene` becomes: resolve the locus (for the assembly accession and a
fallback), try `fetchGeneCds(symbol)` against the species' `.cds`, and only fall
back to `fetchTranscriptNcbi` when the symbol is not in the index.

`.cds` refNames for these assemblies are already the GenArk names
(`NC_000077.7`, `NT_033777.3`), so `toCanonicalRefName` must NOT strip `chr`
from them — it is a no-op on an accession, but the human-only assumption in its
comment goes. The `assemblyAccession` the session embeds stays the one NCBI
reports, which the build asserts is the GenArk assembly in its table
(GCF_000001635.27, GCF_000001215.4, GCF_000002985.6).

`proteinSequence` for the 3D view comes from the MSA's reference row, ungapped,
as `loadHumanGene` does — it is the translation of the `.cds` model. The UniProt
sequence stays the fallback for genes outside the index.

## What stays on-demand

Zebrafish (NCBI reports GRCz12, UCSC has no danRer11 multiz), yeast (no exonAA
export for sacCer3) and Arabidopsis (no UCSC genome) keep building their
alignment at launch. Once these three are hosted, the on-demand path is the
exception rather than the rule for the species the page offers.

## Optional

`dm6-124way` (124 insects, 665 MB input) and `ce11-135way` (135 nematodes, 521
MB) build with the same command and are slice-tested. They are a better
alignment than the 27/26-way and a heavier random read per gene; host them under
`dm6-124way/` / `ce11-135way/` and switch the table entry if the payload is
acceptable.
