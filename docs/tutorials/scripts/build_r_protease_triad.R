#!/usr/bin/env Rscript
# Build a chymotrypsin-family alignment, tree and layers entirely in R, and
# open it in msaviewr. Every step is the one shown in
# docs/tutorials/r_protease_triad.md.
#
#   Rscript build_r_protease_triad.R [outdir]
#
# Needs: msaviewr, Biostrings, DECIPHER, ape, jsonlite.
#   remotes::install_github("GMOD/JBrowseMSA", subdir = "packages/r-msaview")
#   BiocManager::install(c("Biostrings", "DECIPHER"))

suppressPackageStartupMessages({
  library(Biostrings)
  library(DECIPHER)
  library(ape)
  library(msaviewr)
})

out <- if (length(commandArgs(TRUE))) commandArgs(TRUE)[1] else "."
dir.create(out, showWarnings = FALSE, recursive = TRUE)

# Nine S1 peptidases UniProt annotates with a charge-relay system, and five it
# does not. The label is what the viewer draws down the side.
proteins <- data.frame(
  accession = c(
    "P00766", "P07477", "P08246", "P10144", "P07288",
    "P00734", "P00742", "P00747", "P00750",
    "P00738", "P20160", "P22891", "P14210", "P26927"
  ),
  label = c(
    "Chymotrypsinogen", "Trypsin_1", "Elastase", "Granzyme_B", "PSA",
    "Prothrombin", "Factor_X", "Plasminogen", "tPA",
    "Haptoglobin", "Azurocidin", "Protein_Z", "HGF", "MST1"
  )
)

REST <- "https://rest.uniprot.org/uniprotkb/accessions?accessions="
ids <- paste(proteins$accession, collapse = ",")

# 1. the feature table: one request for the S1 domain bounds, the catalytic
#    residues and the disulfide bonds of all fourteen proteins
fields <- "accession,id,protein_name,ft_domain,ft_act_site,ft_disulfid"
features <- read.delim(
  url(paste0(REST, ids, "&fields=", fields, "&format=tsv")),
  quote = "", check.names = FALSE
)
features <- features[match(proteins$accession, features$Entry), ]

# "DOMAIN 364..618; /note="Peptidase S1"" -> c(364, 618)
s1_domain <- function(text) {
  m <- regmatches(text, regexpr('DOMAIN (\\d+)\\.\\.(\\d+); /note="Peptidase S1"', text))
  as.integer(regmatches(m, gregexpr("\\d+", m))[[1]])
}
# "ACT_SITE 406; ... ACT_SITE 462; ..." -> c(406, 462, 568)
positions <- function(text, key) {
  m <- regmatches(text, gregexpr(paste0(key, " (\\d+)"), text))[[1]]
  as.integer(sub(paste0(key, " "), "", m))
}
# "DISULFID 42..58; ... DISULFID 136..201; ..." -> a two-column matrix
disulfides <- function(text) {
  m <- regmatches(text, gregexpr("DISULFID (\\d+)\\.\\.(\\d+)", text))[[1]]
  matrix(as.integer(unlist(regmatches(m, gregexpr("\\d+", m)))), ncol = 2, byrow = TRUE)
}

domains <- lapply(features[["Domain [FT]"]], s1_domain)
proteins$start <- vapply(domains, `[`, integer(1), 1)
proteins$end <- vapply(domains, `[`, integer(1), 2)
proteins$act <- lapply(features[["Active site"]], positions, "ACT_SITE")

cat("\nS1 domain and charge-relay residues as UniProt annotates them\n")
print(data.frame(
  protein = proteins$label,
  domain = paste0(proteins$start, "..", proteins$end),
  residues = proteins$end - proteins$start + 1,
  active_site = vapply(
    proteins$act,
    function(p) if (length(p)) paste(p, collapse = ", ") else "none",
    character(1)
  )
), row.names = FALSE)

# 2. the sequences, one request, then cut each to its S1 domain
fasta <- file.path(out, "proteases-full.fasta")
download.file(paste0(REST, ids, "&format=fasta"), fasta, quiet = TRUE)
full <- readAAStringSet(fasta)
names(full) <- sub("^[a-z]+\\|([A-Z0-9]+)\\|.*$", "\\1", names(full))
full <- full[proteins$accession]

s1 <- subseq(full, start = proteins$start, end = proteins$end)
names(s1) <- proteins$label

cat(sprintf(
  "\nfull chains %d-%d aa, S1 domains %d-%d aa\n",
  min(width(full)), max(width(full)), min(width(s1)), max(width(s1))
))

# 3. align the domains
aln <- AlignSeqs(s1, verbose = FALSE)
cat(sprintf("alignment: %d rows x %d columns\n", length(aln), width(aln)[1]))
writeXStringSet(aln, file.path(out, "proteases.aln"))

