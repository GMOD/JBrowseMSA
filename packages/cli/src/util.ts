export function toFasta(sequences: { id: string; seq: string }[]) {
  return sequences.map(s => `>${s.id}\n${s.seq}`).join('\n')
}
