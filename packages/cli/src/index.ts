#!/usr/bin/env node

import * as fs from 'node:fs'
import { parseArgs } from 'node:util'

import { exportSvg } from './export-svg.ts'
import { runGeneStructure } from './genestructure.ts'
import { runInterProPrecomputed } from './interpro-precomputed.ts'
import { runInterProScan } from './interproscan-msa.ts'
import { isRecord } from './json.ts'
import {
  parseRowsTsv,
  parseStructure,
  runResidueMappings,
} from './residue-mappings.ts'
import { commandHelp, commands, isCommand, overviewHelp } from './usage.ts'

import type { MappingRow } from './residue-mappings.ts'
import type { MSAFormat } from 'msa-parsers'
import type { ParseArgsOptionsConfig } from 'node:util'

const MSA_FORMATS: MSAFormat[] = ['stockholm', 'a3m', 'fasta', 'emf', 'clustal']

function isMsaFormat(format: string): format is MSAFormat {
  return MSA_FORMATS.some(f => f === format)
}

function readFormat(format?: string) {
  if (format !== undefined && !isMsaFormat(format)) {
    throw new Error(
      `unknown --format ${format}; one of ${MSA_FORMATS.join(', ')}`,
    )
  }
  return format
}

function readNumber(name: string, value: string, integer = false) {
  const n = integer ? Number.parseInt(value, 10) : Number.parseFloat(value)
  if (Number.isNaN(n)) {
    throw new Error(`--${name} must be a number, got "${value}"`)
  }
  return n
}

function readOptional(name: string, value?: string, integer = false) {
  return value === undefined ? undefined : readNumber(name, value, integer)
}

function readList(value: string) {
  return value.split(',').map(s => s.trim())
}

function readMappingRows(values: {
  rows?: string
  row?: string
  accession?: string
  pdb?: string
  chain?: string
  alphafold: boolean
}): MappingRow[] {
  if (values.rows) {
    return parseRowsTsv(fs.readFileSync(values.rows, 'utf8'))
  }
  const { row, accession, pdb, chain, alphafold } = values
  if (!row || !accession) {
    throw new Error('give --rows <tsv>, or --row and --accession')
  }
  if (alphafold === !!pdb) {
    throw new Error('give one of --pdb <id> --chain <id> or --alphafold')
  }
  if (pdb && !chain) {
    throw new Error('--pdb needs --chain')
  }
  return [
    {
      row,
      accession,
      structure: pdb ? parseStructure(`${pdb}:${chain}`) : 'alphafold',
    },
  ]
}

function parse<T extends ParseArgsOptionsConfig>(
  options: T,
  allowPositionals = false,
) {
  return parseArgs({ args: process.argv.slice(3), options, allowPositionals })
}

async function main() {
  const command = process.argv[2]
  if (!isCommand(command)) {
    console.log(overviewHelp())
    const asked = [undefined, '-h', '--help'].includes(command)
    if (!asked) {
      console.error(`\nUnknown command: ${command}`)
    }
    process.exit(asked ? 0 : 1)
  }
  if (process.argv.slice(3).some(arg => arg === '-h' || arg === '--help')) {
    console.log(commandHelp(command))
    process.exit(0)
  }

  if (command === 'export-svg') {
    const { values } = parse(commands['export-svg'].options)
    if (!values.msa && !values.spec && !values.props) {
      console.error(
        'Error: --msa <file>, --spec <file.json> or --props <file.json> is required',
      )
      process.exit(1)
    }
    const theme = values.theme
    if (theme !== undefined && theme !== 'light' && theme !== 'dark') {
      console.error(`Error: --theme is light or dark, not "${theme}"`)
      process.exit(1)
    }
    await exportSvg({
      specFile: values.spec,
      propsFile: values.props,
      theme,
      msaFile: values.msa,
      treeFile: values.tree,
      gffFile: values.gff,
      outputFile: values.output,
      colorScheme: values['color-scheme'],
      width: readOptional('width', values.width, true),
      height: readOptional('height', values.height, true),
      treeAreaWidth: readOptional(
        'tree-area-width',
        values['tree-area-width'],
        true,
      ),
      colWidth: readOptional('col-width', values['col-width']),
      rowHeight: readOptional('row-height', values['row-height']),
      format: readFormat(values.format),
      tracks: values.tracks !== undefined ? readList(values.tracks) : undefined,
      viewport: values.viewport,
      minimap: values.minimap,
      scale: readOptional('scale', values.scale),
      force: values.force,
    })
    console.log(`wrote ${values.output}`)
  } else if (command === 'interproscan') {
    const { values, positionals } = parse(commands.interproscan.options, true)
    const inputFile = positionals[0]
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
      dockerImage: values['docker-image'],
      interproscanPath: values['interproscan-path'],
      dataDir: values['interproscan-data'],
      programs: readList(values.programs),
      email: values.email,
      format: readFormat(values.format),
    })
  } else if (command === 'interpro') {
    const { values, positionals } = parse(commands.interpro.options, true)
    const inputFile = positionals[0]
    if (!inputFile) {
      console.error('Error: Input accession list / TSV file is required')
      process.exit(1)
    }
    await runInterProPrecomputed({
      inputFile,
      outputFile: values.output,
      database: values.database,
      noCache: values['no-cache'],
      msaFile: values.msa,
      format: readFormat(values.format),
    })
  } else if (command === 'genestructure') {
    const { values, positionals } = parse(commands.genestructure.options, true)
    const inputFile = positionals[0]
    if (!inputFile) {
      console.error('Error: Input MSA file is required')
      process.exit(1)
    }
    await runGeneStructure({
      inputFile,
      outputFile: values.output,
      ref: values.ref,
      gene: values.gene,
      taxon: values.taxon,
      geneId: values['gene-id'],
      transcript: values.transcript,
      format: readFormat(values.format),
    })
  } else {
    const { values } = parse(commands['residue-mappings'].options)
    if (!values.msa) {
      console.error('Error: --msa <file> is required')
      process.exit(1)
    }
    await runResidueMappings({
      msaFile: values.msa,
      format: readFormat(values.format),
      rows: readMappingRows(values),
      outputFile: values.output,
    })
  }
}

main().catch((error: unknown) => {
  console.error('Error:', error instanceof Error ? error.message : error)
  if (
    isRecord(error) &&
    typeof error.code === 'string' &&
    error.code.startsWith('ERR_PARSE_ARGS')
  ) {
    console.error(
      `Run react-msaview-cli ${process.argv[2]} --help for its options`,
    )
  }
  process.exit(1)
})
