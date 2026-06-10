import path from 'node:path'

import { interProScanArgs, runInterProScanProcess } from './runner.ts'

import type { Sequence } from './runner.ts'
import type { InterProScanResults } from 'msa-parsers'

export function runLocalInterProScan(
  sequences: Sequence[],
  interproscanPath: string,
  programs: string[],
): Promise<InterProScanResults[]> {
  console.log(`  Running InterProScan on ${sequences.length} sequences...`)
  return runInterProScanProcess({
    sequences,
    command: interproscanPath,
    label: 'Local',
    errorHint: `Is ${interproscanPath} installed and on PATH?`,
    buildArgs: tmpDir =>
      interProScanArgs(
        path.join(tmpDir, 'input.fasta'),
        path.join(tmpDir, 'output.json'),
        programs,
      ),
  })
}
