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

test_that("convert_msa handles a one-sequence named vector", {
  # names are what mark a vector as sequences; a length-1 named vector used to
  # fall through to the scalar branch and be passed on as raw alignment text
  expect_equal(msaviewr:::convert_msa(c(only = "ACGT")), ">only\nACGT")
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

test_that("convert_gff handles NULL", {
  expect_null(msaviewr:::convert_gff(NULL))
})

test_that("convert_gff passes GFF3 text through", {
  gff <- "##gff-version 3\ns1\t.\tprotein_match\t1\t20\t.\t.\t.\tName=X"
  expect_equal(msaviewr:::convert_gff(gff), gff)
})

test_that("convert_gff reads file", {
  tmp <- tempfile(fileext = ".gff")
  writeLines(c("##gff-version 3", "s1\t.\tprotein_match\t1\t20\t.\t.\t.\tName=X"), tmp)
  expect_match(msaviewr:::convert_gff(tmp), "Name=X")
  unlink(tmp)
})

test_that("df_to_gff3 emits one row per domain with its own attributes", {
  df <- data.frame(
    seqname = c("s1", "s1", "s2"),
    start = c(1, 50, 10),
    end = c(20, 80, 30),
    name = c("Kinase", "Zinc finger", "SH3"),
    stringsAsFactors = FALSE
  )
  lines <- strsplit(msaviewr:::df_to_gff3(df), "\n")[[1]]

  expect_equal(lines[1], "##gff-version 3")
  expect_length(lines, 4)
  # each row keeps its own name, and a space is percent-encoded rather than
  # ending the attribute
  expect_match(lines[2], "Name=Kinase$")
  expect_match(lines[3], "Name=Zinc%20finger$")
  expect_match(lines[4], "Name=SH3$")
  # positions land in the GFF start/end columns
  expect_equal(strsplit(lines[3], "\t")[[1]][4:5], c("50", "80"))
})

test_that("df_to_gff3 requires the columns it reads", {
  expect_error(msaviewr:::df_to_gff3(data.frame(start = 1, end = 2)), "seqname")
  expect_error(msaviewr:::df_to_gff3(data.frame(seqname = "s1")), "start")
})

test_that("msaview passes gff through to the config", {
  df <- data.frame(seqname = "s1", start = 1, end = 4, name = "Dom",
                   stringsAsFactors = FALSE)
  w <- msaview(msa = ">s1\nACGT", gff = df)
  expect_match(w$x$config$data$gff, "Name=Dom")
})

test_that("an absent gff is absent from the config, not null", {
  # a NULL list element serializes as JSON null, which the viewer's model
  # rejects as a value for an optional string
  w <- msaview(msa = ">s1\nACGT")
  expect_false("gff" %in% names(w$x$config$data))
  expect_false("colorSchemeName" %in% names(w$x$config))
  expect_false("showBranchLen" %in% names(w$x$config))
})

test_that("convert_msa joins the lines of a document", {
  lines <- c(">s1", "ACGT", ">s2", "ACGA")
  expect_equal(msaviewr:::convert_msa(lines), paste(lines, collapse = "\n"))
  expect_equal(msaviewr:::convert_tree(c("((A,B),", "C);")), "((A,B),\nC);")
})

test_that("to_fasta keeps duplicate names apart and fills blank ones", {
  expect_equal(msaviewr:::to_fasta(c(a = "X", a = "Y")), ">a\nX\n>a\nY")
  expect_equal(msaviewr:::to_fasta(c(a = "X", "Y")), ">a\nX\n>seq2\nY")
  expect_equal(msaviewr:::to_fasta(c("X", "Y")), ">seq1\nX\n>seq2\nY")
})

test_that("df_to_gff3 writes large coordinates in full", {
  df <- data.frame(seqname = "s1", start = 100000, end = 1234567)
  line <- strsplit(msaviewr:::df_to_gff3(df), "\n")[[1]][2]
  expect_equal(strsplit(line, "\t")[[1]][4:5], c("100000", "1234567"))
})
