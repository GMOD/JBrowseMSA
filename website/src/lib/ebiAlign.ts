// EBI Job Dispatcher (Clustal Omega) is the multiple-sequence aligner —
// react-msaview renders alignments but doesn't compute them, and NCBI has no
// clean alignment API. The service is async: submit returns a job id, which we
// poll until FINISHED, then fetch the aligned FASTA and the guide tree. EBI
// sends `access-control-allow-origin: *`, so this runs from the browser.
//
// EBI requires a contact email whose domain has a real MX record (jbrowse.org
// is rejected, gmail is fine), so this is a real address.

const CLUSTALO = 'https://www.ebi.ac.uk/Tools/services/rest/clustalo'
const EBI_EMAIL = 'colin.diesh@gmail.com'

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function ebiText(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`EBI request failed (${res.status})`)
  }
  return (await res.text()).trim()
}

// Align protein sequences (FASTA in, FASTA out). Sequence ids in the input FASTA
// flow through to both the aligned output and the tree leaf names, so the caller
// controls the labels used everywhere downstream.
export async function clustalOmega(
  fasta: string,
  onProgress: (message: string) => void,
): Promise<{ aligned: string; newick: string }> {
  const body = new URLSearchParams({
    email: EBI_EMAIL,
    stype: 'protein',
    sequence: fasta,
  })
  const jobId = await ebiText(`${CLUSTALO}/run`, { method: 'POST', body })
  if (!jobId.startsWith('clustalo-')) {
    throw new Error(`EBI submission rejected: ${jobId.slice(0, 200)}`)
  }

  const start = Date.now()
  const timeoutMs = 180_000
  while (Date.now() - start < timeoutMs) {
    const status = await ebiText(`${CLUSTALO}/status/${jobId}`)
    if (status === 'FINISHED') {
      const [aligned, newick] = await Promise.all([
        ebiText(`${CLUSTALO}/result/${jobId}/fa`),
        ebiText(`${CLUSTALO}/result/${jobId}/phylotree`),
      ])
      return { aligned, newick }
    }
    if (status !== 'RUNNING' && status !== 'QUEUED') {
      throw new Error(`EBI alignment job ${status}`)
    }
    const secs = Math.round((Date.now() - start) / 1000)
    onProgress(
      `Aligning at EBI Clustal Omega… (${status.toLowerCase()}, ${secs}s)`,
    )
    await wait(2000)
  }
  throw new Error('EBI alignment timed out')
}

// EBI wraps FASTA at 60 columns; collapse each record to one sequence line so the
// viewer's parser reads the alignment unambiguously.
export function unwrapFasta(text: string): string {
  const records: string[] = []
  let header: string | undefined
  let buf: string[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      if (header) {
        records.push(`${header}\n${buf.join('')}`)
      }
      header = line.trim()
      buf = []
    } else {
      buf.push(line.trim())
    }
  }
  if (header) {
    records.push(`${header}\n${buf.join('')}`)
  }
  return records.join('\n')
}
