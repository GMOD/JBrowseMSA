#!/usr/bin/env node

import { parseArgs } from 'node:util'

import { runInterProScan } from './interproscan-msa'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    output: {
      type: 'string',
      short: 'o',
      default: 'domains.gff',
    },
    local: {
      type: 'boolean',
      default: false,
    },
    'interproscan-path': {
      type: 'string',
      default: 'interproscan.sh',
    },
    programs: {
      type: 'string',
      default: 'Pfam',
    },
    email: {
      type: 'string',
      default: 'user@example.com',
    },
    'batch-size': {
      type: 'string',
      default: '30',
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
  react-msaview-cli interproscan <input-msa> [options]

COMMANDS:
  interproscan    Run InterProScan on all sequences in an MSA file

OPTIONS:
  -o, --output <file>           Output GFF file (default: domains.gff)
  --local                       Use local InterProScan installation
  --interproscan-path <path>    Path to interproscan.sh (default: interproscan.sh)
  --programs <list>             Comma-separated list of programs (default: Pfam)
  --email <email>               Email for EBI API (default: user@example.com)
  --batch-size <n>              Number of sequences per API batch (default: 30)
  -h, --help                    Show this help message

EXAMPLES:
  # Run InterProScan using EBI API
  react-msaview-cli interproscan alignment.fasta -o domains.gff

  # Run with local InterProScan
  react-msaview-cli interproscan alignment.fasta -o domains.gff --local

  # Specify programs
  react-msaview-cli interproscan alignment.clustal -o domains.gff --programs Pfam,SMART
`)
}

async function main() {
  if (values.help || positionals.length === 0) {
    printHelp()
    process.exit(0)
  }

  const command = positionals[0]

  if (command === 'interproscan') {
    const inputFile = positionals[1]
    if (!inputFile) {
      console.error('Error: Input MSA file is required')
      process.exit(1)
    }

    await runInterProScan({
      inputFile,
      outputFile: values.output,
      useLocal: values.local,
      interproscanPath: values['interproscan-path'],
      programs: values.programs.split(','),
      email: values.email,
      batchSize: Number.parseInt(values['batch-size'], 10),
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
