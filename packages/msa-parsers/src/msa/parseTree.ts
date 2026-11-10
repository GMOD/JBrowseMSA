import { isEmf, parseEmfTree } from './emf.ts'
import { flatToTree } from './flatToTree.ts'
import { parseAsn1 } from './parseAsn1.ts'
import parseNewick from './parseNewick.ts'

/**
 * A tree file in any format the viewer reads: an NCBI BioTreeContainer (the
 * ASN.1 BLAST's tree view saves), an EMF file's tree, or Newick.
 */
export function parseTree(text: string) {
  return text.startsWith('BioTreeContainer')
    ? flatToTree(parseAsn1(text))
    : parseNewick(isEmf(text) ? parseEmfTree(text).tree : text)
}
