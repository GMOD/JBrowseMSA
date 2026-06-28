# Gene explorer data

Backs the [Gene explorer](../../website/src/pages/gene-explorer.astro)
page: type any human gene → a connected JBrowse session with a **collapsed-intron**
gene view, its **100-way vertebrate protein alignment**, and the **AlphaFold
structure**.

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

The one thing that cannot be fetched live is the alignment: the UCSC 100-way
exon-amino-acid file is hundreds of MB. `build-data.mjs` reindexes it **once**
into a single bgzip file plus a tiny name index, so any gene's whole alignment
is one random read **by gene symbol** — no per-gene files, no coordinates, no
91 MB faidx.

## Build

```sh
# streams knownCanonical.multiz100way.exonAA.fa.gz from UCSC (~474 MB) and
# kgXref. Requires bgzip (htslib) on PATH. Writes to ./out by default.
node scripts/gene-explorer/build-data.mjs [exonAA-url] [outDir]
```

Prefer a **local copy** of the exonAA input to avoid re-downloading ~474 MB each
run (and to sidestep a harmless TLS socket-close the streamed fetch can emit
*after* all output is written):

```sh
mkdir -p ~/data/gene-explorer && cd ~/data/gene-explorer
curl -sLO https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz
node /path/to/scripts/gene-explorer/build-data.mjs \
  ~/data/gene-explorer/knownCanonical.multiz100way.exonAA.fa.gz ./out
```

`knownCanonical` is one canonical transcript per gene (Ensembl-keyed, `ENST`),
so there is no per-gene filtering to do. **kgXref** maps each `ENST` to its
**gene symbol** (col 5); the index is keyed by that symbol — the exact thing the
page resolves from mygene.info, and unique per gene — so the lookup is an exact
name match with no coordinate overlap. We key on the symbol rather than the
RefSeq `NM_` because kgXref's mRNA column is unreliable: e.g. TP53's canonical
`ENST00000269305` maps to the non-coding `NR_176326`, so `NM_`-keying silently
drops TP53. If two `ENST`s ever share a symbol the build keeps the first and
logs the rest, so a name can never silently return the wrong gene.

Outputs (the `.gzi`/`.idx` are found by appending to the `.fa.gz` uri, cf.
JBrowse's bam/bai shorthand):

- `hg38.knownCanonical.multiz100way.aa.fa.gz` — bgzip of concatenated
  per-transcript FASTA blocks. One block = `>hg38\nSEQ\n>panTro4\nSEQ\n...`
  (hg38 first; UCSC `db` names = the alignment rows and the species-tree leaves).
  A species missing an exon is gap-filled so every row stays column-aligned.
- `hg38.knownCanonical.multiz100way.aa.fa.gz.gzi` — the `bgzip -i` index.
- `hg38.knownCanonical.multiz100way.aa.fa.gz.idx` — TSV `SYMBOL <TAB> offset
  <TAB> length`: the uncompressed byte offset + length of each block. ~1 MB,
  fetched once by the browser, then random-read by name.
- `hg38.knownCanonical.multiz100way.aa.fa.gz.cds` — TSV `SYMBOL <TAB> ENST <TAB>
  refName <TAB> strand <TAB> start:end:phase,…`: the hg38 row's knownCanonical
  CDS model (0-based interbase, genomic-ascending; phase recomputed from
  cumulative coding length, the GFF3 definition). The whole CDS spans of a gene
  sum to `3 × (its hg38 alignment-row length)`, so a feature built from it shares
  the alignment's coordinate space exactly. ~2 MB, fetched once.
- `hg38.multiz100way.nh` — the 100-way species tree.

### How it works

The exonAA FASTA has one record per (transcript, species, exon); records for a
transcript are consecutive. The build streams it (never loading the whole file
into memory), groups by transcript, and for each species concatenates its exons
in order into one aligned protein (hg38 first). Each transcript's block is
written to a plain `.fa` while recording its uncompressed byte offset + length
in the `.idx`; the `.fa` is then `bgzip -i`'d in one pass. A browser reads the
`.idx`, looks up a gene's `NM_`, and `BgzfFilehandle.read(length, offset)`s just
that block.

### Testing on a slice

You do not need the full download to test the pipeline. Grab a prefix, keep
whole transcripts, and run the build on it (kgXref is still fetched in full —
it is small):

```sh
curl -s -r 0-400000 \
  "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way/alignments/knownCanonical.multiz100way.exonAA.fa.gz" \
  | gunzip -c 2>/dev/null > head.fa            # truncated tail is fine
node scripts/gene-explorer/build-data.mjs <(gzip -c head.fa) ./out
```

## Host

The four outputs go on the JBrowse demos bucket (the URL `MSA_BASE` in
`website/src/lib/geneExplorer.ts` points at):

```sh
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
```

## Deploy checklist

- **Data**: the four files above (done by the `aws s3 cp` commands).
- **Plugin**: `jbrowse-plugin-msaview` ≥ 2.6.1 adds the indexed-MSA launch path
  (`msaIndexedLocation` + `msaName` → `BgzfFilehandle.read` by name) so
  `…/latest/dist/…` serves it.
- **Config**: `packages/app/public/data/jbrowse-msa-combined-config.json`
  (already carries the `hg38-ncbiRefSeqSelect` track and the `Protein3d` +
  `MsaView` plugins) deploys with the `/demo` app.

The collapsed-intron gene view (the headline feature) works against the
already-published plugin today — it is just a LinearGenomeView with a
space-separated `loc`. Only the connected alignment + structure need the items
above.
