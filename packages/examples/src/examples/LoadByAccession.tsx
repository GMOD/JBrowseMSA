import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

// The InterPro API serves a Pfam seed with Content-Encoding: gzip, so the
// browser decompresses it. rfam.org sends no CORS header, so an Rfam seed comes
// from the release files on EBI's FTP server, which does: Rfam.seed.gz holds
// all 4,227 seed alignments in 5.9 MB and Rfam.seed_tree.tar.gz a tree for each
// in 2.6 MB. Those are plain .gz files, so DecompressionStream unpacks them,
// and the browser caches them for the next Rfam accession.
//
// The largest seeds, 4,028 rows in PF22725 and 1,613 in RF03160, load like the
// rest.
const INTERPRO = 'https://www.ebi.ac.uk/interpro/api/entry/pfam'
const EBI_SEARCH = 'https://www.ebi.ac.uk/ebisearch/ws/rest/rfam/entry'
const RFAM = 'https://ftp.ebi.ac.uk/pub/databases/Rfam/CURRENT'

const suggestions = [
  ['PF00042', 'Globin'],
  ['PF00069', 'Protein kinase'],
  ['PF00018', 'SH3'],
  ['RF00162', 'SAM riboswitch'],
  ['RF00005', 'tRNA'],
  ['RF00507', 'Coronavirus FSE'],
] as const

interface Family {
  accession: string
  msa: string
  tree?: string
}

async function get(url: string, signal: AbortSignal) {
  const { host } = new URL(url)
  const res = await fetch(url, { signal }).catch((error: unknown) => {
    throw signal.aborted ? error : new Error(`Could not reach ${host}`)
  })
  if (!res.ok) {
    throw new Error(`${host} answered HTTP ${res.status}`)
  }
  return res
}

async function pfam(accession: string, signal: AbortSignal) {
  const res = await get(
    `${INTERPRO}/${accession}/?annotation=alignment:seed`,
    signal,
  )
  const msa = await res.text()
  // InterPro answers an unknown accession with HTTP 200 and "{}"
  if (!msa.startsWith('# STOCKHOLM')) {
    throw new Error(`Pfam has no family ${accession}`)
  }
  return { accession, msa }
}

// A tar entry is a 512-byte header, with the file name at byte 0 and its size
// in octal at byte 124, then the file padded to a multiple of 512 bytes. The
// archive is ASCII, so a string offset is a byte offset.
function seedTree(tar: string, accession: string) {
  for (let at = 0; at < tar.length;) {
    const size = Number.parseInt(tar.slice(at + 124, at + 136), 8)
    if (Number.isNaN(size)) {
      return undefined
    }
    if (tar.startsWith(`${accession}.seed_tree\0`, at)) {
      // A leaf label is "<n>_<seed name>_<species>[<taxid>].<n>". A species
      // can contain parentheses, commas and colons, so the label runs up to
      // the branch length, and the seed name replaces it.
      return tar
        .slice(at + 512, at + 512 + size)
        .replaceAll(
          /(?<=[(,])[\d.]*_(\S+?\/\d+-\d+)_.*?(?=:[\d.eE-]+[,)])/g,
          '$1',
        )
    }
    at += 512 + Math.ceil(size / 512) * 512
  }
  return undefined
}

async function rfam(
  accession: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  // EBI Search answers in half a second, so a mistyped accession fails before
  // the 8.5 MB download starts
  const search = await get(`${EBI_SEARCH}/${accession}?format=json`, signal)
  const { entries } = (await search.json()) as { entries: unknown[] }
  if (entries.length === 0) {
    throw new Error(`Rfam has no family ${accession}`)
  }

  let received = 0
  let total = 0
  const mb = (bytes: number) => (bytes / 1e6).toFixed(1)
  async function gunzip(file: string) {
    const res = await get(`${RFAM}/${file}`, signal)
    total += Number(res.headers.get('content-length'))
    const counted = res.body!.pipeThrough(
      new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
        transform(chunk, controller) {
          received += chunk.length
          onProgress(
            `Downloading the Rfam release files from EBI, ${mb(received)} of ${mb(total)} MB`,
          )
          controller.enqueue(chunk)
        },
      }),
    )
    return new Response(
      counted.pipeThrough(new DecompressionStream('gzip')),
    ).text()
  }
  const [seeds, trees] = await Promise.all([
    gunzip('Rfam.seed.gz'),
    gunzip('Rfam.seed_tree.tar.gz'),
  ])

  const at = seeds.indexOf(`\n#=GF AC   ${accession}\n`)
  if (at === -1) {
    throw new Error(`Rfam.seed.gz has no family ${accession}`)
  }
  return {
    accession,
    msa: seeds.slice(
      seeds.lastIndexOf('# STOCKHOLM', at),
      seeds.indexOf('\n//', at) + 3,
    ),
    tree: seedTree(trees, accession),
  }
}

