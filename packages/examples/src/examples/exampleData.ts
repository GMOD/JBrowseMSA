// Sample IL2RA protein alignment (CLUSTAL format) with a matching newick tree.
// Small enough to embed inline yet exercises gaps, a tree, and protein coloring.
export const proteinMSA = `CLUSTAL O(1.2.3) multiple sequence alignment
UniProt/Swiss-Prot|P26898|IL2RA_SHEEP      MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM
UniProt/Swiss-Prot|P01590|IL2RA_MOUSE      MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI
UniProt/Swiss-Prot|P41690|IL2RA_FELCA      MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM
UniProt/Swiss-Prot|P01589|IL2RA_HUMAN      MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM
UniProt/Swiss-Prot|Q5MNY4|IL2RA_MACMU      MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM
UniProt/Swiss-Prot|Q95118|IL2RG_BOVIN      -----------------------------------LLMWGLLT-----------------
UniProt/Swiss-Prot|P40321|IL2RG_CANFA      MLKPPLPLRSLLFLQLSLLGVGLNSTVPMPNGNEDIT------PDFFLTATPSETLSVSS
UniProt/Swiss-Prot|P26896|IL2RB_RAT        MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV
UniProt/Swiss-Prot|Q8BZM1|GLMN_MOUSE       PLPLRSLLFLQLPLLGVGLNP------------------PLPLRSLLFLQLPLLGVGLNP
UniProt/Swiss-Prot|P36835|IL2_CAPHI        -----------LLGVGLNPKFLTP------------------------------------
UniProt/Swiss-Prot|Q7JFM4|IL2_AOTVO        MLKPPLPLRSLLFLQLPLLGVGLNPKFLTPSGNEDIGGKPGTGGDFFLTSTPAGTLDVST
UniProt/Swiss-Prot|Q29416|IL2_CANFA        --------------LFLQLSLLG-------------------------------------
`

export const proteinTree =
  '(((UniProt/Swiss-Prot|P26898|IL2RA_SHEEP:0.24036,(UniProt/Swiss-Prot|P41690|IL2RA_FELCA:0.17737,(UniProt/Swiss-Prot|P01589|IL2RA_HUMAN:0.03906,UniProt/Swiss-Prot|Q5MNY4|IL2RA_MACMU:0.03787):0.13033):0.04964):0.02189,UniProt/Swiss-Prot|P01590|IL2RA_MOUSE:0.23072):0.06814,(((UniProt/Swiss-Prot|Q95118|IL2RG_BOVIN:0.09600,UniProt/Swiss-Prot|P40321|IL2RG_CANFA:0.09845):0.25333,UniProt/Swiss-Prot|Q29416|IL2_CANFA:0.35055):0.10231,(UniProt/Swiss-Prot|P26896|IL2RB_RAT:0.33631,UniProt/Swiss-Prot|Q7JFM4|IL2_AOTVO:0.33631):0.10166):0.01607,(UniProt/Swiss-Prot|Q8BZM1|GLMN_MOUSE:0.32378,UniProt/Swiss-Prot|P36835|IL2_CAPHI:0.32378):0.09999);'

// Small nucleotide alignment in FASTA, no tree.
export const nucleotideMSA = `>seq1
ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT
>seq2
ACGTACGAACGTACGTAGGTACGTACATACGTACGTACGT
>seq3
ACGTTCGTACGTACCTACGTACGTACGTACGAACGTACGT
>seq4
ACGTACGTACGTACGTACGTACATACGTTCGTACGTACGT
`

// Rhodopsin N-terminus across four species, ungapped so domain coordinates map
// straight to columns. Pairs with domainsGFF below.
export const domainsMSA = `>GPCR_human
MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR
>GPCR_mouse
MNGTEGPNFYVPFSNKTGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIMLGFPINFLTLYVTVQHKKLR
>GPCR_bovine
MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR
>GPCR_chicken
MNGTEGPNFYVPFSNKSGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLILLGFPINFLTLYVTIQHKKLR
`

// InterProScan-style domain annotations in GFF3 — exactly the shape that
// `react-msaview-cli interproscan` emits. seq_id matches the alignment rows and
// start/end are 1-based positions in the ungapped sequence.
export const domainsGFF = `##gff-version 3
GPCR_human\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_mouse\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_bovine\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_chicken\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
`
