test_that("the display settings reach the props under their camelCase names", {
  w <- msaview(
    msa = ">s1\nACGT",
    col_width = 9, row_height = 14, allowed_gappyness = 80,
    draw_tree = FALSE, tree_area_width = 140, auto_tree_area_width = TRUE,
    bg_color = FALSE, relative_to = "s1", theme = "dark"
  )
  expect_equal(w$x$props$colWidth, 9)
  expect_equal(w$x$props$rowHeight, 14)
  expect_equal(w$x$props$allowedGappyness, 80)
  expect_false(w$x$props$drawTree)
  expect_equal(w$x$props$treeAreaWidth, 140)
  expect_true(w$x$props$autoTreeAreaWidth)
  expect_false(w$x$props$bgColor)
  expect_equal(w$x$props$relativeTo, "s1")
  expect_equal(w$x$props$theme, "dark")
})

test_that("an unset display setting stays out of the props", {
  w <- msaview(msa = ">s1\nACGT")
  for (name in c("colWidth", "rowHeight", "allowedGappyness", "drawTree",
                 "treeAreaWidth", "autoTreeAreaWidth", "bgColor",
                 "relativeTo", "region", "theme", "highlightColumns",
                 "residueMappings")) {
    expect_false(name %in% names(w$x$props))
  }
})

test_that("relative_to takes the sanitized row name, matching the alignment", {
  w <- msaview(msa = c("Homo sapiens" = "ACGT"), relative_to = "Homo sapiens")
  expect_equal(w$x$props$relativeTo, "Homo_sapiens")
  expect_match(w$x$props$msa, ">Homo_sapiens", fixed = TRUE)
})

# auto_unbox would turn a length-one vector into a scalar, and the viewer reads
# highlightColumns as an array
test_that("one highlight column still serializes as an array", {
  json <- as.character(jsonlite::toJSON(
    list(highlightColumns = msaviewr:::convert_highlight_columns(7)),
    auto_unbox = TRUE
  ))
  expect_match(json, '"highlightColumns":[7]', fixed = TRUE)
})

test_that("highlight columns serialize as integers, not doubles", {
  json <- as.character(jsonlite::toJSON(
    msaviewr:::convert_highlight_columns(c(3, 9)), auto_unbox = TRUE
  ))
  expect_match(json, "[3,9]", fixed = TRUE)
})

test_that("a region stays one object, with its row sanitized", {
  region <- msaviewr:::convert_region(
    list(row = "Homo sapiens", start = 2, end = 9)
  )
  expect_equal(region$row, "Homo_sapiens")
  json <- as.character(jsonlite::toJSON(region, auto_unbox = TRUE))
  expect_match(json, '"start":2', fixed = TRUE)
  expect_false(grepl('"start":[2]', json, fixed = TRUE))
})

test_that("a region without start or end is an error", {
  expect_error(msaviewr:::convert_region(list(start = 2)), "start and end")
})

test_that("a residue mapping keeps one segment as an array", {
  mapping <- list(
    row = "Homo sapiens",
    structure = list(id = "1ABC", kind = "experimental", asymId = "A"),
    segments = list(
      list(rowStart = 1, rowEnd = 4, structStart = 1, structEnd = 4)
    )
  )
  out <- msaviewr:::convert_residue_mappings(list(mapping))
  expect_equal(out[[1]]$row, "Homo_sapiens")
  json <- as.character(jsonlite::toJSON(out[[1]], auto_unbox = TRUE))
  expect_match(json, '"segments":[{', fixed = TRUE)
})

test_that("a residue mapping missing segments is an error", {
  expect_error(
    msaviewr:::convert_residue_mappings(
      list(list(row = "s1", structure = list(id = "1ABC")))
    ),
    "missing 'segments'"
  )
})
