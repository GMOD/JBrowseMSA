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

test_that("msaview passes color_scheme to the props", {
  w <- msaview(msa = ">s1\nACGT", color_scheme = "clustal")
  expect_equal(w$x$props$colorScheme, "clustal")
})

test_that("a named color vector reaches the viewer as a letter map", {
  w <- msaview(msa = ">s1\nACGT",
               color_scheme = c(K = "#1f77b4", R = "#1f77b4"))
  json <- as.character(jsonlite::toJSON(w$x$props["colorScheme"],
                                        auto_unbox = TRUE))
  expect_equal(json, '{"colorScheme":{"map":{"K":"#1f77b4","R":"#1f77b4"}}}')

  one <- msaviewr:::convert_color_scheme(c(K = "#1f77b4"))
  expect_equal(one, list(map = list(K = "#1f77b4")))
})

test_that("an unnamed vector of colors is not a color scheme", {
  expect_error(msaview(msa = ">s1\nACGT", color_scheme = c("red", "blue")),
               "named vector of colors")
})

test_that("msaview passes show_branch_len to the props", {
  w <- msaview(msa = ">s1\nACGT", show_branch_len = FALSE)
  expect_false(w$x$props$showBranchLen)
})

test_that("msaview with named vector + ape tree", {
  skip_if_not_installed("ape")
  tree <- ape::rtree(3)
  seqs <- setNames(c("ACGT", "ACGA", "ACGC"), tree$tip.label)
  w <- msaview(msa = seqs, tree = tree)
  expect_s3_class(w, "htmlwidget")
  expect_match(w$x$props$msa, tree$tip.label[1], fixed = TRUE)
  expect_match(w$x$props$tree, ";$")
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

test_that("a features data frame becomes one object per row", {
  df <- data.frame(
    seqname = c("s1", "s1", "s2"),
    start = c(1, 50, 10),
    end = c(20, 80, 30),
    name = c("Kinase", "Zinc finger", "SH3"),
    stringsAsFactors = FALSE
  )
  features <- msaviewr:::convert_features(df)

  expect_length(features, 3)
  expect_equal(features[[2]], list(row = "s1", start = 50, end = 80,
                                   name = "Zinc finger"))
  expect_equal(features[[3]]$row, "s2")
})

test_that("every other column travels as a field, and NA leaves it out", {
  df <- data.frame(row = c("s1", "s2"), start = 1, end = 20,
                   color = c("#c0392b", NA), group = factor(c("a", "b")),
                   stringsAsFactors = FALSE)
  features <- msaviewr:::convert_features(df)
  expect_equal(features[[1]]$color, "#c0392b")
  expect_false("color" %in% names(features[[2]]))
  expect_equal(features[[2]]$group, "b")
})

test_that("a strand other than + or - draws no arrow", {
  df <- data.frame(row = "s1", start = 1:3, end = 5:7,
                   strand = c("+", "*", "."), feature = "gene",
                   stringsAsFactors = FALSE)
  features <- msaviewr:::convert_features(df)
  expect_equal(features[[1]]$strand, "+")
  expect_false("strand" %in% names(features[[2]]))
  expect_false("strand" %in% names(features[[3]]))
  expect_equal(features[[1]]$type, "gene")
})

test_that("a features data frame needs its placement columns", {
  expect_error(msaviewr:::convert_features(data.frame(start = 1, end = 2)),
               "row")
  expect_error(msaviewr:::convert_features(data.frame(row = "s1")), "start")
})

test_that("a gff data frame reaches the viewer as features, not GFF text", {
  df <- data.frame(seqname = "s1", start = 1, end = 4, name = "Dom",
                   stringsAsFactors = FALSE)
  w <- msaview(msa = ">s1\nACGT", gff = df)
  expect_false("gff" %in% names(w$x$props))
  expect_equal(w$x$props$features[[1]]$name, "Dom")
  expect_match(
    as.character(htmlwidgets:::toJSON(w$x$props$features)),
    '[{"row":"s1","start":1,"end":4,"name":"Dom"}]', fixed = TRUE
  )
})

test_that("GFF text reaches the viewer as gff", {
  gff <- "##gff-version 3\ns1\t.\tprotein_match\t1\t4\t.\t.\t.\tName=Dom"
  w <- msaview(msa = ">s1\nACGT", gff = gff)
  expect_match(w$x$props$gff, "Name=Dom")
  expect_false("features" %in% names(w$x$props))
})

test_that("an absent gff is absent from the props, not null", {
  # a NULL list element serializes as JSON null, which the viewer's model
  # rejects as a value for an optional string
  w <- msaview(msa = ">s1\nACGT")
  expect_false("gff" %in% names(w$x$props))
  expect_false("colorScheme" %in% names(w$x$props))
  expect_false("showBranchLen" %in% names(w$x$props))
  expect_false("hideHeader" %in% names(w$x$props))
})

test_that("msaview passes hide_header to the props", {
  w <- msaview(msa = ">s1\nACGT", hide_header = TRUE)
  expect_true(w$x$props$hideHeader)
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

test_that("a path to a file that does not exist warns, then passes as text", {
  expect_warning(msaviewr:::convert_msa("no_such_alignment.fa"), "no such file")
  expect_warning(msaviewr:::convert_tree("missing/tree.nwk"), "no such file")
  # documents are never mistaken for paths
  expect_no_warning(msaviewr:::convert_msa(">s1\nACGT"))
  expect_no_warning(msaviewr:::convert_tree("((A,B),C);"))
  expect_no_warning(msaviewr:::convert_msa("ACGT"))
})

test_that("convert_msa handles Biostrings string sets", {
  skip_if_not_installed("Biostrings")
  aa <- Biostrings::AAStringSet(c(human = "MVLS", mouse = "MVLT"))
  expect_equal(msaviewr:::convert_msa(aa), ">human\nMVLS\n>mouse\nMVLT")

  unnamed <- Biostrings::DNAStringSet(c("ACGT", "ACGA"))
  expect_equal(msaviewr:::convert_msa(unnamed), ">seq1\nACGT\n>seq2\nACGA")
})

test_that("convert_msa handles Biostrings multiple alignments", {
  skip_if_not_installed("Biostrings")
  aln <- Biostrings::DNAMultipleAlignment(c(a = "AC-T", b = "ACGT"))
  expect_equal(msaviewr:::convert_msa(aln), ">a\nAC-T\n>b\nACGT")
})

test_that("a feature keeps large coordinates as numbers", {
  features <- msaviewr:::convert_features(
    data.frame(row = "s1", start = 100000, end = 1234567)
  )
  expect_match(as.character(htmlwidgets:::toJSON(features)),
               '"start":100000,"end":1234567', fixed = TRUE)
})

test_that("convert_column_tracks handles NULL", {
  expect_null(msaviewr:::convert_column_tracks(NULL))
})

test_that("convert_column_tracks keeps a one-column values vector an array", {
  tracks <- msaviewr:::convert_column_tracks(list(
    list(id = "t", name = "T", kind = "bar", values = 0.5)
  ))
  json <- jsonlite::toJSON(tracks, auto_unbox = TRUE)
  expect_match(as.character(json), '"values":[0.5]', fixed = TRUE)
})

test_that("convert_column_tracks serializes colors as an object", {
  tracks <- msaviewr:::convert_column_tracks(list(
    list(id = "f", name = "F", kind = "text", data = "12",
         colors = c("1" = "#aaa", "2" = "#bbb"))
  ))
  json <- jsonlite::toJSON(tracks, auto_unbox = TRUE)
  expect_match(as.character(json), '"colors":{"1":"#aaa","2":"#bbb"}', fixed = TRUE)
})

test_that("convert_column_tracks takes arcs as a data frame", {
  tracks <- msaviewr:::convert_column_tracks(list(
    list(id = "s", name = "S", kind = "arc", row = "Human",
         arcs = data.frame(start = c(31, 43), end = c(96, 109)))
  ))
  json <- as.character(jsonlite::toJSON(tracks, auto_unbox = TRUE))
  expect_match(json, '"arcs":[{"start":31,"end":96},{"start":43,"end":109}]',
               fixed = TRUE)
})

test_that("convert_column_tracks keeps a single arc an array", {
  tracks <- msaviewr:::convert_column_tracks(list(
    list(id = "s", name = "S", kind = "arc",
         arcs = list(list(start = 1, end = 10, color = "#b8860b")))
  ))
  json <- as.character(jsonlite::toJSON(tracks, auto_unbox = TRUE))
  expect_match(json, '"arcs":[{"start":1,"end":10,"color":"#b8860b"}]',
               fixed = TRUE)
})

test_that("convert_column_tracks rejects an arc without an end", {
  expect_error(
    msaviewr:::convert_column_tracks(list(
      list(id = "s", name = "S", kind = "arc", arcs = list(list(start = 1)))
    )),
    "missing 'end'"
  )
})

test_that("convert_column_tracks rejects an unknown kind", {
  expect_error(
    msaviewr:::convert_column_tracks(list(
      list(id = "t", name = "T", kind = "line")
    )),
    "must be 'bar', 'text' or 'arc'"
  )
})

test_that("convert_column_tracks rejects a track without a kind", {
  expect_error(
    msaviewr:::convert_column_tracks(list(list(id = "t", name = "T"))),
    "missing 'kind'"
  )
})

test_that("convert_highlights drops list names", {
  # Map() over a named vector names its result, a named list serializes as a
  # JSON object, and the viewer iterates the array it expects
  highlights <- Map(
    function(residue, label) {
      list(row = "Ref", start = residue, end = residue, label = label)
    },
    c(His57 = 42, Ser195 = 180), c("His57", "Ser195")
  )
  json <- as.character(jsonlite::toJSON(
    msaviewr:::convert_highlights(highlights),
    auto_unbox = TRUE
  ))
  expect_true(startsWith(json, '[{"row":"Ref"'))
})

test_that("convert_column_tracks drops list names", {
  tracks <- list(
    entropy = list(id = "e", name = "E", kind = "bar", values = c(1, 2))
  )
  json <- as.character(jsonlite::toJSON(
    msaviewr:::convert_column_tracks(tracks),
    auto_unbox = TRUE
  ))
  expect_true(startsWith(json, '[{"id":"e"'))
})

test_that("convert_residue_mappings drops list names", {
  mappings <- list(
    src = list(row = "SRC", structure = "2SRC", segments = list(c(1, 84, 1)))
  )
  json <- as.character(jsonlite::toJSON(
    msaviewr:::convert_residue_mappings(mappings),
    auto_unbox = TRUE
  ))
  expect_true(startsWith(json, '[{"row":"SRC"'))
})
