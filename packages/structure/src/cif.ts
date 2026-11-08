export type Vec3 = [number, number, number]

/** CA position by `label_seq_id` */
export type ChainCoordinates = Map<number, Vec3>

/**
 * A structure file's CA atoms, by chain under each of its two chain ids. A
 * chain's label and author entries are one map, so a lone chain counts once.
 */
export interface CaCoordinates {
  label: Map<string, ChainCoordinates>
  auth: Map<string, ChainCoordinates>
}

/**
 * The chain a mapping names, read in the id space its `asymIdKind` says. With
 * no kind the label id goes first, and since only chains with CA atoms are
 * kept, a label id naming a nucleic-acid chain falls through to the author id.
 * A mapping that names no chain gets the file's only chain, if it has one.
 */
export function caChain(
  coordinates: CaCoordinates,
  asymId: string | undefined,
  kind: 'label' | 'auth' | undefined,
) {
  if (asymId === undefined) {
    const [only, ...rest] = coordinates.label.values()
    return rest.length === 0 ? only : undefined
  }
  return kind === 'auth'
    ? coordinates.auth.get(asymId)
    : kind === 'label'
      ? coordinates.label.get(asymId)
      : (coordinates.label.get(asymId) ?? coordinates.auth.get(asymId))
}

/**
 * The CA atoms of the first model of a PDB-format file, by chain, numbered by
 * the residue sequence number. The file has one chain id, filed as both kinds.
 * A Foldseek trace is numbered 1..n by target position, so that number is its
 * `label_seq_id`; a file numbered from anywhere else is misread. Undefined
 * when no CA is found.
 */
export function parsePdbCaCoordinates(pdb: string): CaCoordinates | undefined {
  const chains = new Map<string, ChainCoordinates>()
  for (const line of pdb.split('\n')) {
    if (line.startsWith('ENDMDL')) {
      break
    }
    const atom = line.startsWith('ATOM  ')
    if (
      !(atom || line.startsWith('HETATM')) ||
      line.slice(12, 16).trim() !== 'CA'
    ) {
      continue
    }
    const residue = line.slice(17, 20).trim()
    const alt = line[16] ?? ' '
    if ((!atom && residue === 'CA') || (alt !== ' ' && alt !== 'A')) {
      continue
    }
    const seq = Number(line.slice(22, 26))
    const position: Vec3 = [
      Number(line.slice(30, 38)),
      Number(line.slice(38, 46)),
      Number(line.slice(46, 54)),
    ]
    if (!Number.isInteger(seq) || !position.every(Number.isFinite)) {
      continue
    }
    const chain = (line[21] ?? ' ').trim() || 'A'
    const residues = chains.get(chain) ?? new Map<number, Vec3>()
    residues.set(seq, position)
    chains.set(chain, residues)
  }
  return chains.size > 0 ? { label: chains, auth: chains } : undefined
}

const TOKEN = /'[^']*'|"[^"]*"|\S+/g

/**
 * The CA atoms of the first model of an mmCIF file, by `label_asym_id` and by
 * `auth_asym_id`. `ATOM` records and the `HETATM` records of modified residues
 * such as selenomethionine count, and a calcium ion does not, since its atom
 * and residue are both `CA`. The first alternate location wins, and a record
 * with a coordinate that is not a number is skipped. Text with no `_atom_site`
 * loop is read as a PDB-format file. Undefined when no CA is found.
 */
export function parseCaCoordinates(cif: string): CaCoordinates | undefined {
  if (!cif.includes('_atom_site.')) {
    return parsePdbCaCoordinates(cif)
  }
  const lines = cif.split('\n')
  const columns = new Map<string, number>()
  let i = 0
  for (; i < lines.length; i++) {
    const line = lines[i]!
    if (line.startsWith('_atom_site.')) {
      columns.set(line.trim().slice('_atom_site.'.length), columns.size)
    } else if (columns.size > 0) {
      break
    }
  }
  const col = (name: string) => columns.get(name)
  const need = [
    'group_PDB',
    'label_atom_id',
    'label_asym_id',
    'label_seq_id',
    'Cartn_x',
    'Cartn_y',
    'Cartn_z',
  ].map(col)
  if (!need.every(c => c !== undefined)) {
    return undefined
  }
  const [group, atom, asym, seq, cx, cy, cz] = need
  const auth = col('auth_asym_id')
  const comp = col('label_comp_id')
  const alt = col('label_alt_id')
  const model = col('pdbx_PDB_model_num')

  const label = new Map<string, ChainCoordinates>()
  const author = new Map<string, ChainCoordinates>()
  const shared = new Map<string, ChainCoordinates>()
  let firstModel: string | undefined
  for (; i < lines.length; i++) {
    const line = lines[i]!
    if (
      line.startsWith('#') ||
      line.startsWith('loop_') ||
      line.startsWith('_')
    ) {
      break
    }
    if (
      !(line.startsWith('ATOM') || line.startsWith('HETATM')) ||
      !line.includes(' CA ')
    ) {
      continue
    }
    const t = line.match(TOKEN)
    if (t?.[atom!] !== 'CA') {
      continue
    }
    const record = t[group!]
    const modified =
      record === 'HETATM' && comp !== undefined && t[comp] !== 'CA'
    if (record !== 'ATOM' && !modified) {
      continue
    }
    if (model !== undefined) {
      firstModel ??= t[model]
      if (t[model] !== firstModel) {
        continue
      }
    }
    const altId = alt === undefined ? '.' : t[alt]
    if (altId !== '.' && altId !== '?' && altId !== 'A') {
      continue
    }
    const labelSeqId = Number(t[seq!])
    if (!Number.isInteger(labelSeqId)) {
      continue
    }
    const position: Vec3 = [Number(t[cx!]), Number(t[cy!]), Number(t[cz!])]
    if (!position.every(Number.isFinite)) {
      continue
    }
    const labelId = t[asym!]!
    const authorId = auth === undefined ? labelId : (t[auth] ?? labelId)
    const pair = `${labelId}\u0000${authorId}`
    let residues = shared.get(pair)
    if (!residues) {
      residues = new Map<number, Vec3>()
      shared.set(pair, residues)
      label.set(labelId, residues)
      author.set(authorId, residues)
    }
    residues.set(labelSeqId, position)
  }
  return label.size > 0 ? { label, auth: author } : undefined
}
