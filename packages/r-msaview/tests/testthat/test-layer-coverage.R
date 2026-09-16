msa <- ">Homo sapiens\nACGTACGT\n>Mouse\nACGTACGA"

test_that("highlight columns go in on their own", {
  w <- msaview(msa = msa) + geom_msa_highlight(columns = c(3, 7))
  expect_equal(as.integer(w$x$props$highlightColumns), c(3L, 7L))
  expect_false("highlights" %in% names(w$x$props))
})

test_that("a structure mapping lands under residueMappings", {
  mapping <- list(
    row = "Homo sapiens",
    structure = list(id = "1TUP", kind = "experimental", asymId = "A"),
    segments = list(list(rowStart = 1, rowEnd = 4,
                         structStart = 1, structEnd = 4))
  )
  w <- msaview(msa = msa) + geom_msa_structure(list(mapping))
  expect_length(w$x$props$residueMappings, 1)
  expect_equal(w$x$props$residueMappings[[1]]$row, "Homo_sapiens")
})

test_that("the diff layer names the row to compare against", {
  w <- msaview(msa = msa) + stat_msa_diff("Homo sapiens")
  expect_equal(w$x$props$relativeTo, "Homo_sapiens")
})

# The README says every msaview() argument that carries a prop has a layer.
# This is that claim: the props the arguments build, minus the base documents,
# are the props the layers build.
test_that("every prop-carrying msaview argument has a layer", {
  layers <- list(
    geom_msa_domains("##gff-version 3"),
    geom_msa_highlight(start = 1, end = 2),
    geom_msa_highlight(columns = 1),
    geom_msa_track(c(1), name = "t"),
    geom_msa_structure(list(list(
      row = "a", structure = list(id = "1ABC"),
      segments = list(list(rowStart = 1, rowEnd = 2))
    ))),
    scale_residue_color("clustal", encoding = "color"),
    coord_msa(1, 2),
    stat_msa_diff("a"),
    theme_msa("dark", col_width = 1, row_height = 1, draw_tree = TRUE,
              show_branch_len = TRUE, tree_area_width = 1,
              auto_tree_area_width = TRUE, allowed_gappyness = 1,
              hide_header = TRUE)
  )
  reached <- unique(unlist(lapply(layers, function(l) {
    c(names(l$set), names(l$append))
  })))

  from_args <- msaview(
    msa = msa, gff = "##gff-version 3", color_scheme = "clustal",
    column_tracks = list(list(id = "t", name = "t", kind = "bar", values = 1)),
    show_branch_len = TRUE, highlights = list(list(start = 1, end = 2)),
    highlight_columns = 1,
    residue_mappings = list(list(
      row = "a", structure = list(id = "1ABC"),
      segments = list(list(rowStart = 1, rowEnd = 2))
    )),
    relative_to = "a", region = list(start = 1, end = 2), col_width = 1,
    row_height = 1, allowed_gappyness = 1, draw_tree = TRUE,
    tree_area_width = 1, auto_tree_area_width = TRUE,
    residue_encoding = "color", theme = "dark", hide_header = TRUE
  )
  # msa and tree are the viewer itself, so they stay arguments
  base <- c("msa", "tree", "msaFilehandle", "treeFilehandle")
  expect_equal(setdiff(names(from_args$x$props), c(base, reached)), character(0))
})
