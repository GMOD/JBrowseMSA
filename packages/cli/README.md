# react-msaview-cli

Annotate a multiple sequence alignment and render it to a publication figure,
from the command line, with no browser in the loop.

The CLI has two groups of commands, and the second draws what the first writes:

- **Annotate**: build a domain or exon GFF for an alignment, from InterPro's
  precomputed matches (`interpro`), a live InterProScan run (`interproscan`), or
  a RefSeq transcript's exon model (`genestructure`).
- **Render**: draw the alignment, its tree, and those annotations to a
  standalone SVG (`export-svg`). The command runs the web viewer's renderer
  headlessly, so the figure matches what the app shows.

## Prerequisites

- NodeJS v22+

`export-svg` and `interpro` need nothing else. `interproscan` needs a backend to
scan with: the EBI web API (the default, no install), Docker, Singularity, or a
local InterProScan (see [interproscan](#interproscan)).

`export-svg` draws the alignment background as one embedded image when
[@napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas) is present. The
package is an optional dependency with prebuilt binaries, so a normal install
brings it in. On a platform with no prebuilt binary, the export draws a
rectangle per cell, which makes a much larger file and runs slower on big
alignments.

## Setup

```bash
npm install -g react-msaview-cli
```

From a clone of the monorepo instead:

```bash
pnpm install
pnpm --filter react-msaview-cli build
```

## Quickstart

An Src-family kinase alignment with its tree and Pfam domains, rendered in two
commands. The first asks InterPro for the domains of each row; the second draws
the figure.

```bash
react-msaview-cli interpro accessions.tsv -o domains.gff

react-msaview-cli export-svg --msa kinases.aln --tree kinases.nwk \
  --gff domains.gff --col-width 1.6 --row-height 14 --tree-area-width 200 \
  -o kinases.svg
```

![Src-family kinases: tree, SH3/SH2/kinase domain architecture, and the color key](../../docs/media/cli-domains.png)

The domain architecture reads straight down the alignment: SH3, then SH2, then
the catalytic domain. The renderer draws every row in the alignment's column
space, so each domain lands in the same columns in every row. The key on the
right lists the domains present in the GFF.

Every figure on this page is `export-svg` output, drawn from the Src-kinase and
GPCR examples in
[packages/examples](https://github.com/GMOD/JBrowseMSA/tree/main/packages/examples/data).

## Rendering figures

```bash
react-msaview-cli export-svg --msa <file> [options]
```

| Option                   | Description                                    | Default         |
| ------------------------ | ---------------------------------------------- | --------------- |
| `--msa <file>`           | MSA file (FASTA, Stockholm, Clustal, A3M, EMF) | _required_      |
| `--tree <file>`          | Newick tree file                               |                 |
| `--gff <file>`           | Domain or exon GFF (from the commands below)   |                 |
| `-o, --output <file>`    | Output SVG file path                           | `alignment.svg` |
| `--color-scheme <name>`  | Color scheme                                   | `maeditor`      |
| `--col-width <px>`       | Width of one alignment column                  | `12`            |
| `--row-height <px>`      | Height of one alignment row                    | `16`            |
| `--width <px>`           | Viewport width, which sets the tree area       | `1200`          |
| `--height <px>`          | Viewport height                                | `600`           |
| `--tree-area-width <px>` | Tree panel width in pixels                     |                 |
| `--format <name>`        | Force the MSA format instead of sniffing it    |                 |
| `--tracks <list>`        | Tracks to draw above the alignment, by id      | none            |
| `--viewport`             | Draw the viewport instead of the whole thing   |                 |
| `--minimap`              | Include the minimap bar (`--viewport` only)    |                 |

### Tracks

`--tracks` names the tracks to draw above the alignment, by id, or `all` for
every one this alignment has: `conservation`, `property-conservation` (protein
only), `sequence-logo`, `position-ruler`, `base-pairs` (a Stockholm `SS_cons`
line), and any track ids the file itself carries. The CLI reports a name that
matches no track.

```bash
react-msaview-cli export-svg --msa kinases.aln --tracks conservation,position-ruler \
  -o kinases.svg
```

### Sizing the figure

`export-svg` draws the **entire** alignment unless `--viewport` asks for the
`--width` x `--height` window at the top left, so the output is normally as wide
as the alignment is long. `--width` and `--height` size the viewport the model
lays out in, not the figure. `--col-width` and `--row-height` scale the figure:

```bash
## a 90-column alignment at the default 12px columns: letters are legible
react-msaview-cli export-svg --msa gpcrs.fa -o gpcrs.svg
```

![Four GPCR rows with residue letters and a Pfam domain box](../../docs/media/cli-letters.png)

```bash
## an 856-column alignment at 1.4px columns: an overview, no letters
react-msaview-cli export-svg --msa kinases.aln --tree kinases.nwk \
  --col-width 1.4 --row-height 16 --tree-area-width 280 -o overview.svg
```

![The same kinase family drawn as a colored overview beside its tree](../../docs/media/cli-quickstart.png)

Residue letters draw only in columns at least 5px wide and wider than half the
row height, and in rows at least 8px tall. The app applies the same rule as you
zoom out. Below that size the figure is the colored overview above, which
usually suits a whole-alignment figure: at that scale the conserved blocks and
gaps are visible, and letters would be too small to read.

### Color schemes

```bash
react-msaview-cli export-svg --msa gpcrs.fa \
  --color-scheme clustalx_protein_dynamic -o gpcrs.svg
```

![The same GPCR rows under the ClustalX scheme](../../docs/media/cli-clustalx.png)

`maeditor` (the default), `clustal`, `clustalx_protein`, `lesk`, `flower`,
`cinema`, and the `jalview_*` family (`jalview_zappo`, `jalview_taylor`,
`jalview_hydrophobicity`, `jalview_buried`, `jalview_prophelix`,
`jalview_propstrand`, `jalview_propturn`) color each residue by identity. The
two `_dynamic` schemes, `clustalx_protein_dynamic` and
`percent_identity_dynamic`, color each residue by the composition of its column,
so conserved columns stand out by color. `nucleotide`, `clustalx_dna`,
`jbrowse_dna` and `rainbow_dna` are for DNA; `none` turns background color off.

### Output

The SVG grows with the alignment: a 10-row by 856-column figure is about 700KB.
The background is one embedded image where @napi-rs/canvas is installed, and a
rectangle per cell where it is not. The letters, the tree and the annotations
are vector either way. To convert to PNG or PDF for a journal:

```bash
rsvg-convert -w 2000 alignment.svg -o alignment.png
inkscape alignment.svg --export-filename=alignment.pdf
```

The same input gives the same bytes, so CI can regenerate a figure and diff it.

## Annotating

### interpro

Build a domain GFF from InterPro's **precomputed** matches for UniProtKB
accessions. The EBI InterPro API already serves matches for every UniProtKB
sequence, so the lookup returns in seconds, gives the same result for a given
InterPro release, and needs no email or rate-limited job. Use this instead of
`interproscan` whenever your rows are UniProt accessions.

```bash
react-msaview-cli interpro <accessions.tsv> [options]
```

The input is one accession per line, optionally followed by a tab- or
space-separated row label. The command skips lines starting with `#`. It writes
through the same GFF writer as `interproscan`, and adds a `#` header line naming
the InterPro release the coordinates came from.

| Option                | Description                                     | Default       |
| --------------------- | ----------------------------------------------- | ------------- |
| `-o, --output <file>` | Output GFF file path                            | `domains.gff` |
| `--database <name>`   | InterPro member db to read                      | `pfam`        |
| `--msa <file>`        | Alignment to check the rows of (see below)      |               |
| `--format <name>`     | Force the `--msa` format instead of sniffing it |               |
| `--no-cache`          | Re-fetch, ignoring the disk cache               | off           |

InterPro computes matches on UniProt's canonical sequence, so on a row that is
an isoform or a fragment the matches land on the wrong residues. With `--msa`,
the CLI compares each row's ungapped length against the protein's and warns
about any that differ. It also warns about any accession with no matches.

```bash
react-msaview-cli interpro accessions.tsv -o domains.gff
react-msaview-cli interpro accessions.tsv -o domains.gff --database cdd
```

#### Caching

The InterPro API serves one protein per request and has no batch endpoint, so a
run makes one request per distinct accession. The CLI caches every response on
disk under `$XDG_CACHE_HOME/react-msaview-cli/interpro` (override with
`REACT_MSAVIEW_CACHE`), keyed by InterPro release, so a new release fetches
fresh coordinates. The cache also records proteins with no matches, so a re-run
does not fetch them again.

A re-run of the same dataset makes one request, the release lookup, and reads
the rest from disk. A failed run can therefore resume. The CLI retries with
backoff, and if the API stays unreachable, the accessions it already fetched
stay cached, so the next run fetches only the rest.

### interproscan

Run InterProScan on all sequences in an MSA file and output results as GFF3. Use
this when the rows are not UniProt accessions: a de novo assembly, predicted
proteins, or anything else InterPro has not scanned.

```bash
react-msaview-cli interproscan <input-msa> [options]
```

| Option                       | Description                                            | Default                                     |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `-o, --output <file>`        | Output GFF file path                                   | `domains.gff`                               |
| `--local`                    | Use a local InterProScan installation instead of EBI   | `false`                                     |
| `--docker`                   | Run InterProScan via the `interpro/interproscan` image | `false`                                     |
| `--singularity`              | Run InterProScan via a Singularity/Apptainer container | `false`                                     |
| `--docker-image <img>`       | Docker image to run                                    | `interpro/interproscan:5.78-109.0`          |
| `--singularity-image <img>`  | Singularity image to use                               | `docker://interpro/interproscan:5.78-109.0` |
| `--interproscan-path <path>` | Path to local interproscan.sh                          | `interproscan.sh`                           |
| `--interproscan-data <dir>`  | Member database `data/` to mount into the container    |                                             |
| `--programs <list>`          | Comma-separated list of programs, in EBI API naming    | `PfamA,CDD`                                 |
| `--format <name>`            | Force the MSA format instead of sniffing it            |                                             |
| `--email <email>`            | Email for EBI API (used only for EBI API runs)         | `user@example.com`                          |

By default (no backend flag) the CLI submits sequences to the EBI InterProScan
REST API one at a time. `--local`, `--docker`, and `--singularity` run
InterProScan on the whole alignment locally, which is much faster for large
datasets.

#### Choosing a backend

```bash
## EBI web API: no install, one sequential submission per sequence
react-msaview-cli interproscan alignment.fasta -o domains.gff --email you@example.com

## Docker: no InterProScan install, whole alignment in one run
react-msaview-cli interproscan alignment.fasta -o domains.gff --docker

## a local install
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --local --interproscan-path /opt/interproscan/interproscan.sh

## Singularity/Apptainer, for HPC clusters without Docker
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --singularity --singularity-image /path/to/interproscan.sif
```

Docker mounts a temp directory into the `interpro/interproscan` container, runs
the scan on the whole alignment at once, and reads the JSON back out.

The published image carries InterProScan but **not** its member database data,
which is a separate multi-gigabyte download. Fetch and unpack the matching
release's `data/` directory (see the
[InterProScan docs](https://interproscan-docs.readthedocs.io/)) and point
`--interproscan-data` at it. Both container backends mount it at
`/opt/interproscan/data` and look for it there.

The EBI API has usage limits, so the CLI submits sequences one at a time. Past
about 100 sequences, use a local or container backend.

#### InterProScan programs

`--programs` takes the EBI API's names whichever backend runs: `PfamA` and `CDD`
(the default), `SMART`, `SuperFamily`, `Gene3d`, `PANTHER`, `TIGRFAM`, `HAMAP`,
`PrositeProfiles`, `PrositePatterns`, `PRINTS`, `PIRSF`, `MobiDBLite`, `Coils`,
`SFLD`. InterProScan 5 spells several of them differently (`Pfam`, not `PfamA`;
`NCBIfam`, which absorbed TIGRFAM; `Hamap`; `SUPERFAMILY`; `Gene3D`), and the
CLI passes the translated names to the local, Docker and Singularity backends.

```bash
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --programs PfamA,SMART,Gene3D --email you@example.com
```

### genestructure

Build a **gene-structure GFF** for a coding-sequence alignment from a RefSeq
transcript, overlaid the same way InterProScan domains are. The command fetches
the exon model from the NCBI Datasets v2 API and names each species' Nth exon
`exon-N`, so a given exon is the same color in every row and the exon
architecture reads straight down the alignment.

```bash
react-msaview-cli genestructure <input-msa> --gene <symbol> --ref <rowname> [options]
```

The command maps the chosen transcript's exon boundaries onto the reference
row's columns, then projects them into every other row's ungapped coordinates.
An exon that picks up a frameshifting indel in one lineage therefore gets
shorter on that row and stays in the same columns as the rest. The reference row
must be the transcript's coding sequence; the CLI warns if its length doesn't
match.

| Option                | Description                                   | Default             |
| --------------------- | --------------------------------------------- | ------------------- |
| `--gene <symbol>`     | Gene symbol to look up in RefSeq (e.g. `F12`) |                     |
| `--taxon <name\|id>`  | Taxon for `--gene`                            | `human`             |
| `--gene-id <id>`      | NCBI GeneID, instead of `--gene`              |                     |
| `--transcript <acc>`  | Specific transcript accession                 | MANE/RefSeq Select  |
| `--ref <rowname>`     | Reference row = the transcript's CDS          | first row           |
| `-o, --output <file>` | Output GFF file path                          | `genestructure.gff` |

```bash
## F12 coding alignment -> 14-exon overlay (MANE Select transcript, human row)
react-msaview-cli genestructure f12-cds.stock --gene F12 --ref human -o exons.gff

## pin a specific transcript
react-msaview-cli genestructure aln.fa --transcript NM_000505.4 --ref human
```

## Input formats

The CLI sniffs the format from the file's content, not from its name. `--format`
(`fasta`, `a3m`, `stockholm`, `clustal`, `emf`) overrides a wrong guess. FASTA
and A3M share a leading `>`, so the CLI tells them apart heuristically.

- **FASTA** (`.fasta`, `.fa`, `.faa`)
- **Clustal** (`.clustal`, `.aln`)
- **Stockholm** (`.sto`, `.stockholm`)
- **A3M** (`.a3m`), from AlphaFold/ColabFold
- **EMF** (`.emf`), Ensembl Multi Format

## Annotation output format

The annotation commands write standard GFF3, one line per feature:
`protein_match` for a domain from `interpro`/`interproscan`, `exon` for a
segment from `genestructure`. `start`/`end` are 1-based positions in the
**ungapped** sequence, and the attributes carry the accession, name, and
description:

```gff
##gff-version 3
seq1	InterProScan	protein_match	10	150	.	.	.	Name=PF00001;signature_desc=7tm_1;description=7 transmembrane receptor (rhodopsin family)
seq1	InterProScan	protein_match	200	350	.	.	.	Name=PF00002;signature_desc=7tm_2;description=7 transmembrane receptor (Secretin family)
seq2	InterProScan	protein_match	5	120	.	.	.	Name=PF00001;signature_desc=7tm_1;description=7 transmembrane receptor (rhodopsin family)
```

A worked run:

```console
$ react-msaview-cli interproscan gpcrs.fasta -o domains.gff --docker
Reading MSA from gpcrs.fasta...
Found 4 sequences
Processing 4 non-empty sequences...
  Running InterProScan via Docker on 4 sequences...
  docker run --rm -v /tmp/interproscan-Xyz12:/data -v /opt/interproscan-5.78-109.0/data:/opt/interproscan/data interpro/interproscan:5.78-109.0 -i /data/input.fasta -o /data/output.json -f JSON -appl Pfam,CDD
Converting results to GFF...
Writing output to domains.gff...
Done!
```

## Using the GFF elsewhere

The web viewer, the React component and the R package all load the file the CLI
writes.

In the web viewer, select it in the import form's **Annotation GFF file or URL**
field, or open it over a loaded alignment with **Annotations > Open annotation
file...**, which also accepts the JSON an InterProScan run returns.

In the React component, pass it inline as the `gff` prop:

```jsx
<MSAViewer msa={msaText} gff={domainsGff} />
```

From R:

```r
msaview(msa = "alignment.fasta", gff = "domains.gff")
```

## Troubleshooting

**EBI API timeout.** We measured one sequence waiting fifteen minutes in the
queue. The CLI waits an hour per job and keeps the results of the sequences that
finished. Use `--local`, `--docker`, or `--singularity` to run InterProScan
yourself; on large datasets they are much faster than the API.

**Local InterProScan not found.**

```
Error: Failed to run Local: spawn interproscan.sh ENOENT. Is interproscan.sh installed and on PATH?
```

Give the full path:
`--interproscan-path /full/path/to/interproscan-5.xx/interproscan.sh`

**No results in the output.** Check that the sequences are protein, not
nucleotide; try other `--programs`; verify the input parses as one of the
formats above.

**The exported figure is enormous.** `export-svg` draws the whole alignment at
`--col-width` per column. Lower `--col-width` until it fits. Below 5px, or below
half the row height, the residue letters stop drawing, and they account for most
of the file size.

## Uses

[msa-parsers](https://github.com/GMOD/JBrowseMSA/tree/main/packages/msa-parsers)
for file format support, and
[react-msaview](https://github.com/GMOD/JBrowseMSA/tree/main/packages/lib) for
rendering.

## License

MIT
