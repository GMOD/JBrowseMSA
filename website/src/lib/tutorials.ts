// Every page the tutorial index cards, in reading order. All but the last are
// docs/tutorials/*.md walkthroughs: the markdown is the page, and this list
// holds the card text and the browser title, which markdown has no field for.
// Adding a tutorial means a file there plus an entry here.
//
// The last entry, jbrowse_integration, is the hand-written
// pages/tutorials/jbrowse_integration.astro instead, because its content is
// generated session URLs rather than prose. [slug].astro builds only the slugs
// the markdown glob produces, so the two never collide.
//
// The index is also the site's gallery, so each entry names a `thumb`: one of
// the figures that page already shows, which Astro crops to the card's 5:3 and
// re-encodes as a webp at build time. Pointing at the page's own figure keeps a
// card from drifting from it, and adds no file to docs/media.
// `thumbPosition` is what the crop keeps. A wide figure loses width, and 'left'
// holds the tree and row labels; a tall one loses height, and 'center' skips the
// toolbar and the pale first rows for the body of the alignment.

import codonThumb from '../../../docs/media/codon-spry-patch.png'
import fluThumb from '../../../docs/media/flu-drift-siteb.png'
import jbrowseThumb from '../../../docs/media/genome-browser-tp53-protein3d.png'
import kinaseThumb from '../../../docs/media/kinase-pocket-family.png'
import p53Thumb from '../../../docs/media/p53-variant-three-tracks.png'
import proteinThumb from '../../../docs/media/protein-family-domains.png'
import proteaseThumb from '../../../docs/media/r-protease-triad.png'
import rnaThumb from '../../../docs/media/rna-family-overview.png'
import scaleThumb from '../../../docs/media/scale-clade-groups.png'
import spikeThumb from '../../../docs/media/spike-structure-final.png'

import type { ImageMetadata } from 'astro'

export interface Tutorial {
  /** basename of the file in docs/tutorials, without .md */
  slug: string
  title: string
  blurb: string
  thumb: ImageMetadata
  thumbAlt: string
  thumbPosition: 'left' | 'center'
}

export const tutorials: Tutorial[] = [
  {
    slug: 'protein_family',
    title: 'A protein family from a list of accessions',
    blurb:
      'Twelve UniProt accessions to an alignment, a tree and Pfam domains, in four commands outside the viewer. Every step has a figure, and the last one is a link that shows which lineages lost a domain.',
    thumb: proteinThumb,
    thumbAlt:
      'Twelve NLRP1 orthologs with their Pfam domains as colored blocks, the pyrin domain present in only five rows',
    thumbPosition: 'left',
  },
  {
    slug: 'p53_variant_effects',
    title: "Where p53's damaging variants fall",
    blurb:
      'ClinVar, AlphaMissense and a saturation screen, each a bar per residue over the same fifteen-species p53 alignment. The three sources share no data and draw over the same columns.',
    thumb: p53Thumb,
    thumbAlt:
      'Three bar tracks — ClinVar, AlphaMissense and MaveDB — over a p53 ortholog alignment, all three peaking on the DNA-binding domain',
    thumbPosition: 'left',
  },
  {
    slug: 'spike_structure',
    title: 'The SARS-CoV-2 furin insert and PDB 6VXX',
    blurb:
      'Eleven coronavirus spikes, the four residues only SARS-CoV-2 carries, and a SIFTS correspondence recording which residues of that row PDB 6VXX resolved.',
    thumb: spikeThumb,
    thumbAlt:
      'Eleven coronavirus spike proteins with their domains as colored blocks and a track marking the residues PDB 6VXX resolved',
    thumbPosition: 'left',
  },
  {
    slug: 'kinase_pocket',
    title: 'Reading cross-reactivity off the kinase pocket',
    blurb:
      '474 human kinase domains aligned with hmmalign, with a FastTree tree. The page compares the ATP-pocket residues of kinases imatinib inhibits with those it does not; the gatekeeper column reads threonine in 19% of them.',
    thumb: kinaseThumb,
    thumbAlt:
      '474 human kinase domains as one alignment beside their tree, the conserved catalytic columns standing out as solid stripes',
    thumbPosition: 'center',
  },
  {
    slug: 'rna_family',
    title: 'An RNA family, from a model and six genomes',
    blurb:
      'Search six bacterial genomes with an Rfam covariance model, align the 37 hits back to it, and read the consensus structure off the result: helix arcs, a pseudoknot, and the columns that hold still because the ligand touches them.',
    thumb: rnaThumb,
    thumbAlt:
      '37 SAM riboswitch hits aligned under a consensus secondary structure, with base-pair arcs spanning the helices',
    thumbPosition: 'left',
  },
  {
    slug: 'phylogeny_at_scale',
    title: 'An RSV phylogeny from a public Nextstrain build',
    blurb:
      'A Nextstrain tree of 1,840 RSV genomes, reconstructed to one whole-genome alignment and opened at every scale from the whole tree to a single variable column.',
    thumb: scaleThumb,
    thumbAlt:
      '1,840 RSV genomes as one alignment beside their tree, the clades reading as labeled bands of color',
    thumbPosition: 'center',
  },
  {
    slug: 'codon_selection',
    title: 'TRIM5 and the primate antiviral arms race',
    blurb:
      '32 TRIM5 orthologs to a codon alignment, a tree, an exon structure and a per-codon dN/dS track from HyPhy. Ends on a link where the variable patch behind HIV-1 restriction has high dN/dS and a zinc-finger control has low dN/dS.',
    thumb: codonThumb,
    thumbAlt:
      '32 primate TRIM5 orthologs at codon resolution over the SPRY v1 patch, with a red per-codon dN/dS track above',
    thumbPosition: 'left',
  },
  {
    slug: 'r_protease_triad',
    title: 'A protease family in R',
    blurb:
      'Fourteen peptidase S1 domains cut from UniProt entries with Biostrings, aligned with DECIPHER, a tree from ape, and two layers R computes. Nine rows read the catalytic H, D and S; five read something else.',
    thumb: proteaseThumb,
    thumbAlt:
      'The GDSGGP motif of nine serine proteases beside five relatives that read A, M, Y or G at the catalytic serine',
    thumbPosition: 'left',
  },
  {
    slug: 'notebook_flu_drift',
    title: 'Influenza drift in a notebook',
    blurb:
      '25 H3N2 vaccine strains from 1968 to 2022 as one hemagglutinin alignment in Jupyter, with a per-column count of how often each column changed. Antigenic site B reads 24 different strings; the fusion peptide reads two.',
    thumb: fluThumb,
    thumbAlt:
      'Antigenic site B across 25 influenza vaccine strains in year order, the letters under the two bands turning over every few rows',
    thumbPosition: 'left',
  },
  {
    slug: 'jbrowse_integration',
    title: 'JBrowse 2 integration',
    blurb:
      'The same alignment and tree opened inside JBrowse 2, beside a genome view and an AlphaFold structure. Selecting a region in one view highlights the matching columns, codons and residues in the others, and each session is a single URL.',
    thumb: jbrowseThumb,
    thumbAlt:
      'One JBrowse session holding the TP53 gene with ClinVar, the p53 ortholog alignment and the AlphaFold structure, connected',
    thumbPosition: 'center',
  },
]

export const tutorialBySlug = new Map(tutorials.map(t => [t.slug, t]))
