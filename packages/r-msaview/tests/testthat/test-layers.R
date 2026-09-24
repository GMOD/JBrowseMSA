msa <- ">Homo sapiens\nACGTACGT\n>Mouse\nACGTACGA"

test_that("a layer and the matching argument build the same props", {
  variants <- data.frame(
    row = "Homo sapiens", start = 2, end = 4, label = "R248Q",
    stringsAsFactors = FALSE
  )
  composed <- msaview(msa = msa) + geom_msa_highlight(variants)
  passed <- msaview(msa = msa, highlights = list(
    list(row = "Homo sapiens", start = 2, end = 4, label = "R248Q")
  ))
  # each surface keeps the field order it was handed, and a JSON object carries
  # no order, so compare the fields themselves
  by_name <- function(hs) lapply(hs, function(h) h[order(names(h))])
  expect_equal(by_name(composed$x$props$highlights),
               by_name(passed$x$props$highlights))
})

test_that("a highlight data frame gives one highlight per row", {
  variants <- data.frame(start = c(2, 5), end = c(3, 6), label = c("a", "b"))
  w <- msaview(msa = msa) + geom_msa_highlight(variants)
  expect_length(w$x$props$highlights, 2)
  expect_equal(w$x$props$highlights[[2]]$label, "b")
})

test_that("a highlight data frame carries only the columns it has", {
  w <- msaview(msa = msa) +
    geom_msa_highlight(data.frame(start = 2, end = 4))
  expect_equal(names(w$x$props$highlights[[1]]), c("start", "end"))
})

# a named vector is written out as FASTA, which sanitizes the headers, so the
# highlight's row has to take the same treatment to still name a row
test_that("a layer sanitizes a row name the way the alignment does", {
  w <- msaview(msa = c("Homo sapiens" = "ACGTACGT", Mouse = "ACGTACGA")) +
    geom_msa_highlight(data.frame(
      row = "Homo sapiens", start = 2, end = 4, stringsAsFactors = FALSE
    ))
  expect_equal(w$x$props$highlights[[1]]$row, "Homo_sapiens")
  expect_match(w$x$props$msa, ">Homo_sapiens", fixed = TRUE)
})

test_that("highlight layers accumulate", {
  w <- msaview(msa = msa) +
    geom_msa_highlight(start = 1, end = 2) +
    geom_msa_highlight(start = 5, end = 6)
  expect_length(w$x$props$highlights, 2)
  expect_equal(w$x$props$highlights[[1]]$start, 1)
  expect_equal(w$x$props$highlights[[2]]$start, 5)
})

test_that("a highlight needs a data frame, a span, or rows", {
  expect_error(geom_msa_highlight(), "needs a data frame")
  expect_error(
    geom_msa_highlight(data.frame(first = 1)),
    "must have 'start' and 'end' columns"
  )
  expect_error(geom_msa_highlight(1:3), "takes a data frame")
})

test_that("whole-row highlights keep rows an array", {
  w <- msaview(msa = msa) + geom_msa_highlight(rows = "Mouse", label = "clade")
  json <- as.character(jsonlite::toJSON(
    w$x$props$highlights[[1]], auto_unbox = TRUE
  ))
  expect_match(json, '"rows":["Mouse"]', fixed = TRUE)
})

test_that("a track reads its values from a data frame column", {
  w <- msaview(msa = msa) +
    geom_msa_track(data.frame(dnds = c(1, 2, 3)), value = "dnds",
                   name = "dN/dS", max = 2)
  track <- w$x$props$columnTracks[[1]]
  expect_equal(as.numeric(track$values), c(1, 2, 3))
  expect_equal(track$name, "dN/dS")
  expect_equal(track$max, 2)
})

test_that("a track takes a numeric vector directly", {
  w <- msaview(msa = msa) + geom_msa_track(c(1, 2), name = "score")
  expect_equal(as.numeric(w$x$props$columnTracks[[1]]$values), c(1, 2))
})

test_that("a track id comes from its name", {
  w <- msaview(msa = msa) + geom_msa_track(c(1), name = "dN/dS ratio")
  expect_equal(w$x$props$columnTracks[[1]]$id, "dn-ds-ratio")
})

test_that("a track without a name or a values column is an error", {
  expect_error(geom_msa_track(c(1, 2)), "needs a name")
  expect_error(
    geom_msa_track(data.frame(other = 1), name = "x"),
    "no 'value' column"
  )
})

test_that("an arc track takes its pairs from a data frame", {
  w <- msaview(msa = msa) +
    geom_msa_track(name = "contacts", kind = "arc",
                   arcs = data.frame(start = c(1, 3), end = c(5, 7)))
  expect_length(w$x$props$columnTracks[[1]]$arcs, 2)
})

