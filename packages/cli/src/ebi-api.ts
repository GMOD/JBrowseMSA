import type { InterProScanResponse, InterProScanResults } from 'msa-parsers'

const BASE_URL = 'https://www.ebi.ac.uk/Tools/services/rest/iprscan5'

async function submitJob(
  sequence: { id: string; seq: string },
  programs: string[],
  email: string,
): Promise<string> {
  const response = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email,
      sequence: `>${sequence.id}\n${sequence.seq}`,
      appl: programs.join(','),
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to submit job: ${response.statusText} - ${text}`)
  }

  return response.text()
}

async function checkStatus(jobId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/status/${jobId}`)
  if (!response.ok) {
    throw new Error(`Failed to check status: ${response.statusText}`)
  }
  return response.text()
}

async function getResults(jobId: string): Promise<InterProScanResponse> {
  const response = await fetch(`${BASE_URL}/result/${jobId}/json`)
  if (!response.ok) {
    throw new Error(`Failed to get results: ${response.statusText}`)
  }
  return response.json() as Promise<InterProScanResponse>
}

const TERMINAL_FAILURES = new Set(['FAILURE', 'ERROR', 'NOT_FOUND'])

// We measured the queue at fifteen minutes for one sequence, so polling runs
// for an hour.
const POLL_INTERVAL_MS = 3000
const MAX_WAIT_MS = 60 * 60 * 1000

async function waitForJob(jobId: string): Promise<void> {
  let attempts = 0
  const maxAttempts = MAX_WAIT_MS / POLL_INTERVAL_MS

  while (attempts < maxAttempts) {
    // exact match, so an error page mentioning FINISHED or ERROR is neither
    const status = (await checkStatus(jobId)).trim()

    if (status === 'FINISHED') {
      return
    }
    if (TERMINAL_FAILURES.has(status)) {
      throw new Error(`Job ${jobId} failed: ${status}`)
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    attempts++

    if (attempts % 10 === 0) {
      console.log(
        `  Still waiting... (${Math.round((attempts * POLL_INTERVAL_MS) / 1000)}s)`,
      )
    }
  }

  throw new Error(`Timeout waiting for job ${jobId}`)
}

export async function runEbiInterProScan(
  sequences: { id: string; seq: string }[],
  programs: string[],
  email: string,
): Promise<InterProScanResults[]> {
  const allResults: InterProScanResults[] = []
  const failed: string[] = []

  for (let i = 0; i < sequences.length; i++) {
    const seq = sequences[i]!
    console.log(`  [${i + 1}/${sequences.length}] Submitting ${seq.id}...`)

    // a failed sequence keeps earlier results and is reported as missing
    try {
      const jobId = await submitJob(seq, programs, email)
      console.log(`  Job: ${jobId}`)

      await waitForJob(jobId)

      const results = await getResults(jobId)
      for (const r of results.results) {
        allResults.push(r)
      }
      console.log(`  [${i + 1}/${sequences.length}] Done`)
    } catch (e) {
      failed.push(seq.id)
      console.warn(`  [${i + 1}/${sequences.length}] ${seq.id} failed: ${e}`)
    }
  }

  if (failed.length === sequences.length) {
    throw new Error(`every sequence failed: ${failed.join(', ')}`)
  }
  if (failed.length > 0) {
    console.warn(
      `  ${failed.length} of ${sequences.length} sequences have no matches in the output: ${failed.join(', ')}`,
    )
  }

  return allResults
}
