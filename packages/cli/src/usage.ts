import { MAX_EXPORT_LETTERS } from './export-svg.ts'
import { DEFAULT_DOCKER_IMAGE } from './runner.ts'

interface Option {
  type: 'string' | 'boolean'
  short?: string
  arg?: string
  about: string
  default?: string | boolean
  otherwise?: string
}

interface Command {
  summary: string
  usage: readonly string[]
  options: Record<string, Option>
  examples: readonly string[]
}

const format = {
  type: 'string',
  arg: '<name>',
  about:
    'Force the MSA format (stockholm, fasta, a3m, clustal, emf) instead of sniffing it',
} as const

function output<F extends object>(about: string, fallback: F) {
  return {
    type: 'string',
    short: 'o',
    arg: '<file>',
    about,
    ...fallback,
  } as const
}

const off = { type: 'boolean', default: false } as const

export const commands = {
  'export-svg': {
    summary: 'Export the alignment as SVG, PNG or PDF, with no browser',
    usage: [
      'export-svg --msa <file> [options]',
      'export-svg --spec <file.json> [options]',
    ],
    options: {
      spec: {
        type: 'string',
        arg: '<file.json>',
        about:
          'View spec or snapshot, with any layer from docs/layers.md; the flags below override it',
      },
      props: {
        type: 'string',
        arg: '<file.json>',
        about:
          'MSAViewer props as the R and Python widgets send them, in place of `--spec`',
      },
      msa: {
        type: 'string',
        arg: '<file>',
        about:
          'MSA file (FASTA, Stockholm, Clustal, A3M, EMF); required without `--spec` or `--props`',
      },
      format,
      tree: { type: 'string', arg: '<file>', about: 'Newick tree file' },
      gff: {
        type: 'string',
        arg: '<file>',
        about: 'Domain or exon GFF, or InterProScan JSON',
      },
      output: output(
        'Output file; `.svg`, `.png` or `.pdf` picks the format, and PNG and PDF need rsvg-convert from librsvg',
        { default: 'alignment.svg' },
      ),
      scale: {
        type: 'string',
        arg: '<n>',
        about: 'Pixels per SVG unit in a PNG',
        otherwise: '`2`',
      },
      'color-scheme': {
        type: 'string',
        arg: '<name>',
        about: 'Color scheme',
        otherwise: '`maeditor`',
      },
      theme: {
        type: 'string',
        arg: '<light|dark>',
        about: 'Page and text colors',
        otherwise: 'the `--props` theme, else `light`',
      },
      width: {
        type: 'string',
        arg: '<px>',
        about: 'Viewport width, which sets the tree area',
        otherwise: '`1200`',
      },
      height: {
        type: 'string',
        arg: '<px>',
        about: 'Viewport height',
        otherwise: '`600`',
      },
      'tree-area-width': {
        type: 'string',
        arg: '<px>',
        about: 'Tree panel width in pixels',
        otherwise: 'fit to the labels',
      },
      'col-width': {
        type: 'string',
        arg: '<px>',
        about: 'Width of one alignment column',
        otherwise: '`12`',
      },
      'row-height': {
        type: 'string',
        arg: '<px>',
        about: 'Height of one alignment row',
        otherwise: '`16`',
      },
      tracks: {
        type: 'string',
        arg: '<list>',
        about:
          'Tracks to draw above the alignment, by id (`conservation,position-ruler`), or `all`',
        otherwise: 'none',
      },
      viewport: {
        ...off,
        about:
          'Draw the `--width` x `--height` viewport at the top left instead of the entire alignment',
      },
      selection: {
        ...off,
        about:
          'Draw the selected block of the `--spec` or `--props` instead of the entire alignment: its columns, and the rows from the first selected to the last',
      },
      minimap: {
        ...off,
        about: 'Include the minimap bar (`--viewport` only)',
      },
      force: {
        ...off,
        about: `Export past the ${MAX_EXPORT_LETTERS.toLocaleString('en-US')}-letter limit, where the export can run out of memory`,
      },
    },
    examples: [
      'export-svg --msa alignment.fasta -o alignment.svg',
      'export-svg --msa alignment.fasta --tree tree.nwk --gff domains.gff -o figure.pdf',
      'export-svg --msa alignment.fasta --tracks conservation,position-ruler -o alignment.svg',
      'export-svg --msa alignment.fasta --viewport --minimap -o viewport.svg',
    ],
  },
  interpro: {
    summary:
      "Build a domain GFF from InterPro's precomputed matches for UniProtKB accessions",
    usage: ['interpro <accessions.tsv> [options]'],
    options: {
      output: output('Output GFF file', { default: 'domains.gff' }),
      database: {
        type: 'string',
        arg: '<name>',
        about: 'InterPro member database to read',
        default: 'pfam',
      },
      msa: {
        type: 'string',
        arg: '<file>',
        about:
          "Alignment the GFF is for; the CLI checks each row's ungapped length against UniProt",
      },
      format: {
        ...format,
        about: 'Force the `--msa` format instead of sniffing it',
      },
      'no-cache': {
        ...off,
        about: 'Re-fetch every accession, ignoring the disk cache',
      },
    },
    examples: [
      'interpro accessions.tsv -o domains.gff',
      'interpro accessions.tsv -o domains.gff --database cdd',
    ],
  },
  interproscan: {
    summary: 'Run InterProScan on every sequence of an MSA file',
    usage: ['interproscan <input-msa> [options]'],
    options: {
      output: output('Output GFF file', { default: 'domains.gff' }),
      local: {
        ...off,
        about: 'Run a local InterProScan installation instead of the EBI API',
      },
      docker: {
        ...off,
        about: 'Run InterProScan in the `interpro/interproscan` Docker image',
      },
      singularity: {
        ...off,
        about: 'Run InterProScan in a Singularity/Apptainer container',
      },
      'docker-image': {
        type: 'string',
        arg: '<image>',
        about: 'Docker image to run',
        default: DEFAULT_DOCKER_IMAGE,
      },
      'singularity-image': {
        type: 'string',
        arg: '<image>',
        about: 'Singularity image to run',
        default: `docker://${DEFAULT_DOCKER_IMAGE}`,
      },
      'interproscan-path': {
        type: 'string',
        arg: '<path>',
        about: 'Path to a local interproscan.sh',
        default: 'interproscan.sh',
      },
      'interproscan-data': {
        type: 'string',
        arg: '<dir>',
        about:
          'Host directory holding the member database `data/` to mount into the container, which the image ships without',
      },
      programs: {
        type: 'string',
        arg: '<list>',
        about:
          "Comma-separated programs in the EBI API's naming; the container and local backends get the InterProScan 5 names",
        default: 'PfamA,CDD',
      },
      format,
      email: {
        type: 'string',
        arg: '<email>',
        about: 'Email for the EBI API, which only EBI runs send',
        default: 'user@example.com',
      },
    },
    examples: [
      'interproscan alignment.fasta -o domains.gff',
      'interproscan alignment.fasta -o domains.gff --docker',
      'interproscan alignment.fasta -o domains.gff --local',
    ],
  },
  genestructure: {
    summary:
      'Build an exon-structure GFF for a coding-sequence alignment from a RefSeq transcript',
    usage: [
      'genestructure <input-msa> --gene <symbol> --ref <rowname> [options]',
    ],
    options: {
      gene: {
        type: 'string',
        arg: '<symbol>',
        about: 'Gene symbol to look up in RefSeq (e.g. `F12`)',
      },
      taxon: {
        type: 'string',
        arg: '<name|id>',
        about: 'Taxon for `--gene`',
        default: 'human',
      },
      'gene-id': {
        type: 'string',
        arg: '<id>',
        about: 'NCBI GeneID, instead of `--gene`',
      },
      transcript: {
        type: 'string',
        arg: '<acc>',
        about: 'Specific transcript accession',
        otherwise: 'MANE/RefSeq Select',
      },
      ref: {
        type: 'string',
        arg: '<rowname>',
        about: "Reference row, which must be the transcript's CDS",
        otherwise: 'first row',
      },
      format,
      output: output('Output GFF file', { default: 'genestructure.gff' }),
    },
    examples: [
      'genestructure f12-cds.stock --gene F12 --ref human -o exons.gff',
      'genestructure aln.fa --transcript NM_000505.4 --ref human',
    ],
  },
  'residue-mappings': {
    summary:
      'Build the residueMappings layer relating alignment rows to PDB chains (SIFTS) or AlphaFold models',
    usage: [
      'residue-mappings --msa <file> --row <name> --accession <acc> (--pdb <id> --chain <id> | --alphafold)',
      'residue-mappings --msa <file> --rows <tsv>',
    ],
    options: {
      msa: {
        type: 'string',
        arg: '<file>',
        about: 'Alignment holding the rows (required)',
      },
      format,
      rows: {
        type: 'string',
        arg: '<tsv>',
        about:
          '`row`, `accession`, `structure` per line, tab-separated, where the structure is `6VXX:A` or `alphafold`',
      },
      row: {
        type: 'string',
        arg: '<name>',
        about: 'One row, instead of `--rows`',
      },
      accession: {
        type: 'string',
        arg: '<acc>',
        about: "The row's UniProtKB accession",
      },
      pdb: {
        type: 'string',
        arg: '<id>',
        about: 'The PDB entry to map the row onto',
      },
      chain: {
        type: 'string',
        arg: '<id>',
        about: "The `--pdb` entry's author chain",
      },
      alphafold: {
        ...off,
        about:
          'Map the row onto the AlphaFold DB model of the accession instead',
      },
      output: output('Output JSON file', { otherwise: 'stdout' }),
    },
    examples: [
      'residue-mappings --msa spike.afa --row SARS-CoV-2 --accession P0DTC2 --pdb 6VXX --chain A -o mappings.json',
      'residue-mappings --msa spike.afa --rows structures.tsv',
    ],
  },
} as const satisfies Record<string, Command>

