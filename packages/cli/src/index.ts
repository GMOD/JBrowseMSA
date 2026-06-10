#!/usr/bin/env node

import { parseArgs } from 'node:util'

import { exportSvg } from './export-svg.ts'
import { runInterProScan } from './interproscan-msa.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    output: {
      type: 'string',
      short: 'o',
      default: 'domains.gff',
    },
    msa: {
      type: 'string',
    },
    tree: {
      type: 'string',
    },
    gff: {
      type: 'string',
    },
    'color-scheme': {
      type: 'string',
      default: 'maeditor',
    },
    width: {
      type: 'string',
      default: '1200',
    },
    height: {
      type: 'string',
      default: '600',
    },
    'tree-area-width': {
      type: 'string',
    },
    local: {
      type: 'boolean',
      default: false,
    },
    docker: {
      type: 'boolean',
      default: false,
    },
    singularity: {
      type: 'boolean',
      default: false,
    },
    'singularity-image': {
      type: 'string',
      default: 'docker://interpro/interproscan:latest',
    },
    'interproscan-path': {
      type: 'string',
      default: 'interproscan.sh',
    },
    programs: {
      type: 'string',
      default: 'PfamA,CDD',
    },
    email: {
      type: 'string',
      default: 'user@example.com',
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
  },
})

function printHelp() {
  console.log(`
react-msaview-cli - CLI tools for react-msaview

USAGE:
  react-msaview-cli <command> [options]

COMMANDS:
  interproscan    Run InterProScan on all sequences in an MSA file
  export-svg      Export alignment as SVG (no browser required)

OPTIONS (interproscan):
  -o, --output <file>           Output GFF file (default: domains.gff)
  --local                       Use local InterProScan installation
  --docker                      Use Docker (interpro/interproscan image)
  --singularity                 Use Singularity/Apptainer container
  --singularity-image <image>   Singularity image (default: docker://interpro/interproscan:latest)
  --interproscan-path <path>    Path to interproscan.sh (default: interproscan.sh)
  --programs <list>             Comma-separated list of programs (default: PfamA,CDD)
  --email <email>               Email for EBI API (default: user@example.com)

OPTIONS (export-svg):
  --msa <file>                  MSA file (FASTA, Stockholm, or Clustal) [required]
  --tree <file>                 Newick tree file (optional)
  --gff <file>                  InterProScan domain GFF file (optional)
  -o, --output <file>           Output SVG file (default: alignment.svg)
  --color-scheme <name>         Color scheme (default: maeditor)
  --width <px>                  Canvas width in pixels (default: 1200)
  --height <px>                 Canvas height in pixels (default: 600)
  --tree-area-width <px>        Tree panel width in pixels (optional)

  -h, --help                    Show this help message

EXAMPLES:
  react-msaview-cli export-svg --msa alignment.fasta -o alignment.svg
  react-msaview-cli export-svg --msa alignment.fasta --tree tree.nwk -o alignment.svg
  react-msaview-cli export-svg --msa alignment.fasta --gff domains.gff --color-scheme clustalx_protein_dynamic -o alignment.svg

  react-msaview-cli interproscan alignment.fasta -o domains.gff
  react-msaview-cli interproscan alignment.fasta -o domains.gff --docker
  react-msaview-cli interproscan alignment.fasta -o domains.gff --local
`)
}

async function main() {
  if (values.help || positionals.length === 0) {
    printHelp()
    process.exit(0)
  }

  const command = positionals[0]

  if (command === 'export-svg') {
    const msaFile = values['msa']
    if (!msaFile) {
      console.error('Error: --msa <file> is required')
      process.exit(1)
    }
    const outputFile = values.output === 'domains.gff' ? 'alignment.svg' : values.output!
    await exportSvg({
      msaFile,
      treeFile: values['tree'],
      gffFile: values['gff'],
      outputFile,
      colorScheme: values['color-scheme']!,
      width: parseInt(values['width']!, 10),
      height: parseInt(values['height']!, 10),
      treeAreaWidth: values['tree-area-width'] !== undefined
        ? parseInt(values['tree-area-width']!, 10)
        : undefined,
    })
    console.log(`wrote ${outputFile}`)
  } else if (command === 'interproscan') {
    const inputFile = positionals[1]
    if (!inputFile) {
      console.error('Error: Input MSA file is required')
      process.exit(1)
    }

    await runInterProScan({
      inputFile,
      outputFile: values.output,
      useLocal: values.local,
      useDocker: values.docker,
      useSingularity: values.singularity,
      singularityImage: values['singularity-image'],
      interproscanPath: values['interproscan-path'],
      programs: values.programs.split(','),
      email: values.email,
    })
  } else {
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error)
  process.exit(1)
})
