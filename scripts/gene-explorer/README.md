# Gene explorer data

Backs the [Gene explorer](../../packages/website/src/pages/gene-explorer.astro)
page: type any human gene → a connected JBrowse session with a **collapsed-intron**
gene view, its **100-way vertebrate protein alignment**, and the **AlphaFold
structure**.

Almost everything is computed live in the browser from public CORS services, so
there is nothing per-gene to host:

- **mygene.info** — gene symbol → hg38 locus + UniProt accession (+ type-ahead)
- **UCSC RefSeq Select GFF** — the canonical (MANE) transcript's exon/CDS model,
  pulled by locus with tabix and parsed in the browser (`msa-parsers`'
  `parseGFF`). The space-separated exon ranges become the LinearGenomeView
  `loc`, which is how you collapse introns declaratively — each range is one
  displayed region, rendered back-to-back.
- **AlphaFold** — the structure, by UniProt accession.

The one thing that cannot be fetched live is the alignment: the UCSC 100-way
exon-amino-acid file is ~3.6 GB. `build-data.mjs` reindexes it **once** into a
single tabix file keyed by genomic locus, so any gene's whole alignment is one
range request.

## Build

```sh
# streams ncbiRefSeq.multiz100way.exonAA.fa.gz straight from UCSC (~3.6 GB),
# writes to packages/app/public/data/. Requires bgzip + tabix on PATH.
node scripts/gene-explorer/build-data.mjs
```

Outputs (served at `gmod.org/JBrowseMSA/demo/data`):

- `hg38.ncbiRefSeq.multiz100way.aa.txt.gz` (+`.csi`) — bgzip + tabix. One line
  per transcript: `chrom  start  end  transcriptId  packed`, where `packed` is
  `db:ALIGNEDSEQ;db:ALIGNEDSEQ;...` (hg38 first; UCSC `db` names = the alignment
  rows and the species-tree leaves). A species missing an exon is gap-filled so
  every row stays column-aligned.
- `hg38.multiz100way.nh` — the 100-way species tree.

### How it works

The exonAA FASTA has one record per (transcript, species, exon); records for a
transcript are consecutive. The build streams it (never loading the 3.6 GB into
memory), groups by transcript, and for each species concatenates its exons in
order into one aligned protein. The **hg38** row's header carries the hg38
genomic coordinates of each exon, so the transcript's locus comes straight from
the data — no separate coordinate file. Lines are sorted, bgzipped, and tabixed.

### Testing on a slice

You do not need the full download to test the pipeline. Grab a prefix, keep
whole transcripts, and run the build on it:

```sh
curl -s -r 0-300000 \
  "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/multiz100way/alignments/ncbiRefSeq.multiz100way.exonAA.fa.gz" \
  | gunzip -c 2>/dev/null > head.fa            # truncated tail is fine
node scripts/gene-explorer/build-data.mjs <(gzip -c head.fa) ./out
tabix ./out/hg38.ncbiRefSeq.multiz100way.aa.txt.gz chr1:201283702-201328836
```

## Deploy checklist

The page's "Open in JBrowse" link references the shared session config and the
published MsaView plugin, so the full three-view session needs:

- **Data**: upload the two build outputs to `gmod.org/JBrowseMSA/demo/data`.
- **Config**: deploy `packages/app/public/data/jbrowse-msa-combined-config.json`
  (already carries the `hg38-ncbiRefSeqSelect` track and the `Protein3d` +
  `MsaView` plugins). The currently-deployed copy is older.
- **Plugin**: publish `jbrowse-plugin-msaview` with the tabix-MSA launch path
  (`msaTabixLocation` + `msaId` → `getLines` at the connectedFeature's locus) so
  `…/latest/dist/…` serves it.

The collapsed-intron gene view (the headline feature) works against the
already-published plugin today — it is just a LinearGenomeView with a
space-separated `loc`. Only the connected alignment + structure need the items
above.
