import { DATASETS, ncbiJson } from './speciesGenes'

interface OrthologReport {
  reports?: { gene?: { symbol?: string } }[]
}

// The gene's ortholog symbol in another species, so a species switch can keep
// the gene the visitor was looking at. NCBI's ortholog sets are vertebrate- and
// insect-scoped, so this resolves nothing for yeast, worm or plant targets.
export async function fetchOrthologSymbol(
  geneId: string,
  taxId: number,
): Promise<string | undefined> {
  const json = await ncbiJson<OrthologReport>(
    `${DATASETS}/gene/id/${geneId}/orthologs?taxon_filter=${taxId}`,
  )
  return json.reports?.[0]?.gene?.symbol
}