test_that("track layers accumulate", {
  w <- msaview(msa = msa) +
    geom_msa_track(c(1), name = "one") +
    geom_msa_track(c(2), name = "two")
  expect_equal(
    vapply(w$x$props$columnTracks, function(t) t$name, character(1)),
    c("one", "two")
  )
})

test_that("domains land as gff text, and a URL as a filehandle", {
  gff <- "##gff-version 3\nHomo_sapiens\tsrc\tDomain\t1\t4\t.\t.\t.\tName=IPR1"
  w <- msaview(msa = msa) + geom_msa_domains(gff)
  expect_match(w$x$props$gff, "IPR1", fixed = TRUE)

  remote <- msaview(msa = msa) +
    geom_msa_domains("https://example.com/domains.gff")
  expect_equal(remote$x$props$gffFilehandle$uri,
               "https://example.com/domains.gff")
  expect_false("gff" %in% names(remote$x$props))
})

test_that("the residue scale sets the scheme and the channel", {
  w <- msaview(msa = msa) + scale_residue_color("clustal", encoding = "color")
  expect_equal(w$x$props$colorScheme, "clustal")
  expect_equal(w$x$props$residueEncoding, "color")
})

test_that("the residue scale takes a color per letter", {
  w <- msaview(msa = msa) + scale_residue_color(c(K = "#1f77b4", D = "#d62728"))
  expect_equal(w$x$props$colorScheme,
               list(map = list(K = "#1f77b4", D = "#d62728")))
})

test_that("an invalid channel is an error from either surface", {
  expect_error(scale_residue_color(encoding = "background"),
               "residue_encoding must be 'fill' or 'color'")
  expect_error(msaview(msa = msa, residue_encoding = "background"),
               "residue_encoding must be 'fill' or 'color'")
})

test_that("theme_msa sets the chrome under its camelCase names", {
  w <- msaview(msa = msa) +
    theme_msa("dark", col_width = 14, draw_tree = FALSE, hide_header = TRUE)
  expect_equal(w$x$props$theme, "dark")
  expect_equal(w$x$props$colWidth, 14)
  expect_false(w$x$props$drawTree)
  expect_true(w$x$props$hideHeader)
})

test_that("theme_msa leaves out what it is not given", {
  w <- msaview(msa = msa) + theme_msa(col_width = 14)
  for (name in c("theme", "rowHeight", "drawTree", "hideHeader")) {
    expect_false(name %in% names(w$x$props))
  }
})

test_that("a later layer replaces an earlier setting", {
  w <- msaview(msa = msa) + theme_msa(col_width = 9) + theme_msa(col_width = 14)
  expect_equal(w$x$props$colWidth, 14)
})

test_that("coord_msa builds the region, sanitizing its row", {
  w <- msaview(msa = msa) + coord_msa(2, 6, row = "Homo sapiens")
  expect_equal(w$x$props$region, list(start = 2L, end = 6L, row = "Homo_sapiens"))
})

test_that("coord_msa without a row spans alignment columns", {
  w <- msaview(msa = msa) + coord_msa(2, 6)
  expect_equal(w$x$props$region, list(start = 2L, end = 6L))
})

test_that("adding something that is not a layer is an error", {
  expect_error(msaview(msa = msa) + 1, "must be an msaviewr layer")
  expect_error(msaview(msa = msa) + list(a = 1), "must be an msaviewr layer")
})

test_that("a composed viewer is still an htmlwidget", {
  w <- msaview(msa = msa) + theme_msa("dark")
  expect_s3_class(w, "htmlwidget")
  expect_s3_class(w, "msaview")
})

test_that("a layer prints the props it carries", {
  expect_output(print(theme_msa("dark")), "msaviewr layer")
  expect_output(print(geom_msa_highlight(start = 1, end = 2)), "highlights")
})

test_that("coord_tree sets the order and roots on an outgroup", {
  w <- msaview(msa = msa) +
    coord_tree(order = "ladderize", root = c("Homo sapiens"))
  expect_equal(w$x$props$treeOrder, "ladderize")
  expect_equal(as.character(w$x$props$treeRoot$outgroup), "Homo_sapiens")
})

test_that("coord_tree passes the midpoint root as a string", {
  w <- msaview(msa = msa) + coord_tree(root = "midpoint")
  expect_equal(w$x$props$treeRoot, "midpoint")
})

test_that("a tree order outside the four is refused", {
  expect_error(coord_tree(order = "sideways"), "tree_order")
  expect_error(coord_tree(order = c("input", "ladderize")), "tree_order")
})

test_that("a rotate clade reaches the props", {
  w <- msaview(msa = msa) +
    geom_msa_clade(c("Homo sapiens", "Mouse"), tips = 2, mark = "rotate")
  expect_equal(w$x$props$clades[[1]]$mark, "rotate")
})
