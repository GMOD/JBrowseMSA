# Gene explorer data

Backs the human path of the
[Gene explorer](../../website/src/pages/gene-explorer.astro) page: type any
human gene → a connected JBrowse session with a **collapsed-intron** gene view,
its **100-way vertebrate protein alignment**, and the **AlphaFold structure**.
Other species resolve live through NCBI and GenArk (see
`website/src/lib/speciesGenes.ts`) today; the same build produces mouse, fly
and worm alignments (see [Assemblies](#assemblies)), waiting only on hosting
and the wiring in
[multi-assembly alignments](../../agent-docs/ideas/multi-assembly-alignments.md).

Almost everything is computed live in the browser from public CORS services, so
there is nothing per-gene to host:

- **mygene.info** — gene symbol → hg38 locus + UniProt accession (+ type-ahead)
- **the `.cds` sidecar** (below) — the knownCanonical transcript's coding-exon
  model, the same transcript the alignment is built from. Its exon ranges become
  the LinearGenomeView `loc` (each range = one displayed region, rendered
  back-to-back — that is how introns collapse declaratively) AND the connected
  feature the MsaView/ProteinView map through. Sourcing the feature from the
  alignment's own transcript (not RefSeq Select, a different canonical isoform
  for ~10% of genes) keeps the genome↔MSA and genome↔3D mappings
  coordinate-consistent for every gene. RefSeq Select GFF is the fallback only
  for genes outside the 100-way set.
- **AlphaFold** — the structure, by UniProt accession.

The one thing that cannot be fetched live is the alignment: a UCSC multiz
exon-amino-acid file is hundreds of MB. `build-data.mjs` reindexes it **once**
into a single bgzip file plus a tiny name index, so any gene's whole alignment
is one random read **by gene symbol** — no per-gene files, no coordinates, no 91
MB faidx.

## Assemblies

The script carries a table of the UCSC assemblies it knows. Human is the one the
site hosts today; the others are built the same way and land on the GenArk
assembly the explorer's non-human species already display.

| `--assembly`  | exonAA input (size)                  | transcript → symbol | tree                          | GenArk           | species |
| ------------- | ------------------------------------ | ------------------- | ----------------------------- | ---------------- | ------- |
| `hg38`        | multiz100way knownCanonical (474 MB) | kgXref              | `hg38.100way.nh`              | — (hosted hg38)  | human   |
| `mm39`        | multiz35way knownCanonical (168 MB)  | kgXref              | `mm39.35way.nh`               | GCF_000001635.27 | mouse   |
| `dm6`         | multiz27way refGene (128 MB)         | refGene name2       | `dm6.27way.nh`                | GCF_000001215.4  | fly     |
| `dm6-124way`  | multiz124way ncbiRefSeq (665 MB)     | ncbiRefSeq name2    | `dm6.124way.sequenceNames.nh` | GCF_000001215.4  | fly     |
| `ce11`        | multiz26way refGene (88 MB)          | refGene name2       | `ce11.26way.nh`               | GCF_000002985.6  | worm    |
| `ce11-135way` | multiz135way ensGene (521 MB)        | ensemblToGeneName   | `ce11.135way.nh`              | GCF_000002985.6  | worm    |

Why these and not others:

- **mm39** is GRCm39, the assembly NCBI Datasets reports mouse genes on
  (`GCF_000001635.27`), so the `.cds` coordinates match what the explorer's
  non-human path already shows. mm10 (GRCm38) has a richer 60-way but the
  explorer never lands on it.
- **dm6** and **ce11** are the GenArk assemblies NCBI reports fly and worm on
  (Release 6, WBcel235). The 27-way / 26-way are the cheap, symbol-keyed sets;
  the 124-way insects and 135-way nematodes are the ambitious ones and
  slice-tested only.
- **Zebrafish** is out: NCBI Datasets now reports `tp53` on GRCz12tu/GRCz12ab
  (`GCF_049306965.2` / `GCF_052040795.1`), not GRCz11 (`danRer11`), and UCSC has
  no danRer11 multiz anyway (danRer10 has a 12-way).
- **Yeast** and **Arabidopsis**: sacCer3 has a multiz7way but no exonAA export,
  and UCSC has no Arabidopsis genome at all. Those species keep building their
  alignment on demand.

## Build

```sh
# downloads the exonAA into outDir (kept for the next run) and streams the xref
# table + tree from UCSC. Requires bgzip (htslib) on PATH. Writes to ./out.
node scripts/gene-explorer/build-data.mjs [--assembly=hg38] [exonAA.fa.gz] [outDir]
```

Or point it at a **local copy** of the exonAA:

```sh
mkdir -p ~/data/gene-explorer && cd ~/data/gene-explorer
curl -sLO https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz
node /path/to/scripts/gene-explorer/build-data.mjs \
  ~/data/gene-explorer/knownCanonical.multiz100way.exonAA.fa.gz ./out

curl -sLO https://hgdownload.soe.ucsc.edu/goldenPath/dm6/multiz27way/alignments/refGene.exonAA.fa.gz
node /path/to/scripts/gene-explorer/build-data.mjs --assembly=dm6 \
  ~/data/gene-explorer/refGene.exonAA.fa.gz ./out
```

### Keying by symbol

`knownCanonical` (hg38, mm39) is one canonical transcript per gene
(Ensembl-keyed, `ENST`/`ENSMUST`), so there is no per-gene filtering to do.
**kgXref** maps each transcript to its **gene symbol** (col 5); the index is
keyed by that symbol — the exact thing the page resolves from mygene.info, and
unique per gene — so the lookup is an exact name match with no coordinate
overlap. We key on the symbol rather than the RefSeq `NM_` because kgXref's mRNA
column is unreliable: e.g. TP53's canonical `ENST00000269305` maps to the
non-coding `NR_176326`, so `NM_`-keying silently drops TP53. If two transcripts
ever share a symbol the build keeps the first and logs the rest, so a name can
never silently return the wrong gene.

`refGene`, `ncbiRefSeq` and `ensGene` (dm6, ce11) list **every isoform**, so the
build picks one per symbol: the transcript with the longest reference row,
preferring a placement on a primary sequence, first seen on a tie. It chooses
among the transcripts the alignment actually holds — the xref table is live and
the exonAA a snapshot, so ids retire between the two: a tenth of ce11's aligned
transcripts (every daf-16 isoform among them) carry an `NM_` refGene no longer
lists. Those take their symbol from the refGene coding span that overlaps them
most on the same strand, which adds ~1,800 worm genes and ~40 fly genes the id
match alone would drop. That choice is why the exonAA is read twice: a first
pass over the headers picks the transcripts and counts each one's runs of
records, since isoforms sharing exons have their exon groups interleaved in
refGene sets and a transcript's block can only close after its last run. Only
the chosen transcript maps to a symbol; the other isoforms fall out as "no
symbol" rather than as duplicates. Symbols are the table's own (`Nuak1`, `Antp`,
`lin-12`), case-exact.

