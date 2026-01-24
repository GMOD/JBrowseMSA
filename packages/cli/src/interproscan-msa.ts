import * as fs from 'node:fs'

import {
  getUngappedSequence,
  interProResponseToGFF,
  parseMSA,
} from 'msa-parsers'

import { runEbiInterProScan } from './ebi-api'
import { runLocalInterProScan } from './local-runner'

import type { InterProScanResults } from 'msa-parsers'

export interface InterProScanOptions {
  inputFile: string
  outputFile: string
  useLocal: boolean
  interproscanPath: string
  programs: string[]
  email: string
  batchSize: number
}

export async function runInterProScan(options: InterProScanOptions) {
  const {
    inputFile,
    outputFile,
    useLocal,
    interproscanPath,
    programs,
    email,
    batchSize,
  } = options

  console.log(`Reading MSA from ${inputFile}...`)
  const msaText = fs.readFileSync(inputFile, 'utf8')
  const msa = parseMSA(msaText)

  const names = msa.getNames()
  console.log(`Found ${names.length} sequences`)

  const sequences: { id: string; seq: string }[] = []
  for (const name of names) {
    const alignedSeq = msa.getRow(name)
    const ungappedSeq = getUngappedSequence(alignedSeq)
    if (ungappedSeq.length > 0) {
      sequences.push({ id: name, seq: ungappedSeq })
    }
  }

  console.log(`Processing ${sequences.length} non-empty sequences...`)

  let allResults: InterProScanResults[]

  if (useLocal) {
    console.log(`Running local InterProScan at ${interproscanPath}...`)
    allResults = await runLocalInterProScan(
      sequences,
      interproscanPath,
      programs,
    )
  } else {
    console.log(`Running InterProScan via EBI API...`)
    allResults = await runEbiInterProScan(sequences, programs, email, batchSize)
  }

  console.log(`Converting results to GFF...`)
  const gff = interProResponseToGFF(allResults)

  console.log(`Writing output to ${outputFile}...`)
  fs.writeFileSync(outputFile, gff, 'utf8')

  console.log('Done!')
}
