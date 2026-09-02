import Ace2 from './Ace2'
import Ace2Src from './Ace2.tsx?raw'
import Aquaporin from './Aquaporin'
import AquaporinSrc from './Aquaporin.tsx?raw'
import ColorSchemes from './ColorSchemes'
import ColorSchemesSrc from './ColorSchemes.tsx?raw'
import ColumnTracks from './ColumnTracks'
import ColumnTracksSrc from './ColumnTracks.tsx?raw'
import CytochromeC from './CytochromeC'
import CytochromeCSrc from './CytochromeC.tsx?raw'
import Domains from './Domains'
import DomainsSrc from './Domains.tsx?raw'
import Ef1a from './Ef1a'
import Ef1aSrc from './Ef1a.tsx?raw'
import F12 from './F12'
import F12Src from './F12.tsx?raw'
import GeneCluster from './GeneCluster'
import GeneClusterSrc from './GeneCluster.tsx?raw'
import Globin from './Globin'
import GlobinSrc from './Globin.tsx?raw'
import Hammerhead from './Hammerhead'
import HammerheadSrc from './Hammerhead.tsx?raw'
import HistoneH4 from './HistoneH4'
import HistoneH4Src from './HistoneH4.tsx?raw'
import Hox from './Hox'
import HoxSrc from './Hox.tsx?raw'
import Insulin from './Insulin'
import InsulinSrc from './Insulin.tsx?raw'
import LargeTree from './LargeTree'
import LargeTreeSrc from './LargeTree.tsx?raw'
import LoadFromUrl from './LoadFromUrl'
import LoadFromUrlSrc from './LoadFromUrl.tsx?raw'
import ModelApi from './ModelApi'
import ModelApiSrc from './ModelApi.tsx?raw'
import Myd88 from './Myd88'
import Myd88Src from './Myd88.tsx?raw'
import Nextstrain from './Nextstrain'
import NextstrainSrc from './Nextstrain.tsx?raw'
import Nlrp1 from './Nlrp1'
import Nlrp1Src from './Nlrp1.tsx?raw'
import NucleotideAlignment from './NucleotideAlignment'
import NucleotideAlignmentSrc from './NucleotideAlignment.tsx?raw'
import Opsins from './Opsins'
import OpsinsSrc from './Opsins.tsx?raw'
import P53 from './P53'
import P53Src from './P53.tsx?raw'
import Prestin from './Prestin'
import PrestinSrc from './Prestin.tsx?raw'
import ProgrammaticControl from './ProgrammaticControl'
import ProgrammaticControlSrc from './ProgrammaticControl.tsx?raw'
import RealDomains from './RealDomains'
import RealDomainsSrc from './RealDomains.tsx?raw'
import TreeOptions from './TreeOptions'
import TreeOptionsSrc from './TreeOptions.tsx?raw'
import Trna from './Trna'
import TrnaSrc from './Trna.tsx?raw'
import ZeroConfig from './ZeroConfig'
import ZeroConfigSrc from './ZeroConfig.tsx?raw'

import type { ComponentType } from 'react'

// Sidebar groups, in display order. Every example carries one of these.
export const categoryOrder = [
  'Getting started',
  'API & control',
  'Protein domains',
  'Conservation & diffing',
  'Phylogeny',
  'RNA structure',
  'Genes & DNA',
] as const

export type Category = (typeof categoryOrder)[number]

export interface Example {
  name: string
  category: Category
  description: string
  Component: ComponentType
  source: string
}

// Stable URL/anchor slug derived from an example name, shared by both the
// standalone app and the website so deep links match.
export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