### Sequence names

hg38's `.cds` keeps UCSC's `chr17`; the website strips `chr` to reach the hosted
assembly's canonical name. Every other assembly is displayed on its GenArk hub,
whose 2bit names sequences by RefSeq accession (`NC_000077.7`, `NT_033777.3`),
so the build maps each UCSC name through the hub's `chromAlias.txt` and writes
the accession. A `chrY_DS485423v1_random` contig resolves through the GenBank
accession embedded in its name. Names the alias table cannot place stay as-is
and are counted in a warning.

Tree leaf names are the row names the viewer joins on. UCSC spells an
accession-named assembly `GCF_003668045v3` in the tree and `GCF_003668045.3` in
the exonAA headers; rows take the tree's spelling. Species names with
underscores (`C_sp38_MB_2015`) parse because the header parser anchors on the
reference db rather than counting underscores.

## Outputs

The `.gzi`/`.idx`/`.cds` are found by appending to the `.fa.gz` uri, cf.
JBrowse's bam/bai shorthand. For hg38 the names are exactly what is hosted
today; other assemblies follow the same pattern with `<db>.<set>.multiz<N>way`.

- `<db>.<set>.multiz<N>way.aa.fa.gz` — bgzip of concatenated per-transcript
  FASTA blocks. One block = `>hg38\nSEQ\n>panTro4\nSEQ\n...` (reference first;
  UCSC `db` names = the alignment rows and the species-tree leaves). A species
  missing an exon is gap-filled so every row stays column-aligned.
- `<db>.<set>.multiz<N>way.aa.fa.gz.gzi` — the `bgzip -i` index.
- `<db>.<set>.multiz<N>way.aa.fa.gz.idx` — TSV
  `SYMBOL <TAB> offset <TAB> length`: the uncompressed byte offset + length of
  each block. ~1 MB for hg38, fetched once by the browser, then random-read by
  name.
