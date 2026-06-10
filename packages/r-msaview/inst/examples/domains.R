# msaviewr domain-annotation examples
# Show InterProScan-style protein domains as boxes over the alignment.
# The GFF can come from the react-msaview CLI:
#   react-msaview-cli interproscan proteins.fasta -o domains.gff

library(msaviewr)

seqs <- c(
  GPCR_human   = "MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR",
  GPCR_mouse   = "MNGTEGPNFYVPFSNKTGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIMLGFPINFLTLYVTVQHKKLR",
  GPCR_bovine  = "MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR",
  GPCR_chicken = "MNGTEGPNFYVPFSNKSGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLILLGFPINFLTLYVTIQHKKLR"
)

# ── 1. GFF file produced by the CLI ─────────────────────────────────
# msaview(msa = "proteins.fasta", gff = "domains.gff")

# ── 2. Inline GFF3 string ───────────────────────────────────────────
gff <- paste(
  "##gff-version 3",
  "GPCR_human\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7tm receptor",
  "GPCR_mouse\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7tm receptor",
  "GPCR_bovine\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7tm receptor",
  "GPCR_chicken\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7tm receptor",
  sep = "\n"
)
msaview(msa = seqs, gff = gff, color_scheme = "clustalx_protein_dynamic")

# ── 3. Domains as a data frame ──────────────────────────────────────
# Columns: seqname, start, end, and optionally name/description
domains <- data.frame(
  seqname     = names(seqs),
  start       = 6,
  end         = 62,
  name        = "PF00001",
  description = "7tm receptor (rhodopsin family)"
)
msaview(msa = seqs, gff = domains, color_scheme = "maeditor")
