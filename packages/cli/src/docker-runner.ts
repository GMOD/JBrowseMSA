import { interProScanArgs, runInterProScanProcess } from './runner.ts'

import type { Sequence } from './runner.ts'
import type { InterProScanResults } from 'msa-parsers'

const INTERPROSCAN_IMAGE = 'interpro/interproscan:latest'

export function runDockerInterProScan(
  sequences: Sequence[],
  programs: string[],
): Promise<InterProScanResults[]> {
  console.log(
    `  Running InterProScan via Docker on ${sequences.length} sequences (image: ${INTERPROSCAN_IMAGE})...`,
  )
  return runInterProScanProcess({
    sequences,
    command: 'docker',
    label: 'Docker',
    errorHint: 'Is Docker installed and running?',
    buildArgs: tmpDir => [
      'run',
      '--rm',
      '-v',
      `${tmpDir}:/data`,
      INTERPROSCAN_IMAGE,
      ...interProScanArgs('/data/input.fasta', '/data/output.json', programs),
    ],
  })
}
