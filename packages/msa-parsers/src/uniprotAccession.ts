const ACCESSION =
  /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})(?:(-\d+)|(\.\d+))?$/i

export interface UniProtAccession {
  accession: string
  suffix?: string
}

/**
 * A UniProtKB accession, uppercased, with any `-N` isoform or `.N` version
 * suffix split off. Undefined for an entry name, a RefSeq id or anything else.
 */
export function parseUniProtAccession(
  token: string,
): UniProtAccession | undefined {
  const match = ACCESSION.exec(token.trim())
  if (!match) {
    return undefined
  }
  const [, accession, isoform, version] = match
  const suffix = isoform ?? version
  return {
    accession: accession!.toUpperCase(),
    ...(suffix ? { suffix } : {}),
  }
}
