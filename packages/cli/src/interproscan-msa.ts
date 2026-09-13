import * as fs from 'node:fs'

import {
  getUngappedSequence,
  interProResponseToGFF,
  parseMSA,
} from 'msa-parsers'

import { runEbiInterProScan } from './ebi-api.ts'
import { runInterProScanBackend } from './runner.ts'

import type { Backend } from './runner.ts'
import type { MSAFormat } from 'msa-parsers'

export interface InterProScanOptions {
  inputFile: string
  outputFile: string
  useLocal: boolean
  useDocker: boolean
  useSingularity: boolean
  singularityImage: string
  dockerImage: string
  interproscanPath: string
  dataDir?: string
  programs: string[]
  email: string
  format?: MSAFormat
}

export async function runInterProScan(options: InterProScanOptions) {
  const { inputFile, outputFile, programs, email, format } = options

  console.log(`Reading MSA from ${inputFile}...`)
  const msa = parseMSA(fs.readFileSync(inputFile, 'utf8'), 0, format)

  const names = msa.getNames()
  console.log(`Found ${names.length} sequences`)

  const sequences = names
    .map(id => ({ id, seq: getUngappedSequence(msa.getRow(id)) }))
    .filter(s => s.seq.length > 0)

  console.log(`Processing ${sequences.length} non-empty sequences...`)

  const backend: Backend | undefined = options.useSingularity
    ? 'singularity'
    : options.useDocker
      ? 'docker'
      : options.useLocal
        ? 'local'
        : undefined

  const allResults = backend
    ? await runInterProScanBackend({
        sequences,
        backend,
        programs,
        interproscanPath: options.interproscanPath,
        singularityImage: options.singularityImage,
        dockerImage: options.dockerImage,
        dataDir: options.dataDir,
      })
    : await runEbiInterProScan(sequences, programs, email)

  console.log('Converting results to GFF...')
  const gff = interProResponseToGFF(allResults)

  console.log(`Writing output to ${outputFile}...`)
  fs.writeFileSync(outputFile, gff, 'utf8')

  console.log('Done!')
}
