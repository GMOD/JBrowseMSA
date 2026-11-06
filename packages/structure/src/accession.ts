import { parseUniProtAccession } from 'msa-parsers'
import { getUniprotIdFromAlphaFoldTarget } from 'p2s_mapper'

function accessionOfToken(token: string) {
  const parsed =
    parseUniProtAccession(token) ?? parseUniProtAccession(token.split('_')[0]!)
  return parsed?.suffix?.startsWith('-')
    ? `${parsed.accession}${parsed.suffix}`
    : parsed?.accession
}

/**
 * The UniProt accession a row name carries, or undefined. A FASTA header from
 * UniProt (`sp|P04637|P53_HUMAN`), an AlphaFold id (`AF-P04637-F1`) and a bare
 * `P04637/1-393` all name one, as does the Pfam-style `Q6YDQ7_9VIRU/46-492`,
 * whose entry name is an accession and a species code. An entry name such as
 * `HBA_HUMAN` and a RefSeq id do not, and finding the accession for those takes
 * a lookup. An isoform suffix (`-2`) stays on the accession, and a version
 * suffix (`.2`) is dropped.
 */
export function accessionOfRowName(name: string) {
  return rowNameTokens(name)
    .map(token =>
      accessionOfToken(getUniprotIdFromAlphaFoldTarget(token) ?? token),
    )
    .find(accession => accession !== undefined)
}

/**
 * The words of a row name a database id could be, split on the separators
 * FASTA headers use. A token with a colon, such as `UniProtKB:P04637`, comes
 * whole and then in its parts.
 */
export function rowNameTokens(name: string) {
  return name
    .split(/[|\s/,;]/)
    .flatMap(token =>
      token.includes(':') ? [token, ...token.split(':')] : [token],
    )
}
