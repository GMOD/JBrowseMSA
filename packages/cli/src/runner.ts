import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import path from 'node:path'

import type { InterProScanResponse, InterProScanResults } from 'msa-parsers'

export interface Sequence {
  id: string
  seq: string
}

export type Backend = 'local' | 'docker' | 'singularity'

// A real tag: interpro/interproscan publishes version tags only, so the
// `:latest` this used to name does not resolve ("manifest unknown") and every
// docker run failed before it started. InterProScan 6 is a different command
// line, so this stays on the last 5.x.
export const DEFAULT_DOCKER_IMAGE = 'interpro/interproscan:5.78-109.0'

// The EBI API and InterProScan 5 name the same analysis differently. The CLI
// takes the API's names, since that is its default backend, and translates for
// the ones that run InterProScan itself -- `-appl PfamA` is rejected outright,
// and TIGRFAM is shipped as NCBIfam since InterProScan 5.56.
const LOCAL_PROGRAM_NAMES: Record<string, string> = {
  PfamA: 'Pfam',
  TIGRFAM: 'NCBIfam',
  PrositePatterns: 'ProSitePatterns',
  PrositeProfiles: 'ProSiteProfiles',
  HAMAP: 'Hamap',
  SuperFamily: 'SUPERFAMILY',
  Gene3d: 'Gene3D',
}

export function localProgramNames(programs: string[]) {
  return programs.map(p => LOCAL_PROGRAM_NAMES[p] ?? p)
}

// GO terms and pathways are intentionally not requested: an annotation carries
// only the signature accession, name and description, so those extra lookups
// would be discarded (and can fail in offline container setups).
function interProScanArgs(
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
    localProgramNames(programs).join(','),
  ]
}

// tmpDir holds input.fasta and receives output.json; the container backends
// mount it as /data, so the file always lands at tmpDir/output.json on the host.
// dataDir is the member-database data/ directory, which the published image
// does not carry -- a container run without it fails on the first analysis.
export function backendCommand({
  backend,
  tmpDir,
  programs,
  interproscanPath,
  singularityImage,
  dockerImage,
  dataDir,
}: {
  backend: Backend
  tmpDir: string
  programs: string[]
  interproscanPath: string
  singularityImage: string
  dockerImage: string
  dataDir?: string
}) {
  const hostArgs = interProScanArgs(
    path.join(tmpDir, 'input.fasta'),
    path.join(tmpDir, 'output.json'),
    programs,
  )
  const containerArgs = interProScanArgs(
    '/data/input.fasta',
    '/data/output.json',
    programs,
  )
  const dataMount = dataDir ? [`${dataDir}:/opt/interproscan/data`] : []
  if (backend === 'local') {
    return {
      command: interproscanPath,
      args: hostArgs,
      label: 'Local',
      errorHint: `Is ${interproscanPath} installed and on PATH?`,
    }
  }
  if (backend === 'docker') {
    return {
      command: 'docker',
      args: [
        'run',
        '--rm',
        ...[`${tmpDir}:/data`, ...dataMount].flatMap(m => ['-v', m]),
        dockerImage,
        ...containerArgs,
      ],
      label: 'Docker',
      errorHint: 'Is Docker installed and running?',
    }
  }
  return {
    command: 'singularity',
    args: [
      'exec',
      ...[`${tmpDir}:/data`, ...dataMount].flatMap(m => ['--bind', m]),
      singularityImage,
      '/opt/interproscan/interproscan.sh',
      ...containerArgs,
    ],
    label: 'Singularity',
    errorHint: 'Is Singularity/Apptainer installed?',
  }
}

export function runInterProScanBackend({
  sequences,
  backend,
  programs,
  interproscanPath,
  singularityImage,
  dockerImage,
  dataDir,
}: {
  sequences: Sequence[]
  backend: Backend
  programs: string[]
  interproscanPath: string
  singularityImage: string
  dockerImage: string
  dataDir?: string
}) {
  if (backend !== 'local' && !dataDir) {
    console.warn(
      '  The InterProScan image ships without its member database data; pass --interproscan-data <dir> if the run fails to find it',
    )
  }
  return runInterProScanProcess({
    sequences,
    build: tmpDir =>
      backendCommand({
        backend,
        tmpDir,
        programs,
        interproscanPath,
        singularityImage,
        dockerImage,
        dataDir,
      }),
  })
}

// write the FASTA to a temp dir, spawn the given command, then read back the
// output.json the run produces
async function runInterProScanProcess({
  sequences,
  build,
}: {
  sequences: Sequence[]
  build: (tmpDir: string) => {
    command: string
    args: string[]
    label: string
    errorHint: string
  }
}): Promise<InterProScanResults[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interproscan-'))
  const inputFile = path.join(tmpDir, 'input.fasta')
  const outputFile = path.join(tmpDir, 'output.json')
  const { command, args, label, errorHint } = build(tmpDir)

  try {
    fs.writeFileSync(
      inputFile,
      sequences.map(s => `>${s.id}\n${s.seq}`).join('\n'),
      'utf8',
    )
    console.log(
      `  Running InterProScan via ${label} on ${sequences.length} sequences...`,
    )
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
        reject(
          new Error(`Failed to run ${label}: ${err.message}. ${errorHint}`),
        )
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