# 4. neighbor joining from the alignment's own distances
tree <- ladderize(nj(as.dist(DistanceMatrix(aln, verbose = FALSE))))
write.tree(tree, file.path(out, "proteases.nh"))

# 5. every column's mean pairwise BLOSUM62 score. A column of cysteines scores
#    9 and a column of alanines 4, so the score reads conservation and rarity
#    together.
data(BLOSUM62, package = "Biostrings")
m <- as.matrix(aln)
pairs <- combn(nrow(m), 2)
blosum <- apply(m, 2, function(column) {
  a <- column[pairs[1, ]]
  b <- column[pairs[2, ]]
  keep <- a %in% rownames(BLOSUM62) & b %in% rownames(BLOSUM62)
  if (!any(keep)) 0 else mean(BLOSUM62[cbind(a[keep], b[keep])])
})

# 6. the catalytic columns. UniProt numbers His57, Asp102 and Ser195 in the
#    chain; subseq() made them domain-relative, and the viewer projects a
#    row's residue onto its column through that row's gaps.
ref <- which(proteins$label == "Chymotrypsinogen")
triad <- proteins$act[[ref]] - proteins$start[ref] + 1
names(triad) <- c("His57", "Asp102", "Ser195")

# the same three columns of the alignment, to read every row's letter off
residue_column <- cumsum(m[ref, ] != "-")
triad_column <- vapply(triad, function(r) which(residue_column == r)[1], integer(1))

letters_at <- data.frame(
  protein = proteins$label,
  charge_relay = ifelse(lengths(proteins$act) > 0, "annotated", "none"),
  His57 = m[, triad_column[1]],
  Asp102 = m[, triad_column[2]],
  Ser195 = m[, triad_column[3]]
)
cat("\nWhat each row reads in the three catalytic columns\n")
print(letters_at, row.names = FALSE)

# 7. chymotrypsinogen's disulfide bonds, as pairs of its own residues
ss <- disulfides(features[["Disulfide bond"]][ref])
ss <- ss[ss[, 1] >= proteins$start[ref] & ss[, 2] <= proteins$end[ref], , drop = FALSE]
bonds <- data.frame(
  start = ss[, 1] - proteins$start[ref] + 1,
  end = ss[, 2] - proteins$start[ref] + 1
)
cat(sprintf("\n%d disulfide bonds inside the domain\n", nrow(bonds)))

# 8. the viewer, with the layers R just computed
tracks <- list(
  list(
    id = "blosum", name = "Mean pairwise BLOSUM62", kind = "bar",
    values = pmax(blosum, 0), max = 9, color = "#6a51a3", height = 60
  ),
  list(
    id = "ss", name = "Disulfide bonds (chymotrypsinogen)", kind = "arc",
    arcs = bonds, row = "Chymotrypsinogen", color = "#b35806", height = 50
  )
)
bands <- Map(
  function(residue, label) {
    list(row = "Chymotrypsinogen", start = residue, end = residue, label = label)
  },
  triad, names(triad)
)

widget <- msaview(
  msa = aln,
  tree = tree,
  color_scheme = "clustalx_protein_dynamic",
  column_tracks = tracks,
  highlights = bands,
  height = 520
)

htmlwidgets::saveWidget(widget, file.path(out, "proteases.html"), selfcontained = FALSE)

# 9. the same two layers as a snapshot, and the URL that opens it in the web
#    viewer. A snapshot carries its layers as data, so the link shows what the
#    widget shows.
layers <- list(
  generatedBy = "docs/tutorials/scripts/build_r_protease_triad.R",
  retrieved = format(Sys.Date()),
  columnTracks = unname(tracks),
  highlights = unname(bands)
)
writeLines(
  jsonlite::toJSON(layers, auto_unbox = TRUE, digits = 3),
  file.path(out, "proteases-layers.json")
)

snapshot <- list(msaview = c(
  list(
    type = "MsaView",
    height = 560,
    treeAreaWidth = 150,
    colorSchemeName = "clustalx_protein_dynamic",
    msaFilehandle = list(uri = "data/proteases/proteases.aln"),
    treeFilehandle = list(uri = "data/proteases/proteases.nh")
  ),
  layers[c("columnTracks", "highlights")]
))
json <- as.character(jsonlite::toJSON(snapshot, auto_unbox = TRUE, digits = 3))
link <- paste0(
  "https://gmod.org/JBrowseMSA/demo/?data=",
  URLencode(json, reserved = TRUE)
)
writeLines(link, file.path(out, "proteases-link.url"))

cat(sprintf(
  "\nwrote %s/proteases.aln, proteases.nh, proteases.html, proteases-layers.json\nthe link is %d characters\n",
  out, nchar(link)
))