export const examples: Example[] = [
  {
    name: 'Zero-config viewer',
    category: 'Getting started',
    description:
      'The simplest usage: pass alignment + tree text as strings to MSAViewer.',
    Component: ZeroConfig,
    source: ZeroConfigSrc,
  },
  {
    name: 'Nucleotide alignment',
    category: 'Getting started',
    description:
      'A DNA alignment with no tree, using a nucleotide color scheme.',
    Component: NucleotideAlignment,
    source: NucleotideAlignmentSrc,
  },
  {
    name: 'Load from URL',
    category: 'Getting started',
    description:
      'Fetch a remote Stockholm alignment plus an InterProScan domain GFF.',
    Component: LoadFromUrl,
    source: LoadFromUrlSrc,
  },
  {
    name: 'Model API',
    category: 'API & control',
    description:
      'Create the model yourself with MSAModelF and render it with MSAView.',
    Component: ModelApi,
    source: ModelApiSrc,
  },
  {
    name: 'Programmatic control',
    category: 'API & control',
    description: 'Drive the viewer by calling model actions from buttons.',
    Component: ProgrammaticControl,
    source: ProgrammaticControlSrc,
  },
  {
    name: 'Tracks from data',
    category: 'API & control',
    description:
      'Draw a number you computed per residue as a track, through the columnTracks prop.',
    Component: ColumnTracks,
    source: ColumnTracksSrc,
  },
  {
    name: 'Color schemes',
    category: 'API & control',
    description:
      'Switch color schemes at runtime via model.setColorSchemeName.',
    Component: ColorSchemes,
    source: ColorSchemesSrc,
  },
  {
    name: 'Tree options',
    category: 'API & control',
    description:
      'Toggle branch lengths, label alignment, node bubbles, and the tree panel.',
    Component: TreeOptions,
    source: TreeOptionsSrc,
  },
  {
    name: 'Protein domains',
    category: 'Protein domains',
    description:
      'Overlay InterProScan domain annotations from an inline GFF3 string.',
    Component: Domains,
    source: DomainsSrc,
  },
  {
    name: 'Real domains (Src-family kinases)',
    category: 'Protein domains',
    description:
      'A real Src-family kinase family (SRC, FYN, LCK, ...) with its tree and ' +
      'real InterProScan annotations — the signature SH3 + SH2 + kinase ' +
      'domains generated by react-msaview-cli interproscan.',
    Component: RealDomains,
    source: RealDomainsSrc,
  },
  {
    name: 'Domain architecture (p53)',
    category: 'Protein domains',
    description:
      'p53 with its InterProScan domains overlaid — the central DNA-binding ' +
      'domain (where most cancer mutations fall) forms the bulk of the protein, ' +
      'flanked by the short N-terminal transactivation motifs, with the ' +
      'reference diff showing as dots in the unannotated linkers.',
    Component: P53,
    source: P53Src,
  },
  {
    name: 'Domain loss across orthologs (NLRP1)',
    category: 'Protein domains',
    description:
      'Twelve NLRP1 orthologs that share a six-domain core but differ at the ' +
      'N terminus: the PYD is present in primates, dog and hedgehog and absent ' +
      'in rodents, artiodactyls, horse and fish. The core domains sit up to 391 ' +
      'residues apart between rows yet land within 2 alignment columns — which ' +
      'is why the overlay is column-locked and not drawn per-protein.',
    Component: Nlrp1,
    source: Nlrp1Src,
  },
  {
    name: 'One conserved domain (Hox homeodomain)',
    category: 'Protein domains',
    description:
      'Hox transcription factors are wildly divergent except for the ~60-residue ' +
      'homeodomain they all share — the InterProScan overlay marks the one ' +
      'block that stays conserved across the family.',
    Component: Hox,
    source: HoxSrc,
  },
  {
    name: 'Color vision (opsin duplications)',
    category: 'Protein domains',
    description:
      'Vertebrate opsins sorted by class (rhodopsins vs cone opsins) with a ' +
      'real InterProScan 7TM-GPCR domain overlay — a color-vision duplication ' +
      'history.',
    Component: Opsins,
    source: OpsinsSrc,
  },
  {
    name: 'Channel family (aquaporins)',
    category: 'Protein domains',
    description:
      'The aquaporin (MIP) family: all share one six-transmembrane domain ' +
      '(InterProScan overlay) but the tree splits water-only channels from the ' +
      '"_glycerol" aquaglyceroporins — grouping by function.',
    Component: Aquaporin,
    source: AquaporinSrc,
  },
  {
    name: 'Reference dots (MyD88 across bats)',
    category: 'Conservation & diffing',
    description:
      'MyD88 across mammals incl. bats, diffed against human (relativeTo) so ' +
      'identical residues show as dots and lineage-specific changes stand out, ' +
      'beside the inferred tree.',
    Component: Myd88,
    source: Myd88Src,
  },
  {
    name: 'Host range (ACE2 / SARS-CoV-2 receptor)',
    category: 'Conservation & diffing',
    description:
      'ACE2 across mammals (bats, civet, pangolin, resistant rodents) diffed ' +
      'against human, so the few spike-contact positions that drive viral ' +
      'susceptibility stand out.',
    Component: Ace2,
    source: Ace2Src,
  },
  {
    name: 'Extreme conservation (histone H4)',
    category: 'Conservation & diffing',
    description:
      'Histone H4 across eukaryotes diffed against human — one of the most ' +
      'conserved proteins known renders almost entirely as dots, the opposite ' +
      'extreme from a fast-evolving protein.',
    Component: HistoneH4,
    source: HistoneH4Src,
  },
  {
    name: 'Processing vs conservation (insulin)',
    category: 'Conservation & diffing',
    description:
      'Preproinsulin across vertebrates diffed against human — the B and A ' +
      'chains of mature insulin stay conserved (dots) while the cleaved-out ' +
      'C-peptide drifts (letters).',
    Component: Insulin,
    source: InsulinSrc,
  },
  {
    name: 'Gene duplication (globin family)',
    category: 'Phylogeny',
    description:
      'Hemoglobin alpha/beta, myoglobin, neuroglobin and cytoglobin — the ' +
      'inferred tree groups by globin type, not species: the signature of ' +
      'gene duplication.',
    Component: Globin,
    source: GlobinSrc,
  },
  {
    name: 'Deep phylogeny (cytochrome c)',
    category: 'Phylogeny',
    description:
      'Cytochrome c from mammals to plants and fungi in one short alignment — ' +
      'the inferred tree spans over a billion years of evolution.',
    Component: CytochromeC,
    source: CytochromeCSrc,
  },
  {
    name: 'Convergent evolution (prestin / echolocation)',
    category: 'Phylogeny',
    description:
      'Prestin (SLC26A5): echolocating bats and toothed whales convergently ' +
      'evolved shared changes, so the "_echo" species cluster together against ' +
      'the species tree.',
    Component: Prestin,
    source: PrestinSrc,
  },
  {
    name: 'Tree of life (EF-1α / EF-Tu)',
    category: 'Phylogeny',
    description:
      'Elongation factor across all three domains of life (bacteria, archaea, ' +
      'eukaryotes) in one alignment — a universal protein used to probe the ' +
      'deepest splits in the tree of life.',
    Component: Ef1a,
    source: Ef1aSrc,
  },
  {
    name: 'Large tree (Lysine riboswitch)',
    category: 'Phylogeny',
    description:
      'A real ~60 sequence ncRNA family (Rfam Lysine riboswitch) with its ' +
      'full inferred tree — shows the canvas tiling holds up past toy data.',
    Component: LargeTree,
    source: LargeTreeSrc,
  },
  {
    name: 'Nextstrain pathogens',
    category: 'Phylogeny',
    description:
      'Real Nextstrain phylogenies (SARS-CoV-2, Zika, Ebola, measles, RSV-A) ' +
      'reconstructed into a gap-free reference-coordinate MSA — no aligner ' +
      'needed since Nextstrain tips are stored as mutations against the ' +
      'reference.',
    Component: Nextstrain,
    source: NextstrainSrc,
  },
  {
    name: 'RNA secondary structure (tRNA)',
    category: 'RNA structure',
    description:
      'Transfer RNA (Rfam RF00005): the Stockholm SS_cons cloverleaf renders ' +
      'as a secondary-structure track, coloring the acceptor stem and D/' +
      'anticodon/T arms by base-pairing above the alignment.',
    Component: Trna,
    source: TrnaSrc,
  },
  {
    name: 'Ribozyme structure (hammerhead)',
    category: 'RNA structure',
    description:
      'Hammerhead ribozyme (Rfam RF00008), a small self-cleaving catalytic ' +
      'RNA: the SS_cons track shows its three-way helix junction colored by ' +
      'base-pairing — a catalytic-RNA counterpoint to the tRNA cloverleaf.',
    Component: Hammerhead,
    source: HammerheadSrc,
  },
  {
    name: 'Gene loss + exon structure (F12 in cetaceans)',
    category: 'Genes & DNA',
    description:
      'A DNA coding alignment of coagulation factor XII with its 14-exon gene ' +
      'structure overlaid (each exon the same color across species). F12 is ' +
      'intact in land mammals and the manatee but disabled in cetaceans by a ' +
      'shared frameshift in exon 3 + premature stops — pseudogenization read ' +
      'straight off the nucleotides, which a protein alignment cannot show.',
    Component: F12,
    source: F12Src,
  },
  {
    name: 'Gene arrow map (gggenes-style)',
    category: 'Genes & DNA',
    description:
      'A colinear gene cluster across 6 genomes with each gene drawn as a ' +
      'strand-directed arrow (gggenes-style), overlaid on a real alignment. ' +
      'Genes keep one color down the columns; two are inverted (the arrow ' +
      'flips) and one is deleted (its columns gap out) — yet every gene stays ' +
      'column-aligned, because the arrows are anchored to alignment columns ' +
      'rather than each genome’s own coordinate. Synthetic demo data.',
    Component: GeneCluster,
    source: GeneClusterSrc,
  },
]
