/**
 * FASTA for a block of the alignment: each row's letters from column `start`
 * to `end`, 1-based and inclusive, under its name. Gaps stay in, and a row that
 * ends before `end` is padded with gaps, so every record is the block's width.
 */
export function blockFasta(
  rows: readonly (readonly [string, string])[],
  start: number,
  end: number,
) {
  const width = Math.max(0, end - start + 1)
  return rows
    .map(
      ([name, seq]) =>
        `>${name}\n${seq.slice(start - 1, end).padEnd(width, '-')}\n`,
    )
    .join('')
}
