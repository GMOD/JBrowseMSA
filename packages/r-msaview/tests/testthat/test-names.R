test_that("an alignment and a tree agree on a name with a space", {
  skip_if_not_installed("ape")
  phy <- ape::read.tree(text = "((a:0.1,b:0.2):0.1,c:0.3);")
  phy$tip.label <- c("Homo sapiens", "chr1:1-100", "sp|P1|X (frag), v2")
  seqs <- stats::setNames(c("ACGT", "AC-T", "ACCT"), phy$tip.label)

  fasta <- msaviewr:::convert_msa(seqs)
  newick <- msaviewr:::convert_tree(phy)

  rows <- sub("^>", "", grep("^>", strsplit(fasta, "\n")[[1]], value = TRUE))
  leaves <- strsplit(gsub("[();]", ",", newick), ",")[[1]]
  leaves <- sub(":.*$", "", leaves[leaves != ""])

  expect_equal(rows, c("Homo_sapiens", "chr1_1-100", "sp|P1|X_frag_v2"))
  expect_true(all(rows %in% leaves))
  # a FASTA id ends at the first whitespace, so a name holding one is read as
  # a shorter name than the one the tree carries
  expect_false(any(grepl("[[:space:]]", rows)))
})

test_that("a features data frame, a highlight and a track name the same row", {
  features <- msaviewr:::convert_features(
    data.frame(seqname = "Homo sapiens", start = 1, end = 10, name = "PF1")
  )
  expect_equal(features[[1]]$row, "Homo_sapiens")

  highlights <- msaviewr:::convert_highlights(list(
    list(row = "Homo sapiens", start = 1, end = 2),
    list(rows = c("Mus musculus", "chr1:1-100"))
  ))
  expect_equal(highlights[[1]]$row, "Homo_sapiens")
  expect_equal(as.character(highlights[[2]]$rows), c("Mus_musculus", "chr1_1-100"))

  tracks <- msaviewr:::convert_column_tracks(list(
    list(id = "t", name = "T", kind = "bar", values = c(1, 2), row = "Homo sapiens")
  ))
  expect_equal(tracks[[1]]$row, "Homo_sapiens")
})

test_that("a row table is keyed by the name the alignment uses", {
  from_frame <- msaviewr:::convert_row_data(
    data.frame(label = c("Homo sapiens", "chr1:1-100"),
               clade = c("primate", "contig"))
  )
  expect_equal(names(from_frame), c("Homo_sapiens", "chr1_1-100"))
  expect_equal(from_frame$Homo_sapiens$clade, "primate")

  from_list <- msaviewr:::convert_row_data(
    list("Homo sapiens" = list(clade = "primate"))
  )
  expect_equal(names(from_list), "Homo_sapiens")
})

test_that("a name that needs no rewriting is left alone", {
  expect_equal(msaviewr:::sanitize_names(c("seq1", "UniProt|P1|X")),
               c("seq1", "UniProt|P1|X"))
})

test_that("a URL is passed to the viewer as a filehandle, not as text", {
  widget <- msaview(
    msa = "https://example.org/aln.fa",
    tree = "https://example.org/tree.nwk"
  )
  props <- widget$x$props
  expect_equal(props$msaFilehandle$uri, "https://example.org/aln.fa")
  expect_equal(props$msaFilehandle$locationType, "UriLocation")
  expect_equal(props$treeFilehandle$uri, "https://example.org/tree.nwk")
  expect_false("msa" %in% names(props))
  expect_false("tree" %in% names(props))
})

test_that("a URL alignment still carries an inline tree", {
  widget <- msaview(
    msa = "https://example.org/aln.fa",
    tree = "((A:0.1,B:0.2):0.3,C:0.4);"
  )
  props <- widget$x$props
  expect_equal(props$msaFilehandle$uri, "https://example.org/aln.fa")
  expect_equal(props$tree, "((A:0.1,B:0.2):0.3,C:0.4);")
})
