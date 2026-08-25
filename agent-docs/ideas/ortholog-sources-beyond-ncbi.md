# Ortholog sources beyond NCBI

The gene explorer's "Build cross-species alignment"
(`website/src/lib/orthologMsa.ts`) and the msaview plugin's `orthologParams`
launch both take their ortholog set from NCBI Datasets, whose sets are
vertebrate- and insect-scoped. Measured on 2026-08-25: human TP53 → 658
orthologs; fly Antp → 108, all insects; yeast CDC28 → 3, all yeast. Four of the
seven species the page offers (yeast, worm, fly in practice, Arabidopsis) can
therefore never build an alignment. This note measures the alternatives and
picks one. A prototype of the pick lives in
`website/src/lib/orthologs/panther.ts`.

## Measurements

Every probe ran from a dev box on 2026-08-25 with `Origin: https://gmod.org`
set, since the page is a static site with no proxy: a source without
`access-control-allow-origin: *` (ACAO) is unusable. Coverage means the seven
explorer species: human 9606, mouse 10090, zebrafish 7955, fly 7227, worm 6239,
yeast 559292, Arabidopsis 3702.

| Source                      | Input                         | Probe (status, wall time, bytes)                                                                                                                                                                                                                                                 | ACAO | Coverage                                                                                                                                      | Returns                                                                                                                    |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| NCBI Datasets (today)       | GeneID                        | `gene/id/850364/orthologs` 200, ~1 s; 3 rows, all yeast                                                                                                                                                                                                                          | `*`  | vertebrates + insects only                                                                                                                    | gene ids; sequences need `product_report` + `efetch`                                                                       |
| **PANTHER 19**              | symbol or UniProt acc + taxid | `ortholog/matchortho?geneInputList=CDC28&organism=559292&targetOrganism=…&orthologType=all` 200, 0.4–3.3 s, 1–9 KB; 29 target taxa in 1.1 s / 7 KB; `supportedgenomes` 200, 0.26 s, 32 KB                                                                                        | `*`  | all seven, 144 reference proteomes                                                                                                            | UniProt accession per target, flagged `LDO` (least diverged, its one-to-one pick) or `O`; sequences via UniProt, see below |
| UniProt `accessions` batch  | ≤100 accessions               | `uniprotkb/accessions?accessions=…&format=json` 200, 0.5–0.7 s, 2–6 KB                                                                                                                                                                                                           | `*`  | —                                                                                                                                             | sequences for the PANTHER rows                                                                                             |
| OMA (All.May2026, API 1.11) | UniProt accession             | `protein/P00546/orthologs/` 200, 6.5 s, 1.08 MB (1901 rows, 922 taxa); `protein/P02833/orthologs/` (Antp) 0.7 s, 76 rows, every one an insect; `protein/P17839/orthologs/` (AG) 1.0 s, 138 rows, every one a plant; `hog/…/members/` timed out at 60 s; `hog/…/msa/` 403         | `*`  | pairwise orthologs only: a many-to-many family (Hox, MADS-box) has no human/mouse/fly row at all                                              | entries without sequence; `POST protein/bulk_retrieve/` 0.7 s adds them                                                    |
| OrthoDB v12                 | UniProt accession → group id  | `search?query=P00546&level=2759` 200, 0.7 s; `fasta?id=…&species=9606,10090,…` 200, 0.5–0.75 s, 3–5 KB; `search?query=P17839` (AG) → no group                                                                                                                                    | `*`  | group granularity is the problem: CDC28's Eukaryota group holds no human gene, Antp's is a 7,639-gene "Homeobox protein" cluster, AG has none | FASTA straight from the API, paralogs mixed in                                                                             |
| Ensembl REST                | symbol + species name         | `genetree/member/symbol/saccharomyces_cerevisiae/CDC28?aligned=1` 200, **32.9 s**, 1.1 MB (`prune_taxon` had no effect); `genetree/…/arabidopsis_thaliana/AG` **503 after 53 s**; `homology/…/AG` 200, 6.5 s; `info/ping` 200, **35.2 s**; `rest.ensemblgenomes.org` unreachable | `*`  | all seven (plants now sit in the main REST host)                                                                                              | the only source returning an alignment and a tree in one call                                                              |
| EggNOG API 5                | NOG id                        | `nog_data/json/fasta/KOG0594` **500 after 31.9 s**                                                                                                                                                                                                                               | none | —                                                                                                                                             | rejected                                                                                                                   |
| InParanoiDB 9               | —                             | no HTTP API (`/api/` 404)                                                                                                                                                                                                                                                        | none | —                                                                                                                                             | rejected                                                                                                                   |
| UniRef50 cluster members    | accession                     | `uniprotkb/search?query=uniref_cluster_50:UniRef50_P00546` 0.5 s; every member a fungus, the seven-species filter returns 0                                                                                                                                                      | `*`  | a 50% cluster is narrower than an ortholog set                                                                                                | rejected                                                                                                                   |
| AlphaFold DB API            | accession                     | `api/prediction/P00546` 0.36 s                                                                                                                                                                                                                                                   | `*`  | structures only                                                                                                                               | not an ortholog source                                                                                                     |

