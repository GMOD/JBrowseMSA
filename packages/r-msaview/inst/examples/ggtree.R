# msaviewr + ggtree interop examples
# Requires: ape, ggtree, treeio (Bioconductor)

library(msaviewr)
library(ape)

# ── 1. ggtree plot as tree input ─────────────────────────────────────
# msaview() accepts ggtree objects directly and extracts the tree

library(ggtree)

tree <- rtree(20)
p <- ggtree(tree) + geom_tiplab()

# generate dummy alignment matching tip labels
seqs <- setNames(
  replicate(20, paste0(sample(c("A","C","G","T"), 200, TRUE), collapse = "")),
  tree$tip.label
)

# pass the ggtree plot object as the tree - it will be converted automatically
msaview(msa = seqs, tree = p, color_scheme = "nucleotide")

# ── 2. treeio treedata objects ───────────────────────────────────────
# treedata objects from treeio (e.g. from read.beast, read.raxml) work directly

library(treeio)

# simulating a treedata object from a phylo
td <- as.treedata(tree)
msaview(msa = seqs, tree = td)

# ── 3. ggtree with annotation data ──────────────────────────────────
# you can build a complex ggtree and pass it - only the topology is used

metadata <- data.frame(
  label = tree$tip.label,
  group = sample(c("A", "B", "C"), 20, replace = TRUE)
)
p2 <- ggtree(tree) %<+% metadata +
  geom_tiplab(aes(color = group)) +
  theme(legend.position = "right")

# the tree topology is extracted; ggtree annotations stay in ggtree
msaview(msa = seqs, tree = p2)

# ── 4. Side-by-side ggtree + msaview ────────────────────────────────
# use ggtree for the tree panel, msaview for the MSA panel
# (print the ggtree plot separately; msaview handles its own tree)

print(p2) # show the annotated tree in the plots pane
msaview(msa = seqs, tree = tree) # interactive MSA in the viewer pane
