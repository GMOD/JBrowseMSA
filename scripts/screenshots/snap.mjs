// A #data= deep link for a snapshot that loads hosted files through its
// *Filehandle props (data/<file>, served at the app root) rather than inlining
// the alignment, so the link stays a few hundred bytes. The uri is relative, so
// it resolves against localhost during capture and gmod.org/JBrowseMSA/demo/
// once deployed.
export function fileSnap(msaview) {
  const snap = { msaview: { type: 'MsaView', ...msaview } }
  return `#data=${encodeURIComponent(JSON.stringify(snap))}`
}

// An aligned FASTA's rows by name
export function alignedRows(fasta) {
  const rows = {}
  let name
  for (const line of fasta.split('\n')) {
    if (line.startsWith('>')) {
      name = line.slice(1).trim()
      rows[name] = ''
    } else if (name) {
      rows[name] += line.trim()
    }
  }
  return rows
}

// The 0-based column of each residue of an aligned row, residue n at [n - 1],
// skipping both gap characters the way buildSeqPosIndex in msa-coordinates does
export function residueColumns(row) {
  return [...row].flatMap((letter, column) =>
    letter === '-' || letter === '.' ? [] : [column],
  )
}

// A color per value as the color object spells it: a `scale` with the values as
// `domain`, in key order, which is legend order, and their colors as `range`
export function domainRange(colors) {
  return {
    scale: { domain: Object.keys(colors), range: Object.values(colors) },
  }
}
