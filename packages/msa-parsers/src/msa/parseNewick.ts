import { parseNewick } from '@gmod/newick'

import type { NewickNode } from '@gmod/newick'

/**
 * Newick parsing for phylogenetic trees.
 *
 * `postParenNumeric: 'name'` is the whole reason this wrapper exists. A bare
 * number after a `)` is an internal node label in standard Newick -- typically a
 * bootstrap support value -- but `@gmod/hclust` reuses that slot for a cluster's
 * merge height, and the parser's default guesses between the two by whether the
 * tree carries any `:` branch length. Everything reaching this package is a
 * phylogeny (newick, the tree embedded in Stockholm `#=GF NH`, EMF, ASN.1), so
 * the guess is settled here instead: reading `((A,B)95,(C,D)80);` as lengths
 * would draw a phylogram scaled by support values.
 */
export default function parse(s: string): NewickNode {
  return parseNewick(s, { postParenNumeric: 'name' })
}
