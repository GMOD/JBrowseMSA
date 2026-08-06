// On-demand cross-species protein alignment for any gene, built live in the
// browser (there's no precomputed alignment outside the human 100-way):
//   1. NCBI Datasets orthologs endpoint  -> one ortholog gene per species
//   2. product_report                    -> a representative protein per gene
//      (MANE Select where flagged, else the longest isoform)
//   3. efetch FASTA                       -> the protein sequences
//   4. EBI Clustal Omega                  -> a column-locked alignment + tree
// The query species' row uses the same protein the 3D view aligns to, so the
// MSA <-> genome <-> structure mapping stays consistent. Mirrors jb2hubs'
// proteinMsa assembler, trimmed to what the gene explorer needs.

import { clustalOmega, unwrapFasta } from './ebiAlign'
import { DATASETS, EUTILS, ncbiJson, ncbiText } from './speciesGenes'

// A readable panel spanning the tree from close relatives out to plant/fungus.
// Orthologs absent for a given gene are simply skipped; rank orders the rows.
const PANEL: { taxId: number; label: string }[] = [
  { taxId: 9606, label: 'Human' },
  { taxId: 10090, label: 'Mouse' },
  { taxId: 10116, label: 'Rat' },
  { taxId: 9913, label: 'Cow' },
  { taxId: 9615, label: 'Dog' },
  { taxId: 9031, label: 'Chicken' },
  { taxId: 8364, label: 'Xenopus' },
  { taxId: 7955, label: 'Zebrafish' },
  { taxId: 7227, label: 'Fruit_fly' },
  { taxId: 6239, label: 'C_elegans' },
  { taxId: 4932, label: 'Yeast' },
  { taxId: 3702, label: 'Arabidopsis' },
]
const RANK = new Map(PANEL.map((p, i) => [p.taxId, i]))
const LABEL = new Map(PANEL.map(p => [p.taxId, p.label]))

export interface OrthologMsa {
  fasta: string
  newick: string
  querySeqName: string
  rowCount: number
}

interface OrthologGene {
  taxId: number
  geneId: string
}

interface OrthologReport {
  reports?: { gene?: { gene_id?: string; tax_id?: string | number } }[]
}

// One ortholog gene per panel species (first seen wins), excluding the query
// species, whose row we build from the protein the 3D view already uses.
async function fetchOrthologGenes(
  geneId: string,
  queryTaxId: number,
): Promise<OrthologGene[]> {
  const json = await ncbiJson<OrthologReport>(
    `${DATASETS}/gene/id/${geneId}/orthologs?returned_content=COMPLETE`,
  )
  const byTaxId = new Map<number, OrthologGene>()
  for (const { gene } of json.reports ?? []) {
    const taxId = Number(gene?.tax_id)
    if (
      gene?.gene_id &&
      taxId !== queryTaxId &&
      RANK.has(taxId) &&
      !byTaxId.has(taxId)
    ) {
      byTaxId.set(taxId, { taxId, geneId: gene.gene_id })
    }
  }
  return [...byTaxId.values()].sort(
    (a, b) => (RANK.get(a.taxId) ?? 0) - (RANK.get(b.taxId) ?? 0),
  )
}

interface ProductReport {
  reports?: {
    product?: {
      gene_id?: string
      transcripts?: {
        select_category?: string
        protein?: { accession_version?: string; length?: number }
      }[]
    }
  }[]
}

// geneId -> representative protein accession: MANE Select where flagged, else the
// longest isoform (a stable, comparable choice across species).
async function fetchRepresentativeProteins(
  geneIds: string[],
): Promise<Map<string, string>> {
  const byGene = new Map<string, string>()
  if (geneIds.length > 0) {
    const json = await ncbiJson<ProductReport>(
      `${DATASETS}/gene/id/${geneIds.join(',')}/product_report`,
    )
    for (const { product } of json.reports ?? []) {
      const candidates = (product?.transcripts ?? [])
        .map(t => ({
          acc: t.protein?.accession_version,
          len: t.protein?.length ?? 0,
          mane: /select/i.test(t.select_category ?? ''),
        }))
        .filter(
          (c): c is { acc: string; len: number; mane: boolean } => !!c.acc,
        )
      const best =
        candidates.find(c => c.mane) ??
        [...candidates].sort((a, b) => b.len - a.len).at(0)
      if (product?.gene_id && best) {
        byGene.set(product.gene_id, best.acc)
      }
    }
  }
  return byGene
}

// accession (first header token) -> ungapped sequence, from a multi-FASTA.
function parseFasta(text: string): Map<string, string> {
  const map = new Map<string, string>()
  let acc: string | undefined
  let buf: string[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      if (acc) {
        map.set(acc, buf.join(''))
      }
      acc = line.slice(1).split(/\s+/)[0]
      buf = []
    } else {
      buf.push(line.trim())
    }
  }
  if (acc) {
    map.set(acc, buf.join(''))
  }
  return map
}

// Build the cross-species alignment for a gene. The query row (labeled by the
// query species) carries queryProtein — the exact sequence the 3D view aligns to
// — so it's the row the connectedFeature maps genome coordinates through.
export async function buildOrthologMsa(
  geneId: string,
  queryTaxId: number,
  queryProtein: string,
  onProgress: (message: string) => void,
): Promise<OrthologMsa> {
  const querySeqName = LABEL.get(queryTaxId) ?? `taxon_${queryTaxId}`

  onProgress('Finding orthologs across species…')
  const orthologs = await fetchOrthologGenes(geneId, queryTaxId)
  if (orthologs.length < 2) {
    throw new Error(
      `Only ${orthologs.length} ortholog(s) found — not enough to align`,
    )
  }

  onProgress('Selecting a representative protein per species…')
  const proteinByGene = await fetchRepresentativeProteins(
    orthologs.map(o => o.geneId),
  )
  const withProtein = orthologs.filter(o => proteinByGene.has(o.geneId))

  onProgress('Fetching protein sequences…')
  const accessions = withProtein.map(o => proteinByGene.get(o.geneId)!)
  const seqByAcc = await ncbiText(
    `${EUTILS}/efetch.fcgi?db=protein&id=${accessions.join(',')}&rettype=fasta&retmode=text`,
  ).then(parseFasta)

  // query row first, then one row per ortholog species with a resolved sequence
  const rows = [
    { label: querySeqName, seq: queryProtein },
    ...withProtein
      .map(o => ({
        label: LABEL.get(o.taxId) ?? `taxon_${o.taxId}`,
        seq: seqByAcc.get(proteinByGene.get(o.geneId)!) ?? '',
      }))
      .filter(r => r.seq),
  ]
  if (rows.length < 3) {
    throw new Error('Could not fetch enough ortholog sequences to align')
  }

  const inputFasta = rows.map(r => `>${r.label}\n${r.seq}`).join('\n')
  const { aligned, newick } = await clustalOmega(inputFasta, onProgress)
  return {
    fasta: unwrapFasta(aligned),
    newick,
    querySeqName,
    rowCount: rows.length,
  }
}
