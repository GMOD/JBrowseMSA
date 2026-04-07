test_that("convert_msa handles NULL", {
  expect_null(msaviewr:::convert_msa(NULL))
})

test_that("convert_msa handles inline FASTA string", {
  fasta <- ">s1\nACGT\n>s2\nACGA"
  expect_equal(msaviewr:::convert_msa(fasta), fasta)
})

test_that("convert_msa handles named character vector", {
  seqs <- c(s1 = "ACGT", s2 = "ACGA")
  result <- msaviewr:::convert_msa(seqs)
  expect_match(result, "^>s1\nACGT\n>s2\nACGA$")
})

test_that("convert_msa reads file", {
  tmp <- tempfile(fileext = ".fa")
  writeLines(c(">s1", "ACGT", ">s2", "ACGA"), tmp)
  result <- msaviewr:::convert_msa(tmp)
  expect_match(result, ">s1")
  expect_match(result, "ACGT")
  unlink(tmp)
})

test_that("convert_msa errors on unsupported type", {
  expect_error(msaviewr:::convert_msa(42), "Unsupported MSA input type")
})

test_that("convert_tree handles NULL", {
  expect_null(msaviewr:::convert_tree(NULL))
})

test_that("convert_tree handles Newick string", {
  nwk <- "((A:0.1,B:0.2):0.3,C:0.4);"
  expect_equal(msaviewr:::convert_tree(nwk), nwk)
})

test_that("convert_tree reads file", {
  tmp <- tempfile(fileext = ".nwk")
  writeLines("((A:0.1,B:0.2):0.3,C:0.4);", tmp)
  result <- msaviewr:::convert_tree(tmp)
  expect_match(result, "\\(")
  unlink(tmp)
})

test_that("convert_tree handles ape phylo", {
  skip_if_not_installed("ape")
  tree <- ape::rtree(5)
  result <- msaviewr:::convert_tree(tree)
  expect_match(result, ";$")
  for (tip in tree$tip.label) {
    expect_match(result, tip, fixed = TRUE)
  }
})

test_that("convert_tree errors on unsupported type", {
  expect_error(msaviewr:::convert_tree(42), "Unsupported tree input type")
})

test_that("msaview creates htmlwidget", {
  w <- msaview(msa = ">s1\nACGT\n>s2\nACGA")
  expect_s3_class(w, "htmlwidget")
})

test_that("msaview passes color_scheme to config", {
  w <- msaview(msa = ">s1\nACGT", color_scheme = "clustal")
  expect_equal(w$x$config$colorSchemeName, "clustal")
})

test_that("msaview passes show_branch_len to config", {
  w <- msaview(msa = ">s1\nACGT", show_branch_len = FALSE)
  expect_false(w$x$config$showBranchLen)
})

test_that("msaview with named vector + ape tree", {
  skip_if_not_installed("ape")
  tree <- ape::rtree(3)
  seqs <- setNames(c("ACGT", "ACGA", "ACGC"), tree$tip.label)
  w <- msaview(msa = seqs, tree = tree)
  expect_s3_class(w, "htmlwidget")
  expect_match(w$x$config$data$msa, tree$tip.label[1], fixed = TRUE)
  expect_match(w$x$config$data$tree, ";$")
})
