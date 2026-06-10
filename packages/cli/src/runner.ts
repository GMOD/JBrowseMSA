import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'

import { toFasta } from './util.ts'

import type { InterProScanResponse, InterProScanResults } from 'msa-parsers'

export interface Sequence {
  id: string
  seq: string
}

// shared InterProScan flags; input/output paths vary by backend (a container
// mount path for docker/singularity vs a host path for local). GO terms and
// pathways are intentionally not requested: interProToGFF only emits the
// signature accession/name/description, so those extra lookups would be
// discarded (and can fail in offline container setups).
export function interProScanArgs(
  inputPath: string,
  outputPath: string,
  programs: string[],
) {
  return [
    '-i',
    inputPath,
    '-o',
    outputPath,
    '-f',
    'JSON',
    '-appl',
    programs.join(','),
  ]
}

// write the FASTA to a temp dir, spawn the given command, then read back the
// output.json the run produces. tmpDir is mounted as /data by the container
// backends, so output.json always lands at tmpDir/output.json on the host
export async function runInterProScanProcess({
  sequences,
  command,
  buildArgs,
  label,
  errorHint,
}: {
  sequences: Sequence[]
  command: string
  buildArgs: (tmpDir: string) => string[]
  label: string
  errorHint: string
}): Promise<InterProScanResults[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interproscan-'))
  const inputFile = path.join(tmpDir, 'input.fasta')
  const outputFile = path.join(tmpDir, 'output.json')

  try {
    fs.writeFileSync(inputFile, toFasta(sequences), 'utf8')
    const args = buildArgs(tmpDir)
    console.log(`  ${command} ${args.join(' ')}`)

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })

      proc.stdout.on('data', (data: Buffer) => {
        const line = data.toString().trim()
        if (line) {
          console.log(`  ${line}`)
        }
      })

      let stderr = ''
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
        const line = data.toString().trim()
        if (line) {
          console.log(`  ${line}`)
        }
      })

      proc.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(
            new Error(
              `${label} InterProScan failed with code ${code}: ${stderr}`,
            ),
          )
        }
      })

      proc.on('error', err => {
        reject(new Error(`Failed to run ${label}: ${err.message}. ${errorHint}`))
      })
    })

    if (!fs.existsSync(outputFile)) {
      throw new Error('InterProScan did not produce output file')
    }

    const response: InterProScanResponse = JSON.parse(
      fs.readFileSync(outputFile, 'utf8'),
    )
    return response.results
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
