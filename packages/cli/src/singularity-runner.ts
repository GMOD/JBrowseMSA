import { interProScanArgs, runInterProScanProcess } from './runner.ts'

import type { Sequence } from './runner.ts'
import type { InterProScanResults } from 'msa-parsers'

const DEFAULT_SINGULARITY_IMAGE = 'docker://interpro/interproscan:latest'

export function runSingularityInterProScan(
  sequences: Sequence[],
  programs: string[],
  imagePath = DEFAULT_SINGULARITY_IMAGE,
): Promise<InterProScanResults[]> {
  console.log(
    `  Running InterProScan via Singularity on ${sequences.length} sequences (image: ${imagePath})...`,
  )
  return runInterProScanProcess({
    sequences,
    command: 'singularity',
    label: 'Singularity',
    errorHint: 'Is Singularity/Apptainer installed?',
    buildArgs: tmpDir => [
      'exec',
      '--bind',
      `${tmpDir}:/data`,
      imagePath,
      '/opt/interproscan/interproscan.sh',
      ...interProScanArgs('/data/input.fasta', '/data/output.json', programs),
    ],
  })
}
