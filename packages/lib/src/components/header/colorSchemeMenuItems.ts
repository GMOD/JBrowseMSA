import type { MsaViewModel } from '../../model.ts'
import type { MenuItem } from '@jbrowse/core/ui/Menu'

type Alphabet = 'any' | 'nucleotide' | 'protein'

interface SchemeEntry {
  name: string
  label: string
  alphabet: Alphabet
  // shown at the top level for its alphabet, the rest under More schemes
  featured?: boolean
}

const schemes: SchemeEntry[] = [
  { name: 'maeditor', label: 'MAEditor', alphabet: 'protein', featured: true },
  {
    name: 'clustalx_protein',
    label: 'Clustal X',
    alphabet: 'protein',
    featured: true,
  },
  {
    name: 'clustalx_protein_dynamic',
    label: 'Clustal X, by column conservation',
    alphabet: 'protein',
    featured: true,
  },
  {
    name: 'blosum62_dynamic',
    label: 'BLOSUM62 similarity',
    alphabet: 'protein',
    featured: true,
  },
  {
    name: 'jalview_hydrophobicity',
    label: 'Hydrophobicity',
    alphabet: 'protein',
    featured: true,
  },
  {
    name: 'nucleotide',
    label: 'Nucleotide',
    alphabet: 'nucleotide',
    featured: true,
  },
  {
    name: 'rainbow_dna',
    label: 'Rainbow',
    alphabet: 'nucleotide',
    featured: true,
  },
  {
    name: 'percent_identity_dynamic',
    label: 'Percent identity',
    alphabet: 'any',
    featured: true,
  },
  { name: 'none', label: 'None', alphabet: 'any', featured: true },
  { name: 'clustal', label: 'Clustal', alphabet: 'protein' },
  { name: 'lesk', label: 'Lesk', alphabet: 'protein' },
  { name: 'flower', label: 'Flower', alphabet: 'protein' },
  { name: 'cinema', label: 'Cinema', alphabet: 'protein' },
  { name: 'jalview_zappo', label: 'Zappo', alphabet: 'protein' },
  { name: 'jalview_taylor', label: 'Taylor', alphabet: 'protein' },
  { name: 'jalview_buried', label: 'Buried index', alphabet: 'protein' },
  { name: 'jalview_prophelix', label: 'Helix propensity', alphabet: 'protein' },
  {
    name: 'jalview_propstrand',
    label: 'Strand propensity',
    alphabet: 'protein',
  },
  { name: 'jalview_propturn', label: 'Turn propensity', alphabet: 'protein' },
  { name: 'clustalx_dna', label: 'Clustal X (DNA)', alphabet: 'nucleotide' },
  { name: 'jbrowse_dna', label: 'JBrowse (DNA)', alphabet: 'nucleotide' },
]

export const catalogedSchemeNames = schemes.map(s => s.name)

// While the residue color lists letters in its `domain`, a checked Custom
// entry stands for them and no named scheme is checked. Picking a named scheme
// clears the letters. The active scheme always shows at the top level. While
// the domains fill the cells no scheme is checked, and picking one hands the
// cells back to it.
export function colorSchemeMenuItems(model: MsaViewModel): MenuItem[] {
  const { cellFill, resolvedResidueColor, sequenceType } = model
  const { letters, scheme } = resolvedResidueColor
  const alphabet = sequenceType === 'amino' ? 'protein' : 'nucleotide'
  const schemeShown = cellFill !== 'domain'
  function takeCells() {
    if (model.cellFill === 'domain') {
      model.setCellFill('residue')
    }
  }
  function radio(entry: SchemeEntry) {
    return {
      label: entry.label,
      type: 'radio',
      checked: schemeShown && !letters && scheme === entry.name,
      onClick: () => {
        model.setResidueColor({
          ...model.residueColor,
          scale: { scheme: entry.name },
        })
        takeCells()
      },
    } as const
  }
  const top = (e: SchemeEntry) =>
    (e.featured === true &&
      (e.alphabet === 'any' || e.alphabet === alphabet)) ||
    (!letters && e.name === scheme)
  return [
    ...(letters
      ? [
          {
            label: 'Custom',
            type: 'radio',
            checked: schemeShown,
            onClick: takeCells,
          } as const,
        ]
      : []),
    ...schemes.filter(top).map(radio),
    {
      label: 'More schemes',
      type: 'subMenu',
      subMenu: schemes.filter(e => !top(e)).map(radio),
    },
  ]
}
