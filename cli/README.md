# @react-msaview/cli

Command-line tools for react-msaview, including batch InterProScan processing
for multiple sequence alignments.

## Installation

```bash
# From the monorepo root
pnpm install
pnpm --filter @react-msaview/cli build

# Or install globally (after publishing)
npm install -g @react-msaview/cli
```

## Commands

### interproscan

Run InterProScan on all sequences in an MSA file and output results as GFF3.

```bash
react-msaview-cli interproscan <input-msa> [options]
```

#### Options

| Option                       | Description                                            | Default            |
| ---------------------------- | ------------------------------------------------------ | ------------------ |
| `-o, --output <file>`        | Output GFF file path                                   | `domains.gff`      |
| `--local`                    | Use local InterProScan installation instead of EBI API | `false`            |
| `--interproscan-path <path>` | Path to local interproscan.sh                          | `interproscan.sh`  |
| `--programs <list>`          | Comma-separated list of InterProScan programs          | `Pfam`             |
| `--email <email>`            | Email for EBI API (required for EBI API usage)         | `user@example.com` |
| `--batch-size <n>`           | Number of sequences per API batch                      | `30`               |
| `-h, --help`                 | Show help message                                      |                    |

#### Supported MSA Formats

The CLI automatically detects the input format:

- **FASTA** (`.fasta`, `.fa`, `.faa`)
- **Clustal** (`.clustal`, `.aln`)
- **Stockholm** (`.sto`, `.stockholm`)
- **A3M** (`.a3m`) - AlphaFold/ColabFold format
- **EMF** (`.emf`) - Ensembl Multi Format

#### Available InterProScan Programs

When using `--programs`, you can specify any combination of:

- `Pfam` - Protein families (default)
- `SMART` - Simple Modular Architecture Research Tool
- `SUPERFAMILY` - Structural and functional annotation
- `Gene3D` - Structural domain assignments
- `CDD` - Conserved Domain Database
- `PANTHER` - Protein Analysis Through Evolutionary Relationships
- `TIGRFAM` - TIGR protein families
- `Hamap` - High-quality Automated Annotation of Microbial Proteomes
- `ProSiteProfiles` - PROSITE profiles
- `ProSitePatterns` - PROSITE patterns
- `PRINTS` - Protein fingerprints
- `PIRSF` - PIR SuperFamily
- `MobiDBLite` - Disorder prediction

## Examples

### Using EBI API (recommended for small datasets)

```bash
# Basic usage - runs Pfam analysis
react-msaview-cli interproscan alignment.fasta -o domains.gff --email your@email.com

# Multiple programs
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --programs Pfam,SMART,Gene3D \
  --email your@email.com

# Smaller batch size for large sequences
react-msaview-cli interproscan large_proteins.fasta -o domains.gff \
  --batch-size 10 \
  --email your@email.com
```

### Using Local InterProScan

For large datasets or frequent usage, install InterProScan locally:

```bash
# With interproscan.sh in PATH
react-msaview-cli interproscan alignment.fasta -o domains.gff --local

# With custom path
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --local \
  --interproscan-path /opt/interproscan/interproscan.sh

# With specific programs
react-msaview-cli interproscan alignment.fasta -o domains.gff \
  --local \
  --programs Pfam,SMART
```

### Different Input Formats

```bash
# Clustal format
react-msaview-cli interproscan alignment.clustal -o domains.gff

# Stockholm format
react-msaview-cli interproscan PF00001.stockholm -o domains.gff

# A3M format (from ColabFold/AlphaFold)
react-msaview-cli interproscan colabfold.a3m -o domains.gff
```

## Output Format

The output is standard GFF3 format compatible with react-msaview:

```gff
##gff-version 3
seq1	InterProScan	protein_match	10	150	.	.	.	Name=PF00001;signature_desc=7tm_1;description=7 transmembrane receptor (rhodopsin family)
seq1	InterProScan	protein_match	200	350	.	.	.	Name=PF00002;signature_desc=7tm_2;description=7 transmembrane receptor (Secretin family)
seq2	InterProScan	protein_match	5	120	.	.	.	Name=PF00001;signature_desc=7tm_1;description=7 transmembrane receptor (rhodopsin family)
```

## Loading Results in react-msaview

After generating the GFF file, you can load it in react-msaview:

1. Open your MSA file in react-msaview
2. Go to **Menu > Open domains...**
3. Select the generated GFF file
4. Domains will appear as colored boxes on the alignment

## Troubleshooting

### EBI API Timeout

If you get timeout errors with the EBI API:

- Reduce `--batch-size` (try 10-20 for large proteins)
- Use `--local` with a local InterProScan installation
- Check your internet connection

### Local InterProScan Not Found

```
Error: Failed to run InterProScan: spawn interproscan.sh ENOENT
```

Make sure InterProScan is installed and specify the full path:

```bash
--interproscan-path /full/path/to/interproscan-5.xx/interproscan.sh
```

### No Results in Output

- Check that your sequences are protein sequences (not nucleotide)
- Try different programs (some may not have hits for your sequences)
- Verify the input file is valid MSA format

## API Rate Limits

The EBI InterProScan API has usage limits:

- Maximum ~30 sequences per request (configurable via `--batch-size`)
- Requests are processed sequentially to avoid overwhelming the server
- For large datasets (>100 sequences), consider using local InterProScan

## License

MIT
