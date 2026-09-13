import { describe, expect, test } from 'vitest'

import {
  DEFAULT_DOCKER_IMAGE,
  backendCommand,
  localProgramNames,
} from './runner.ts'

const base = {
  tmpDir: '/tmp/ips',
  programs: ['PfamA', 'CDD', 'TIGRFAM'],
  interproscanPath: 'interproscan.sh',
  singularityImage: `docker://${DEFAULT_DOCKER_IMAGE}`,
  dockerImage: DEFAULT_DOCKER_IMAGE,
}

describe('localProgramNames', () => {
  test('translates the EBI API names InterProScan 5 rejects', () => {
    expect(localProgramNames(['PfamA', 'TIGRFAM', 'CDD'])).toEqual([
      'Pfam',
      'NCBIfam',
      'CDD',
    ])
  })
})

describe('backendCommand', () => {
  test('local runs interproscan.sh on host paths', () => {
    const { command, args } = backendCommand({ ...base, backend: 'local' })
    expect(command).toBe('interproscan.sh')
    expect(args).toContain('/tmp/ips/input.fasta')
    expect(args[args.indexOf('-appl') + 1]).toBe('Pfam,CDD,NCBIfam')
  })

  test('docker mounts the member database data directory when given one', () => {
    const { args } = backendCommand({
      ...base,
      backend: 'docker',
      dataDir: '/data/interproscan-5.75-106.0/data',
    })
    expect(args.join(' ')).toContain(
      '-v /data/interproscan-5.75-106.0/data:/opt/interproscan/data',
    )
    expect(args.join(' ')).toContain('-v /tmp/ips:/data')
    expect(args).toContain('/data/input.fasta')
  })

  test('singularity binds the same two directories', () => {
    const { command, args } = backendCommand({
      ...base,
      backend: 'singularity',
      dataDir: '/opt/ips/data',
    })
    expect(command).toBe('singularity')
    expect(args.join(' ')).toContain('--bind /tmp/ips:/data')
    expect(args.join(' ')).toContain(
      '--bind /opt/ips/data:/opt/interproscan/data',
    )
  })

  test('leaves out the data mount when no directory is given', () => {
    const { args } = backendCommand({ ...base, backend: 'docker' })
    expect(args.join(' ')).not.toContain('/opt/interproscan/data')
  })
})
