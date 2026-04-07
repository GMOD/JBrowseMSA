import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'

import { toFasta } from './util.ts'

import type { InterProScanResponse, InterProScanResults } from 'msa-parsers'

const INTERPROSCAN_IMAGE = 'interpro/interproscan:latest'

export async function runDockerInterProScan(
  sequences: { id: string; seq: string }[],
  programs: string[],
): Promise<InterProScanResults[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interproscan-'))
  const inputFile = path.join(tmpDir, 'input.fasta')

  try {
    fs.writeFileSync(inputFile, toFasta(sequences), 'utf8')

    console.log(
      `  Running InterProScan via Docker on ${sequences.length} sequences...`,
    )
    console.log(`  Image: ${INTERPROSCAN_IMAGE}`)

    await new Promise<void>((resolve, reject) => {
      const args = [
        'run',
        '--rm',
        '-v',
        `${tmpDir}:/data`,
        INTERPROSCAN_IMAGE,
        '-i',
        '/data/input.fasta',
        '-o',
        '/data/output.json',
        '-f',
        'JSON',
        '-appl',
        programs.join(','),
      ]

      console.log(`  docker ${args.join(' ')}`)

      const proc = spawn('docker', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

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
              `Docker InterProScan failed with code ${code}: ${stderr}`,
            ),
          )
        }
      })

      proc.on('error', err => {
        reject(
          new Error(
            `Failed to run Docker: ${err.message}. Is Docker installed and running?`,
          ),
        )
      })
    })

    const outputFile = path.join(tmpDir, 'output.json')
    if (!fs.existsSync(outputFile)) {
      throw new Error('InterProScan did not produce output file')
    }

    const outputContent = fs.readFileSync(outputFile, 'utf8')
    const response: InterProScanResponse = JSON.parse(outputContent)

    return response.results
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
