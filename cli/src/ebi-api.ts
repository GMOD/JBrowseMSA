import type { InterProScanResults } from '@react-msaview/parsers'

const BASE_URL = 'https://www.ebi.ac.uk/Tools/services/rest/iprscan5'

interface InterProScanResponse {
  results: InterProScanResults[]
}

async function submitJob(
  sequences: { id: string; seq: string }[],
  programs: string[],
  email: string,
): Promise<string> {
  const fastaSeq = sequences.map(s => `>${s.id}\n${s.seq}`).join('\n')

  const response = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email,
      sequence: fastaSeq,
      appl: programs.join(','),
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to submit job: ${response.statusText}`)
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
  console.log(`  Waiting for job ${jobId}...`)
  let attempts = 0
  const maxAttempts = 300 // 5 minutes max wait

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
  batchSize: number,
): Promise<InterProScanResults[]> {
  const allResults: InterProScanResults[] = []
  const batches: { id: string; seq: string }[][] = []

  for (let i = 0; i < sequences.length; i += batchSize) {
    batches.push(sequences.slice(i, i + batchSize))
  }

  console.log(`  Submitting ${batches.length} batch(es)...`)

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!
    console.log(
      `  Processing batch ${i + 1}/${batches.length} (${batch.length} sequences)...`,
    )

    const jobId = await submitJob(batch, programs, email)
    console.log(`  Job submitted: ${jobId}`)

    await waitForJob(jobId)

    const results = await getResults(jobId)
    for (const r of results.results) {
      allResults.push(r)
    }

    console.log(`  Batch ${i + 1} complete`)
  }

  return allResults
}