export type CommandName = keyof typeof commands

export function isCommand(name: string | undefined): name is CommandName {
  return name !== undefined && Object.hasOwn(commands, name)
}

const BIN = 'react-msaview-cli'
const WIDTH = 80
const FLAG_COLUMN = 32

function flag(name: string, option: Option) {
  const long = `--${name}${option.arg ? ` ${option.arg}` : ''}`
  return option.short ? `-${option.short}, ${long}` : long
}

function shownDefault(option: Option) {
  return typeof option.default === 'string'
    ? `\`${option.default}\``
    : option.otherwise
}

const NBSP = '\u00a0'

function wrap(text: string, width: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  return [...lines, line].map(l => l.replaceAll(NBSP, ' '))
}

function plain(text: string) {
  return text.replaceAll('`', '')
}

function indented(left: string, text: string, column: number) {
  const [first, ...rest] = wrap(text, WIDTH - column)
  const head =
    left.length + 2 > column
      ? [`  ${left}`, `${' '.repeat(column)}${first}`]
      : [`  ${left.padEnd(column - 2)}${first}`]
  return [...head, ...rest.map(l => `${' '.repeat(column)}${l}`)]
}

export function commandHelp(name: CommandName) {
  const command: Command = commands[name]
  const options = Object.entries(command.options).flatMap(([key, option]) => {
    const fallback = shownDefault(option)
    const about = fallback
      ? `${option.about} ${`(default: ${fallback})`.replaceAll(' ', NBSP)}`
      : option.about
    return indented(flag(key, option), plain(about), FLAG_COLUMN)
  })
  return [
    `${BIN} ${name}: ${command.summary}`,
    '',
    'USAGE:',
    ...command.usage.map(u => `  ${BIN} ${u}`),
    '',
    'OPTIONS:',
    ...options,
    ...indented('-h, --help', 'Show this help message', FLAG_COLUMN),
    '',
    'EXAMPLES:',
    ...command.examples.map(e => `  ${BIN} ${e}`),
  ].join('\n')
}