- `<db>.<set>.multiz<N>way.aa.fa.gz.cds` — TSV
  `SYMBOL <TAB> transcript <TAB> refName <TAB> strand <TAB> start:end:phase,…`:
  the reference row's CDS model (0-based interbase, genomic-ascending; phase
  recomputed from cumulative coding length, the GFF3 definition). The whole CDS
  spans of a gene sum to `3 × (its reference alignment-row length)`, so a
  feature built from it shares the alignment's coordinate space exactly; the
  build counts the genes where that fails and reports them. ~2 MB for hg38,
  fetched once.
- `<db>.multiz<N>way.nh` — the species tree.

### How it works

The exonAA FASTA has one record per (transcript, species, exon); records for a
transcript are consecutive. The build streams it (never loading the whole file
into memory), groups by transcript, and for each species concatenates its exons
in order into one aligned protein (reference first). Each transcript's block is
written to a plain `.fa` while recording its uncompressed byte offset + length
in the `.idx`; the `.fa` is then `bgzip -i`'d in one pass. A browser reads the
`.idx`, looks up a gene symbol, and `BgzfFilehandle.read(length, offset)`s just
that block.

### Testing on a slice

You do not need the full download to test the pipeline. Grab a prefix, keep
whole transcripts, and run the build on it (the xref table and tree are still
fetched in full — they are small):

```sh
curl -s -r 0-400000 \
  "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz" \
  | gunzip -c 2>/dev/null > head.fa            # truncated tail is fine
gzip -c head.fa > slice.fa.gz                  # a file, not a pipe: it is read twice
node scripts/gene-explorer/build-data.mjs slice.fa.gz ./out
```

The same works for any assembly with its own exonAA URL and `--assembly=`. A
truncated tail shows up as one unparseable header and, when the cut lands
mid-sequence, one CDS/row length mismatch for the last gene — both vanish on the
full file.

## Host

The outputs go on the JBrowse demos bucket, one directory per alignment (the
website's `MSA_BASE` points at the hg38 one):

```sh
# hg38 (hosted today)
aws s3 cp out/hg38.knownCanonical.multiz100way.aa.fa.gz \
  s3://jbrowse.org/demos/msaview/100way/ --content-type application/octet-stream
aws s3 cp out/hg38.knownCanonical.multiz100way.aa.fa.gz.gzi \
  s3://jbrowse.org/demos/msaview/100way/ --content-type application/octet-stream
aws s3 cp out/hg38.knownCanonical.multiz100way.aa.fa.gz.idx \
  s3://jbrowse.org/demos/msaview/100way/ --content-type text/plain
aws s3 cp out/hg38.knownCanonical.multiz100way.aa.fa.gz.cds \
  s3://jbrowse.org/demos/msaview/100way/ --content-type text/plain
aws s3 cp out/hg38.multiz100way.nh \
  s3://jbrowse.org/demos/msaview/100way/ --content-type text/plain

# any other assembly: <db>-<N>way/, same five files
for f in dm6.refGene.multiz27way.aa.fa.gz dm6.refGene.multiz27way.aa.fa.gz.gzi; do
  aws s3 cp out/$f s3://jbrowse.org/demos/msaview/dm6-27way/ --content-type application/octet-stream
done
for f in dm6.refGene.multiz27way.aa.fa.gz.idx dm6.refGene.multiz27way.aa.fa.gz.cds dm6.multiz27way.nh; do
  aws s3 cp out/$f s3://jbrowse.org/demos/msaview/dm6-27way/ --content-type text/plain
done
```

Wiring a hosted assembly into the website is described in
[multi-assembly alignments](../../agent-docs/ideas/multi-assembly-alignments.md).

## Deploy checklist

- **Data**: the five files per alignment (done by the `aws s3 cp` commands).
- **Plugin**: `jbrowse-plugin-msaview` ≥ 2.6.1 adds the indexed-MSA launch path
  (`msaIndexedLocation` + `msaName` → `BgzfFilehandle.read` by name); ≥ 2.8.2
  resolves `orthologParams` from a session snapshot, which is how non-human
  sessions get their alignment. `…/latest/dist/…` serves both.
- **Config**: `packages/app/public/data/jbrowse-msa-combined-config.json`
  (already carries the `hg38-ncbiRefSeqSelect` track and the `Protein3d` +
  `MsaView` plugins) deploys with the `/demo` app.

The collapsed-intron gene view (the headline feature) works against the
already-published plugin today — it is just a LinearGenomeView with a
space-separated `loc`. Only the connected alignment + structure need the items
above.
