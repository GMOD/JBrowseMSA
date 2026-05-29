import { getSession } from '@jbrowse/core/util'

import { isAbortError, jsonfetch, textfetch, timeout } from './fetchUtils.ts'

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
  signal,
}: {
  seq: string
  programs: string[]
  onProgress: (arg?: { msg: string; url?: string }) => void
  onJobId?: (arg: string) => void
  model: MsaViewModel
  signal?: AbortSignal
}) {
  const jobId = await textfetch(`${base}/iprscan5/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      sequence: seq,
      programs: programs.join(','),
    }),
    signal,
  })
  onJobId?.(jobId)
  await wait({
    jobId,
    onProgress,
    signal,
  })
  await loadInterProScanResultsWithStatus({ jobId, model, onProgress, signal })
}

function loadInterProScanResults(jobId: string, signal?: AbortSignal) {
  return jsonfetch<InterProScanResponse>(
    `${base}/iprscan5/result/${jobId}/json`,
    { signal },
  )
}

async function wait({
  onProgress,
  jobId,
  signal,
}: {
  jobId: string
  onProgress: (arg?: { msg: string; url?: string }) => void
  signal?: AbortSignal
}) {
  const url = `${base}/iprscan5/status/${jobId}`
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      for (let i = 0; i < 10; i++) {
        await timeout(1000, signal)
        onProgress({ msg: `Checking status ${10 - i}`, url })
      }
      const result = await textfetch(url, { signal })
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
  signal,
}: {
  algorithm: string
  seq: string
  programs: string[]
  onProgress: (arg?: { msg: string; url?: string }) => void
  onJobId?: (arg: string) => void
  model: MsaViewModel
  signal?: AbortSignal
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
        signal,
      })
    } else {
      throw new Error('unknown algorithm')
    }
  } catch (e) {
    if (isAbortError(e)) {
      getSession(model).notify('Cancelled InterProScan query', 'info')
    } else {
      throw e
    }
  } finally {
    onProgress()
  }
}

async function loadInterProScanResultsWithStatus({
  jobId,
  model,
  onProgress,
  signal,
}: {
  jobId: string
  model: MsaViewModel
  onProgress: (arg?: { msg: string; url?: string }) => void
  signal?: AbortSignal
}) {
  try {
    onProgress({
      msg: `Downloading results of ${jobId} (for larger sequences this can be slow, click status to download and upload in the manual tab)`,
      url: `https://www.ebi.ac.uk/Tools/services/rest/iprscan5/result/${jobId}/json`,
    })
    const ret = await loadInterProScanResults(jobId, signal)
    model.setInterProAnnotations(
      Object.fromEntries(ret.results.map(r => [r.xref[0]!.id, r])),
    )
    model.setShowDomains(true)
    getSession(model).notify(`Loaded interproscan ${jobId} results`, 'success')
  } catch (e) {
    if (isAbortError(e)) {
      getSession(model).notify('Cancelled InterProScan query', 'info')
    } else {
      console.error(e)
      getSession(model).notifyError(`${e}`, e)
    }
  } finally {
    onProgress()
  }
}
