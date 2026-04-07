import { getSession } from '@jbrowse/core/util'

import { jsonfetch, textfetch, timeout } from './fetchUtils.ts'

import type { MsaViewModel } from './model.ts'

const base = 'https://www.ebi.ac.uk/Tools/services/rest'

export interface InterProScanResults {
  matches: {
    signature: {
      entry?: {
        name: string
        description: string
        accession: string
      }
    }
    locations: { start: number; end: number }[]
  }[]
  xref: { id: string }[]
}
export interface InterProScanResponse {
  results: InterProScanResults[]
}

async function runInterProScan({
  seq,
  onProgress,
  onJobId,
  programs,
  model,
}: {
  seq: string
  programs: string[]
  onProgress: (arg?: { msg: string; url?: string }) => void
  onJobId?: (arg: string) => void
  model: MsaViewModel
}) {
  const jobId = await textfetch(`${base}/iprscan5/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      sequence: seq,
      programs: programs.join(','),
    }),
  })
  onJobId?.(jobId)
  await wait({
    jobId,
    onProgress,
  })
  await loadInterProScanResultsWithStatus({ jobId, model })
}

function loadInterProScanResults(jobId: string) {
  return jsonfetch<InterProScanResponse>(
    `${base}/iprscan5/result/${jobId}/json`,
  )
}

async function wait({
  onProgress,
  jobId,
}: {
  jobId: string
  onProgress: (arg?: { msg: string; url?: string }) => void
}) {
  const url = `${base}/iprscan5/status/${jobId}`
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      for (let i = 0; i < 10; i++) {
        await timeout(1000)
        onProgress({ msg: `Checking status ${10 - i}`, url })
      }
      const result = await textfetch(url)
      if (result.includes('FINISHED')) {
        break
      }
      if (result.includes('FAILURE')) {
        throw new Error(`Failed to run: jobId ${jobId}`)
      }
    }
  } finally {
    onProgress()
  }
}

export async function launchInterProScan({
  algorithm,
  seq,
  programs,
  onJobId,
  onProgress,
  model,
}: {
  algorithm: string
  seq: string
  programs: string[]
  onProgress: (arg?: { msg: string; url?: string }) => void
  onJobId?: (arg: string) => void
  model: MsaViewModel
}) {
  try {
    onProgress({ msg: `Launching ${algorithm} MSA` })
    if (algorithm === 'interproscan') {
      await runInterProScan({
        seq,
        onJobId,
        onProgress,
        programs,
        model,
      })
    } else {
      throw new Error('unknown algorithm')
    }
  } finally {
    onProgress()
  }
}

async function loadInterProScanResultsWithStatus({
  jobId,
  model,
}: {
  jobId: string
  model: MsaViewModel
}) {
  try {
    model.setStatus({
      msg: `Downloading results of ${jobId} (for larger sequences this can be slow, click status to download and upload in the manual tab)`,
      url: `https://www.ebi.ac.uk/Tools/services/rest/iprscan5/result/${jobId}/json`,
    })
    const ret = await loadInterProScanResults(jobId)
    model.setInterProAnnotations(
      Object.fromEntries(ret.results.map(r => [r.xref[0]!.id, r])),
    )
    model.setShowDomains(true)
    getSession(model).notify(`Loaded interproscan ${jobId} results`, 'success')
  } catch (e) {
    console.error(e)
    getSession(model).notifyError(`${e}`, e)
  } finally {
    model.setStatus()
  }
}
