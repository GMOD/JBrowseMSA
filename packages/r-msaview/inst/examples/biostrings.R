# msaviewr + Biostrings examples
# Requires: Biostrings (Bioconductor)

library(msaviewr)
library(Biostrings)

# ── 1. DNAStringSet ──────────────────────────────────────────────────
dna <- DNAStringSet(c(
  seq1 = "ATGCGATCGATCGATCG--ATCG",
  seq2 = "ATGCGATCGATCGATCGATCGATCG",
  seq3 = "ATGCG--CGATCGATCGATCGATCG",
  seq4 = "ATGCGATCGATCGATCG--ATCG"
))
msaview(msa = dna, color_scheme = "nucleotide")

# ── 2. AAStringSet ───────────────────────────────────────────────────
aa <- AAStringSet(c(
  human = "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH",
  mouse = "MVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH",
  goat  = "MSLTRTERTIILSLWSKISTQADVIGTETLERLFSCYPQAKTYFPHFDLHS"
))
msaview(msa = aa, color_scheme = "clustal")

# ── 3. Read from file ────────────────────────────────────────────────
# dna <- readDNAStringSet("aligned_sequences.fasta")
# msaview(msa = dna)

# ── 4. DNAMultipleAlignment ──────────────────────────────────────────
aln <- DNAMultipleAlignment(c(
  "ATGCGATCGATCGATCG--ATCG",
  "ATGCGATCGATCGATCGATCGATCG",
  "ATGCG--CGATCGATCGATCGATCG"
), rowmask = as(IRanges(), "NormalIRanges"))
msaview(msa = aln)

# ── 5. After running msa package alignment ───────────────────────────
# library(msa)
# unaligned <- readAAStringSet("proteins.fasta")
# aligned <- msa(unaligned, method = "ClustalOmega")
# msaview(msa = as(aligned, "AAStringSet"))
