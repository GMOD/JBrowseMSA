import { useState } from 'react'

import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import {
  aquaporinDomainsGFF,
  aquaporinMSA,
  aquaporinTree,
  cytochromeCMSA,
  cytochromeCTree,
  ef1aDomainsGFF,
  ef1aMSA,
  ef1aTree,
  globinMSA,
  globinTree,
  histoneH4MSA,
  histoneH4Tree,
  hoxDomainsGFF,
  hoxMSA,
  hoxTree,
  myd88DomainsGFF,
  myd88MSA,
  myd88Tree,
  nlrp1DomainsGFF,
  nlrp1MSA,
  nlrp1Tree,
  opsinDomainsGFF,
  opsinMSA,
  opsinTree,
  prestinDomainsGFF,
  prestinMSA,
  prestinTree,
} from './data'

interface Family {
  label: string
  msa: string
  tree: string
  gff?: string
  relativeTo?: string
  height: number
  caption: string
  reference?: { text: string; href: string }
}

// scripts/examples-gen builds every alignment from UniProt sequences with
// ClustalW and infers its tree, and react-msaview-cli interpro writes the
// domain GFFs. relativeTo="Human" draws a residue identical to the human row as
// a dot.
const families = {
  globins: {
    label: 'Globins: gene duplication',
    msa: globinMSA,
    tree: globinTree,
    height: 460,
    caption:
      'Hemoglobin alpha and beta, myoglobin, neuroglobin and cytoglobin ' +
      'across a few vertebrates. The tree groups the rows by globin type, ' +
      'alpha chains together and beta chains together, the signature of the ' +
      'gene duplications Zuckerkandl and Pauling read in the globins to ' +
      'propose the molecular clock (Evolving Genes and Proteins, 1965).',
  },
  cytochromeC: {
    label: 'Cytochrome c: deep phylogeny',
    msa: cytochromeCMSA,
    tree: cytochromeCTree,
    height: 320,
    caption:
      'A hundred-residue protein that every aerobe has, here in mammals, a ' +
      'reptile, a fish, an insect, a plant and a fungus. It is short enough ' +
      'to read whole, and its tree spans well over a billion years. Fitch ' +
      'and Margoliash built the molecular clock on cytochrome c.',
    reference: {
      text: 'Fitch & Margoliash 1967, Science',
      href: 'https://www.science.org/doi/10.1126/science.155.3760.279',
    },
  },
  ef1a: {
    label: 'EF-1α / EF-Tu: tree of life',
    msa: ef1aMSA,
    tree: ef1aTree,
    gff: ef1aDomainsGFF,
    height: 420,
    caption:
      'The same elongation factor in bacteria (EF-Tu), archaea and ' +
      'eukaryotes (EF-1α), about as far apart as two sequences get while ' +
      'staying alignable. The eukaryotes and bacteria each form a clade and ' +
      'the archaea fall near the root (labels prefixed Euk_, Arc_, Bac_). ' +
      'The domains are the GTP-binding G domain and two beta-barrel domains, ' +
      'in all three domains of life.',
    reference: {
      text: 'Iwabe et al. 1989, PNAS',
      href: 'https://doi.org/10.1073/pnas.86.23.9355',
    },
  },
  opsins: {
    label: 'Opsins: color vision',
    msa: opsinMSA,
    tree: opsinTree,
    gff: opsinDomainsGFF,
    height: 420,
    caption:
      'Vertebrate visual pigments. The tree sorts them into opsin classes, ' +
      'the dim-light rhodopsins (RH1) in one clade and the cone opsins (RH2 ' +
      'green, SWS1 UV to blue, LWS red/green) in others, following the gene ' +
      'duplications behind color vision. The domain overlay marks the ' +
      '7-transmembrane GPCR fold every opsin shares.',
    reference: {
      text: 'Yokoyama 2000, Prog. Retin. Eye Res.',
      href: 'https://pubmed.ncbi.nlm.nih.gov/10785616/',
    },
  },
  aquaporins: {
    label: 'Aquaporins: a channel family',
    msa: aquaporinMSA,
    tree: aquaporinTree,
    gff: aquaporinDomainsGFF,
    height: 380,
    caption:
      'The aquaporin (MIP) family, one shared six-transmembrane domain in ' +
      'every row. The tree splits on what the channel passes: the water-only ' +
      'channels AQP0/1/2/4/5 on one side, and the "_glycerol" ' +
      'aquaglyceroporins AQP3/7/9 on the other.',
  },
  hox: {
    label: 'Hox: one conserved domain',
    msa: hoxMSA,
    tree: hoxTree,
    gff: hoxDomainsGFF,
    height: 420,
    caption:
      'Thirteen human Hox proteins, one per paralog group. They align poorly ' +
      'everywhere except the ~60-residue homeodomain that binds DNA, and the ' +
      'domain overlay marks that one block.',
    reference: {
      text: 'Gehring et al. 1994, Annu. Rev. Biochem.',
      href: 'https://doi.org/10.1146/annurev.bi.63.070194.002415',
    },
  },
  prestin: {
    label: 'Prestin: convergent evolution',
    msa: prestinMSA,
    tree: prestinTree,
    gff: prestinDomainsGFF,
    height: 440,
    caption:
      'Prestin (SLC26A5), the outer-hair-cell motor protein. Echolocating ' +
      'bats and toothed whales independently evolved many of the same ' +
      'substitutions, so in this gene tree the "_echo" species cluster ' +
      'together against the species tree. The domains are the SLC26 ' +
      'transporter and the cytoplasmic STAS domain.',
    reference: {
      text: 'Li, Liu, Shi & Zhang 2010, Curr. Biol.',
      href: 'https://www.cell.com/current-biology/fulltext/S0960-9822(09)02057-0',
    },
  },
  nlrp1: {
    label: 'NLRP1: domain loss across orthologs',
    msa: nlrp1MSA,
    tree: nlrp1Tree,
    gff: nlrp1DomainsGFF,
    height: 500,
    caption:
      'Twelve NLRP1 orthologs that share a core of NACHT, winged helix, HD2, ' +
      'then FIIND / UPA-FIIND / CARD. The N-terminal PYD is present in the ' +
      'primates, dog and hedgehog and absent in the rodents, artiodactyls, ' +
      'horse and fish. The overlay places domains by alignment column: the ' +
      'shared NACHT starts at residue 328 in human and 93 in hamster, and ' +
      'lands within two columns of itself in every row.',
  },
  myd88: {
    label: 'MyD88: reference dots across bats',
    msa: myd88MSA,
    tree: myd88Tree,
    gff: myd88DomainsGFF,
    relativeTo: 'Human',
    height: 500,
    caption:
      'MyD88, a TLR/IL-1R signalling adaptor, across mammals including ' +
      'three bats, diffed against human, so lineage-specific substitutions ' +
      'show as letters among the dots. The domains are the N-terminal Death ' +
      'domain and the C-terminal TIR domain.',
    reference: {
      text: 'Tian et al. 2023, Sci. Adv.',
      href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10162675/',
    },
  },
  histoneH4: {
    label: 'Histone H4: extreme conservation',
    msa: histoneH4MSA,
    tree: histoneH4Tree,
    relativeTo: 'Human',
    height: 320,
    caption:
      'Histone H4 from human, chicken, fly, worm, plant, yeast and a ' +
      'ciliate, diffed against human. H4 is among the most conserved ' +
      'proteins known, and only the most distant lineages show letters.',
  },
} satisfies Record<string, Family>

type FamilyId = keyof typeof families

function isFamily(value: string): value is FamilyId {
  return value in families
}

export default function ProteinFamilies() {
  const [id, setId] = useState<FamilyId>('globins')
  const family: Family = families[id]
  const { msa, tree, gff, relativeTo, height, caption, reference } = family
  return (
    <div>
      <TextField
        select
        size="small"
        label="Family"
        value={id}
        onChange={event => {
          if (isFamily(event.target.value)) {
            setId(event.target.value)
          }
        }}
        sx={{ minWidth: 320 }}
      >
        {Object.entries(families).map(([key, { label }]) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="body2" sx={{ my: 1 }}>
        {caption}{' '}
        {reference ? <Link href={reference.href}>{reference.text}</Link> : null}
      </Typography>
      <MSAViewer
        msa={msa}
        tree={tree}
        gff={gff}
        relativeTo={relativeTo}
        residueColor={{ scale: { scheme: 'clustalx_protein_dynamic' } }}
        height={height}
      />
    </div>
  )
}