export function overviewHelp() {
  return [
    `${BIN}: domain and exon GFFs, residue mappings and figure export for react-msaview`,
    '',
    'USAGE:',
    `  ${BIN} <command> [options]`,
    `  ${BIN} <command> --help`,
    '',
    'COMMANDS:',
    ...Object.entries(commands).flatMap(([name, command]) =>
      indented(name, command.summary, 20),
    ),
  ].join('\n')
}

function cell(text: string) {
  return text.replaceAll('|', '\\|')
}

export function optionsTable(name: CommandName) {
  const command: Command = commands[name]
  const rows = [
    ['Option', 'Description', 'Default'],
    ...Object.entries(command.options).map(([key, option]) =>
      [
        `\`${flag(key, option)}\``,
        option.about,
        shownDefault(option) ?? '',
      ].map(cell),
    ),
  ]
  const widths = rows[0]!.map((_, i) =>
    Math.max(...rows.map(r => r[i]!.length)),
  )
  const line = (cells: string[]) =>
    `| ${cells.map((c, i) => c.padEnd(widths[i]!)).join(' | ')} |`
  const [header, ...body] = rows
  return [
    line(header!),
    `| ${widths.map(w => '-'.repeat(w)).join(' | ')} |`,
    ...body.map(line),
  ].join('\n')
}

export function readmeWithOptions(readme: string) {
  for (const name of Object.keys(commands).filter(isCommand)) {
    if (!readme.includes(`<!-- options:${name} -->`)) {
      throw new Error(`the README has no <!-- options:${name} --> marker`)
    }
  }
  return readme.replaceAll(
    /<!-- options:([\w-]+) -->\n[\s\S]*?<!-- \/options -->/g,
    (block, name: string) => {
      if (!isCommand(name)) {
        throw new Error(`the README marks options for unknown command ${name}`)
      }
      return `<!-- options:${name} -->\n\n${optionsTable(name)}\n\n<!-- /options -->`
    },
  )
}