function fetchFamily(
  input: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
): Promise<Family> {
  const accession = input
    .trim()
    .toUpperCase()
    .replace(/\.\d+$/, '')
  return /^PF\d{5}$/.test(accession)
    ? pfam(accession, signal)
    : /^RF\d{5}$/.test(accession)
      ? rfam(accession, signal, onProgress)
      : Promise.reject(
          new Error(
            'Type a Pfam accession such as PF00042 or an Rfam accession such as RF00162',
          ),
        )
}

function FamilyTitle({ family }: { family: Family }) {
  const { accession, msa } = family
  const field = (tag: string) =>
    new RegExp(`^#=GF ${tag}\\s+(.+)$`, 'm').exec(msa)?.[1]
  const href = accession.startsWith('RF')
    ? `https://rfam.org/family/${accession}`
    : `https://www.ebi.ac.uk/interpro/entry/pfam/${accession}/`
  return (
    <>
      <Link href={href}>{accession}</Link> {field('DE')}, {field('SQ')}{' '}
      sequences
    </>
  )
}

interface Request {
  accession: string
}

export default function LoadByAccession() {
  const [draft, setDraft] = useState('PF00042')
  const [request, setRequest] = useState<Request>({ accession: 'PF00042' })
  const [family, setFamily] = useState<Family>()
  const [outcome, setOutcome] = useState<{ request: Request; error?: string }>()
  const [progress, setProgress] = useState<{ request: Request; text: string }>()

  useEffect(() => {
    const controller = new AbortController()
    fetchFamily(request.accession, controller.signal, text => {
      setProgress({ request, text })
    }).then(
      loaded => {
        if (!controller.signal.aborted) {
          setFamily(loaded)
          setOutcome({ request })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setOutcome({
            request,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    )
    return () => {
      controller.abort()
    }
  }, [request])

  function open(accession: string) {
    setDraft(accession)
    setRequest({ accession })
  }

  const error = outcome?.request === request ? outcome.error : undefined
  return (
    <div>
      <Stack
        component="form"
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}
        onSubmit={event => {
          event.preventDefault()
          open(draft)
        }}
      >
        <TextField
          size="small"
          label="Pfam or Rfam accession"
          value={draft}
          onChange={event => {
            setDraft(event.target.value)
          }}
        />
        <Button type="submit" variant="contained">
          Open
        </Button>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}
      >
        {suggestions.map(([accession, name]) => (
          <Button
            key={accession}
            size="small"
            variant="outlined"
            onClick={() => {
              open(accession)
            }}
          >
            {accession} {name}
          </Button>
        ))}
      </Stack>
      <Typography
        variant="body2"
        color={error ? 'error' : undefined}
        sx={{ mb: 1, minHeight: '1.5em' }}
      >
        {outcome?.request !== request ? (
          progress?.request === request ? (
            progress.text
          ) : (
            `Fetching ${request.accession}`
          )
        ) : error ? (
          error
        ) : family ? (
          <FamilyTitle family={family} />
        ) : null}
      </Typography>
      {family ? (
        <MSAViewer
          msa={family.msa}
          tree={family.tree}
          colorScheme={
            family.accession.startsWith('RF')
              ? 'nucleotide'
              : 'clustalx_protein_dynamic'
          }
          drawTree={family.tree !== undefined}
          autoTreeAreaWidth={family.tree === undefined}
          height={500}
        />
      ) : null}
    </div>
  )
}
