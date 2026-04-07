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

async function waitForJob(jobId: string): Promise<void> {
  let attempts = 0
  const maxAttempts = 300

  while (attempts < maxAttempts) {
    const status = await checkStatus(jobId)

    if (status.includes('FINISHED')) {
      return
    }
    if (status.includes('FAILURE') || status.includes('ERROR')) {
      throw new Error(`Job ${jobId} failed: ${status}`)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    attempts++

    if (attempts % 10 === 0) {
      console.log(`  Still waiting... (${attempts}s)`)
    }
  }

  throw new Error(`Timeout waiting for job ${jobId}`)
}

export async function runEbiInterProScan(
  sequences: { id: string; seq: string }[],
  programs: string[],
  email: string,
  _batchSize: number,
): Promise<InterProScanResults[]> {
  const allResults: InterProScanResults[] = []

  for (let i = 0; i < sequences.length; i++) {
    const seq = sequences[i]!
    console.log(`  [${i + 1}/${sequences.length}] Submitting ${seq.id}...`)

    const jobId = await submitJob(seq, programs, email)
    console.log(`  Job: ${jobId}`)

    await waitForJob(jobId)

    const results = await getResults(jobId)
    for (const r of results.results) {
      allResults.push(r)
    }

    console.log(`  [${i + 1}/${sequences.length}] Done`)
  }

  return allResults
}
