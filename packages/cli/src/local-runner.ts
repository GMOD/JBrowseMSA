import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'

import type { InterProScanResults } from 'msa-parsers'

interface InterProScanResponse {
  results: InterProScanResults[]
}

export async function runLocalInterProScan(
  sequences: { id: string; seq: string }[],
  interproscanPath: string,
  programs: string[],
): Promise<InterProScanResults[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interproscan-'))
  const inputFile = path.join(tmpDir, 'input.fasta')
  const outputFile = path.join(tmpDir, 'output.json')

  try {
    const fastaContent = sequences.map(s => `>${s.id}\n${s.seq}`).join('\n')

    fs.writeFileSync(inputFile, fastaContent, 'utf8')

    console.log(`  Running InterProScan on ${sequences.length} sequences...`)

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-i',
        inputFile,
        '-o',
        outputFile,
        '-f',
        'JSON',
        '-appl',
        programs.join(','),
        '--goterms',
        '--pathways',
      ]

      const proc = spawn(interproscanPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        const line = data.toString().trim()
        if (line) {
          console.log(`  ${line}`)
        }
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`InterProScan failed with code ${code}: ${stderr}`))
        }
      })

      proc.on('error', err => {
        reject(new Error(`Failed to run InterProScan: ${err.message}`))
      })
    })

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
