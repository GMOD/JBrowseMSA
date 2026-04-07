# msaviewr basic examples
# Run any section interactively in RStudio to see the viewer

library(msaviewr)

# ── 1. Inline FASTA string ──────────────────────────────────────────
msaview(
  msa = ">human\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH\n>mouse\nMVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH\n>goat\nMSLTRTERTIILSLWSKISTQADVIGTETLERLFSCYPQAKTYFPHFDLHS",
  tree = "((human:0.1,mouse:0.2):0.05,goat:0.3);"
)

# ── 2. Named character vector ───────────────────────────────────────
seqs <- c(
  human = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH",
  mouse = "MVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH",
  goat  = "MSLTRTERTIILSLWSKISTQADVIGTETLERLFSCYPQAKTYFPHFDLHS"
)
msaview(msa = seqs, tree = "((human:0.1,mouse:0.2):0.05,goat:0.3);")

# ── 3. With ape random tree ─────────────────────────────────────────
library(ape)
tree <- rtree(15)
random_seqs <- setNames(
  replicate(15, paste0(sample(c("A","C","G","T"), 300, TRUE), collapse = "")),
  tree$tip.label
)
msaview(msa = random_seqs, tree = tree, color_scheme = "nucleotide")

# ── 4. Cladogram (no branch lengths) ────────────────────────────────
msaview(msa = random_seqs, tree = tree, show_branch_len = FALSE)