Stability signals. PANTHER publishes a numbered release a year (19 today), has
run the same `services/oai` endpoints since 2019, and is the GO consortium's
enrichment backend; its docs sit behind a Cloudflare challenge, so the rate
limit is unpublished, and nothing above needed a key. OMA versions its API
(`api/version/`) and its data release, and the two slow calls above show it is
not immune to stalls. Ensembl's own
[status feed](https://www.ensembl.info/category/07-status/) records mirror
outages in January 2026 and a beta outage in June 2026, and the project is
mid-migration to a new platform; the 35 s ping and the 503 above are the user's
own experience, measured.

## Recommendation

Use PANTHER as the primary source and OMA as the fallback. PANTHER takes the
page's own inputs, a gene symbol and a taxon id, returns a UniProt accession per
target species in under a second, covers every species the page offers and 137
more, and its `LDO` flag is a defensible one-to-one pick where one exists.
Sequences come from one UniProt batch call. A gene PANTHER cannot map comes back
as `unmapped_ids`, and that is the case for OMA: it takes the UniProt accession
the page already has, and `protein/<acc>/orthologs/` plus `bulk_retrieve` gives
the same row shape, choosing per taxon the row with the best `rel_type` (`1:1` >
`1:n` > `m:1` > `m:n`) and lowest `distance`. OMA is second rather than first
because its pairwise sets drop whole clades for many-to-many families (Antp: 76
insects, no vertebrate), where PANTHER still lists 26 orthologs.

OrthoDB is not worth a slot. Its single `fasta` call is the most convenient
shape of any source, but the group level decides what comes back, and at the
level that spans yeast to human the groups are either families rather than
orthologs (Antp) or missing the reference species (CDC28, no human gene). A
narrower level fixes one query and breaks the next.

Ensembl is rejected on the numbers above, not on principle: it is the one source
that returns an alignment, and if the REST host were reliable it would make the
EBI Clustal Omega step disappear. It is worth re-measuring after the platform
migration finishes.

Neither PANTHER nor OMA returns an alignment, so the aligner stays: EBI Clustal
Omega on the website (`ebiAlign.ts`), `launchMSA` in the plugin.

## Where it belongs

The plugin is the better home. `doLaunchOrthologs.ts` already owns the query
row, the labels, the tree metadata and the aligner, and the website is heading
towards emitting `orthologParams` instead of building the alignment itself. The
seam is `fetchOrthologRows` in `src/utils/ncbiOrthologs.ts`, whose rows are
`{ label, taxId, geneId, protein, sequence, scientificName, commonName }`. A
`source: 'ncbi' | 'panther'` on `OrthologParams` (default `ncbi`, so every
existing link keeps its meaning) would pick the fetcher; the PANTHER fetcher
needs the symbol and taxon, which `geneCandidates[0]` and `taxId` already carry.
Two things differ per row: `geneId` is a UniProt accession rather than an NCBI
GeneID, and the `Accession` metadata that drives the CDD domain overlay
(`autoLoadProteinDomains`) is a RefSeq accession today. That fetcher
(`utils/ncbiDomains.ts`) reads Region features out of GenPept records pulled by
accession through `efetch`, which also serves Swiss-Prot accessions, so the
overlay probably survives; confirm on one TrEMBL accession before attaching
them.

## How to wire the prototype into the website

`website/src/lib/orthologs/panther.ts` exposes
`fetchOrthologProteins({ symbol, taxId, uniprotId?, taxa? })`, returning
`{ label, taxId, accession, sequence }[]` with the query species first. In
`orthologMsa.ts`, `buildOrthologMsa` would call it in place of
`fetchOrthologGenes` + `fetchRepresentativeProteins` + the `efetch` FASTA, then
hand the rows to `clustalOmega` as it does now. Two invariants to keep:

- The query row's sequence must stay `queryProtein`, the UniProt canonical
  sequence the 3D view aligns to, because `connectedFeature` maps genome
  coordinates through that row. Replace the first row's `sequence` with
  `queryProtein` rather than trusting the fetched one; they are the same
  accession, so the swap is a safety net, not a change.
- `querySeqName` must equal the first row's `label`, and every label must be a
  valid FASTA id that survives Clustal Omega unchanged. PANTHER's short common
  names (`human`, `fruit_fly`, `budding_yeast`) already are.

`DEFAULT_TAXA` in the module is fourteen PANTHER proteomes from human to
Dictyostelium, in display order; pass `taxa` to narrow it.
