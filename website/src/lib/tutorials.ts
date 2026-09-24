// Every page the tutorial index cards, in reading order. Most are
// docs/tutorials/*.md walkthroughs: the markdown is the page, and this list
// holds the card text and the browser title, which markdown has no field for.
// Adding a tutorial means a file there plus an entry here.
//
// Two entries are hand-written pages under pages/tutorials instead:
// structure_link, which mounts a live alignment beside a Mol* structure, and
// jbrowse_integration, whose content is generated session URLs. [slug].astro
// builds only the slugs the markdown glob produces, so neither collides.
//
// The index is also the site's gallery, so each entry names a `thumb`: one of
// the figures that page already shows, which Astro crops to the card's 5:3 and
// re-encodes as a webp at build time. Pointing at the page's own figure keeps a
// card from drifting from it, and adds no file to docs/media.
// `thumbPosition` is what the crop keeps. A wide figure loses width, and 'left'
// holds the tree and row labels; a tall one loses height, and 'center' skips the
// toolbar and the pale first rows for the body of the alignment.

import plddtThumb from '../../../docs/media/alphafold_confidence-8.png'
import codonThumb from '../../../docs/media/codon-spry-patch.png'
import fluThumb from '../../../docs/media/flu-drift-siteb.png'
import neighborhoodThumb from '../../../docs/media/gene_neighborhoods-3.png'
import jbrowseThumb from '../../../docs/media/genome-browser-tp53-protein3d.png'
import h5n1Thumb from '../../../docs/media/influenza_surveillance_figure-overview.png'
import kinaseThumb from '../../../docs/media/kinase-pocket-family.png'
import mitoThumb from '../../../docs/media/mitogenome_genes-4.png'
import norovirusThumb from '../../../docs/media/norovirus_recombination-4.png'
import p53Thumb from '../../../docs/media/p53-variant-three-tracks.png'
import metadataThumb from '../../../docs/media/phylogeny_metadata-tip-labels.png'
import proteinThumb from '../../../docs/media/protein-family-domains.png'
import complexThumb from '../../../docs/media/protein_complex-4.png'
import proteaseThumb from '../../../docs/media/r-protease-triad.png'
import recombinantThumb from '../../../docs/media/recombination_breakpoint-2.png'
import rnaThumb from '../../../docs/media/rna-family-overview.png'
import scaleThumb from '../../../docs/media/scale-clade-groups.png'
import spikeThumb from '../../../docs/media/spike-structure-final.png'
import structureLinkThumb from '../../../docs/media/structure_link-spike.png'
import temThumb from '../../../docs/media/tem_alleles-strips.png'

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
    slug: 'mitogenome_genes',
    title: 'Eight mitochondrial genomes and the genes on them',
    blurb:
      'Eight mammal mitogenomes from RefSeq as one alignment, with all 37 genes per genome drawn as strand arrows colored by respiratory complex. COX1 starts at a different base in every genome and in one column of the alignment; the control region ends in eight different columns.',
    thumb: mitoThumb,
    thumbAlt:
      'Eight mammal mitochondrial genomes as rows of gene arrows, colored by respiratory complex and labeled by gene name',
    thumbPosition: 'left',
  },
  {
    slug: 'p53_variant_effects',
    title: "Where p53's damaging variants fall",
    blurb:
      'ClinVar, AlphaMissense and a saturation screen, each a bar per residue over the same fifteen-species p53 alignment. The three sources share no data and draw over the same columns.',
    thumb: p53Thumb,
    thumbAlt:
      'ClinVar, AlphaMissense and MaveDB bar tracks over a p53 ortholog alignment, all three peaking on the DNA-binding domain',
    thumbPosition: 'left',
  },
  {
    slug: 'alphafold_confidence',
    title: 'AlphaFold confidence across a protein family',
    blurb:
      'Fourteen vertebrate TDP-43 orthologs, each with the per-residue pLDDT of its own AlphaFold model. The mean per column runs 84 to 86 over the three Pfam folded domains and 38 over the C-terminal region, and the runs under 50 fill that region in all fourteen rows.',
    thumb: plddtThumb,
    thumbAlt:
      "Fourteen TDP-43 rows with a mean pLDDT bar track above and each row's low-confidence runs drawn in orange over its C-terminal half",
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
    slug: 'protein_complex',
    title: "Hemoglobin's two subunits and the interfaces between them",
    blurb:
      'Alpha and beta globin from eleven vertebrates, aligned per subunit and concatenated per species, with the 58 residue pairs in contact between the chains of PDB 2HHB drawn as arcs from one block to the other. The sliding alpha1beta2 interface is identical in 20 of its 28 residues from human to trout; the exposed surface is the least conserved class.',
    thumb: complexThumb,
    thumbAlt:
      'Eleven concatenated hemoglobin rows with arcs joining each alpha residue to the beta residue it touches in the crystal, colored by interface',
    thumbPosition: 'left',
  },
  {
    slug: 'structure_link',
    title: 'An alignment linked to its structure',
    blurb:
      'The spike and hemoglobin alignments beside PDB 6VXX and 2HHB in Mol*, joined by the residueMappings layers the two tutorials above build. A residue hovered in either view lights in the other; the PRRA insert reports no coordinates, and a chain no mapping names reports no row.',
    thumb: structureLinkThumb,
    thumbAlt:
      'The spike alignment on the PRRA insert above PDB 6VXX in Mol*, one SARS-CoV-2 residue shown as sticks on chain A',
    thumbPosition: 'center',
  },
  {
    slug: 'recombination_breakpoint',
    title: "The recombination breakpoint in XBB's spike gene",
    blurb:
      'Five whole SARS-CoV-2 genomes aligned with ClustalW, with the XBB.1 row scanned against each of the two BA.2 descendants it recombines. The two difference counts change places once inside the receptor-binding domain, and 41 of the 44 informative sites put the break between positions 22,896 and 22,942. A BA.5 control run through the same scan crosses nowhere.',
    thumb: recombinantThumb,
    thumbAlt:
      'Five SARS-CoV-2 genome rows under two bar tracks counting the differences between the recombinant row and each parent, one falling to zero where the other rises',
    thumbPosition: 'left',
  },
  {
    slug: 'norovirus_recombination',
    title: 'Recombination at the norovirus ORF1/ORF2 junction',
    blurb:
      'Twelve norovirus GII genomes aligned whole, with a tree from the ORF1 columns and another from the ORF2 columns. The three GII.P16-GII.4 rows read one parent for 25 windows and the other for 13, and the two identity curves change rank 14 columns before the first base of ORF2. A GII.Pe-GII.4 control never crosses.',
    thumb: norovirusThumb,
    thumbAlt:
      'Twelve norovirus rows of 200-base windows colored by closer parent, three of them turning from blue to red at the ORF1/ORF2 junction',
    thumbPosition: 'left',
  },
  {
    slug: 'tem_alleles',
    title: 'TEM beta-lactamase alleles and what they hydrolyze',
    blurb:
      "46 named TEM alleles from NCBI's Reference Gene Catalog, with the phenotype the catalog records and the residue each carries at the Ambler positions behind extended-spectrum and inhibitor resistance. All 22 extended-spectrum alleles are substituted at 104, 164, 238 or 240; a control position at 265 splits across three phenotypes.",
    thumb: temThumb,
    thumbAlt:
      'Forty-six TEM allele rows with a phenotype strip and eight residue strips beside the tree, tip labels colored by phenotype',
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
    slug: 'phylogeny_metadata',
    title: 'Coloring an RSV phylogeny by its metadata',
    blurb:
      "The clade, country, region and year Nextstrain records for each of 184 RSV genomes, written as a row table and read by the viewer's tip-label, branch and row-tint channels. Clade colors 109 of the 179 internal edges; country colors 23.",
    thumb: metadataThumb,
    thumbAlt:
      'RSV tip labels colored by Nextstrain clade, green A.D rows giving way to purple A.D.3 rows, with the clade legend beside them',
    thumbPosition: 'left',
  },
  {
    slug: 'influenza_surveillance_figure',
    title: 'An H5N1 surveillance figure',
    blurb:
      "204 genomes from Nextstrain's H5N1 cattle-outbreak build, with the host, the collecting state and one amino-acid site per segment as nine strips beside the HA alignment. NP 119 cuts the tree into 15 clades; host cuts it into 112.",
    thumb: h5n1Thumb,
    thumbAlt:
      'An H5N1 tree with tip labels colored by state, nine color strips beside it, labeled brackets in the gutter and the whole tree in an overview band above',
    thumbPosition: 'left',
  },
  {
    slug: 'gene_neighborhoods',
    title: 'Gene neighborhoods of the tryptophan operon',
    blurb:
      "Twelve bacterial genomes, 8 kb either side of trpB in each, drawn as a row of gene arrows in that genome's own coordinates beside a tree built from TrpB. An align transform on trpE brings ten of the twelve rows onto one origin; the two carrying no trpE stay where they were.",
    thumb: neighborhoodThumb,
    thumbAlt:
      'Twelve rows of bacterial gene arrows aligned on trpE, the trp operon reading as columns of color beside the TrpB tree',
    thumbPosition: 'left',
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
