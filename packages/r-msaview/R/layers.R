#' Add a layer to an MSA viewer
#'
#' Composes a viewer with a layer, in the way ggplot2 and ggtree compose a plot
#' with a geom. \code{msaview()} takes every layer as an argument too, and these
#' build the same viewer one piece at a time, each call reading a data frame.
#'
#' @param e1 An \code{msaview} htmlwidget.
#' @param e2 A layer from \code{\link{geom_msa_highlight}},
#'   \code{\link{geom_msa_clade}}, \code{\link{geom_msa_track}},
#'   \code{\link{geom_msa_domains}},
#'   \code{\link{geom_msa_rowdata}}, \code{\link{geom_msa_strip}},
#'   \code{\link{scale_residue_color}},
#'   \code{\link{scale_row_color}}, \code{\link{theme_msa}} or
#'   \code{\link{coord_msa}}.
#' @return The viewer, carrying the layer.
#'
#' @examples
#' \dontrun{
#' library(msaviewr)
#'
#' variants <- data.frame(
#'   row = c("Human", "Human"),
#'   start = c(248, 273),
#'   end = c(248, 273),
#'   label = c("R248Q", "R273H")
#' )
#'
#' msaview(msa = "p53.aln", tree = "p53.nh") +
#'   geom_msa_domains("p53-domains.gff") +
#'   geom_msa_highlight(variants) +
#'   scale_residue_color("clustal", encoding = "color") +
#'   theme_msa("dark", col_width = 14)
#' }
#' @export
"+.msaview" <- function(e1, e2) {
  if (!inherits(e2, "msaview_layer")) {
    stop("the right side of + must be an msaviewr layer, such as ",
         "geom_msa_track() or theme_msa(), got a '", class(e2)[1], "'")
  }
  for (prop in names(e2$set)) {
    e1$x$props[[prop]] <- e2$set[[prop]]
  }
  # an unnamed list of one serializes as a JSON array, so appending needs no I()
  for (prop in names(e2$append)) {
    e1$x$props[[prop]] <- c(e1$x$props[[prop]], e2$append[[prop]])
  }
  e1
}

# `set` replaces a prop, `append` adds to a list-valued one. A NULL in `set`
# would drop the prop, so the constructors leave it out instead.
msa_layer <- function(set = list(), append = list()) {
  structure(list(set = drop_null(set), append = append),
            class = "msaview_layer")
}

drop_null <- function(x) x[!vapply(x, is.null, logical(1))]

#' @export
print.msaview_layer <- function(x, ...) {
  props <- c(names(x$set), names(x$append))
  cat("<msaviewr layer>", paste(props, collapse = ", "), "\n")
  invisible(x)
}

# Reads one field off a data frame row, or NULL when the column is absent, so a
# frame carrying only start and end produces highlights with only those fields.
field_of <- function(df, i, name) {
  if (name %in% names(df)) df[[name]][[i]] else NULL
}

#' Highlight columns, residues or rows
#'
#' Marks a span with a bordered band and an optional label. A data frame gives
#' one highlight per row, read from the columns \code{start}, \code{end},
#' \code{row}, \code{label} and \code{color}, whichever it carries. The
#' arguments give one highlight on their own.
#'
#' Coordinates are 1-based and inclusive. \code{start} and \code{end} alone
#' count alignment columns; with \code{row} they count that row's own residues,
#' and the viewer places the band on the columns those residues land in.
#'
#' @param data A data frame of highlights, or NULL to use the arguments.
#' @param columns Alignment columns (1-based) to put under a persistent
#'   overlay, as a numeric vector. Given on its own, it adds no band.
#' @param start,end The span, 1-based and inclusive.
#' @param row A row name, making the span residues of that row.
#' @param rows Row names to tint whole rows.
#' @param label Text drawn beside the band.
#' @param color A CSS color for the band.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' variants <- data.frame(row = "Human", start = 248, end = 248, label = "R248Q")
#' msaview(msa = "p53.aln") + geom_msa_highlight(variants)
#'
#' msaview(msa = "p53.aln") + geom_msa_highlight(start = 100, end = 288)
#' }
#' @export
geom_msa_highlight <- function(data = NULL, start = NULL, end = NULL,
                               row = NULL, rows = NULL, label = NULL,
                               color = NULL, columns = NULL) {
  if (!is.null(columns) && is.null(data) && is.null(start) && is.null(rows)) {
    return(msa_layer(
      set = list(highlightColumns = convert_highlight_columns(columns))
    ))
  }
  if (is.data.frame(data)) {
    if (!all(c("start", "end") %in% names(data))) {
      stop("a highlight data frame must have 'start' and 'end' columns, got ",
           paste(names(data), collapse = ", "))
    }
    highlights <- lapply(seq_len(nrow(data)), function(i) {
      drop_null(list(
        start = data$start[[i]],
        end = data$end[[i]],
        row = field_of(data, i, "row"),
        label = field_of(data, i, "label"),
        color = field_of(data, i, "color")
      ))
    })
  } else if (!is.null(data)) {
    stop("geom_msa_highlight takes a data frame, got a '", class(data)[1], "'")
  } else if (is.null(rows) && (is.null(start) || is.null(end))) {
    stop("geom_msa_highlight needs a data frame, a start and end, or rows")
  } else {
    highlights <- list(drop_null(list(
      start = start, end = end, row = row, rows = rows,
      label = label, color = color
    )))
  }
  msa_layer(
    append = list(highlights = convert_highlights(highlights)),
    set = list(highlightColumns = convert_highlight_columns(columns))
  )
}

#' Mark a clade of the tree
#'
#' \code{mark = "highlight"} fills the rows of a clade with a translucent
#' rectangle, from the clade's common ancestor across the tree and the
#' alignment, which is ggtree's \code{geom_hilight}.
#' \code{mark = "bracket"} draws a bar beside the rows carrying
#' \code{label}, which is \code{geom_cladelab}, or \code{geom_strip} over a
#' \code{range}. \code{mark = "collapse"} and \code{mark = "focus"} open the
#' viewer with the clade collapsed, or with the rest of the tree hidden, and
#' both need \code{mrca}.
#'
#' \code{mrca} names tips whose most recent common ancestor is the clade, and
#' \code{range} names the first and last tip of a run in display order, which
#' need not be monophyletic. \code{tips} is the number of tips the clade
#' covers: a clade that resolves to a different number is dropped, so a
#' re-rooted tree loses the mark rather than putting it on another clade.
#'
#' @param mrca Tip names whose common ancestor is the clade.
#' @param tips The number of tips the clade covers.
#' @param range The first and last tip of a run, in display order.
#' @param color A CSS color for the rectangle, or for a bracket's bar and
#'   label.
#' @param label Text naming the clade, drawn by the bracket mark and by a
#'   highlight carrying one.
#' @param mark What to draw over the clade: \code{"highlight"},
#'   \code{"bracket"}, \code{"collapse"} or \code{"focus"}.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "h5.aln", tree = "h5.nh") +
#'   geom_msa_clade(c("Gs/TW/TNC1/2015", "Ck/TW/a174/2015"), tips = 47,
#'                  color = "#fff3c4", label = "2.3.4.4 H5Nx") +
#'   geom_msa_clade(c("Gs/TW/TNC1/2015", "Ck/TW/a174/2015"), tips = 47,
#'                  mark = "bracket", label = "2.3.4.4 H5Nx")
#' }
#' @export
geom_msa_clade <- function(mrca = NULL, tips = NULL, range = NULL,
                           color = NULL, label = NULL,
                           mark = "highlight") {
  clade <- drop_null(list(
    mrca = mrca, range = range, tips = tips, mark = mark,
    color = color, label = label
  ))
  msa_layer(append = list(clades = convert_clades(list(clade))))
}

#' A track of your own numbers, text or arcs
#'
#' Draws a track above the alignment, beside the conservation tracks the viewer
#' computes. A data frame supplies the values from the column \code{value}
#' names, and a numeric vector supplies them directly.
#'
#' \code{row} indexes the values by the residues of that row. Without it they
#' index alignment columns.
#'
#' @param data A data frame holding the values, a numeric vector of them, or
#'   NULL when \code{text} or \code{arcs} carries the track.
#' @param name The track's label, shown beside it.
#' @param id A stable id for the track. Taken from \code{name} when absent.
#' @param kind \code{"bar"}, \code{"text"} or \code{"arc"}.
#' @param value The column of \code{data} holding the values.
#' @param text One character per column, for a text track.
#' @param colors A color per letter, for a text track.
#' @param arcs Pairs joined by a curve, as a data frame with \code{start} and
#'   \code{end} columns and an optional \code{color}.
#' @param row A row name, indexing the values by that row's residues.
#' @param max The value drawn at full height. Default 1.
#' @param color The bar or arc color.
#' @param height The track's pixel height.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' dnds <- data.frame(value = runif(200, 0, 2))
#' msaview(msa = "cds.aln") +
#'   geom_msa_track(dnds, name = "dN/dS", max = 2, color = "#c0392b")
#'
#' contacts <- data.frame(start = c(10, 40), end = c(120, 160))
#' msaview(msa = "kinase.aln") +
#'   geom_msa_track(name = "contacts", kind = "arc", arcs = contacts)
#' }
#' @export
geom_msa_track <- function(data = NULL, name = NULL, id = NULL, kind = "bar",
                           value = "value", text = NULL, colors = NULL,
                           arcs = NULL, row = NULL, max = NULL, color = NULL,
                           height = NULL) {
  if (is.null(name)) {
    stop("geom_msa_track needs a name")
  }
  values <- NULL
  if (is.data.frame(data)) {
    if (kind == "arc" && is.null(arcs)) {
      arcs <- data
    } else if (!value %in% names(data)) {
      stop("the track data frame has no '", value, "' column, got ",
           paste(names(data), collapse = ", "))
    } else {
      values <- data[[value]]
    }
  } else if (is.numeric(data)) {
    values <- data
  } else if (is.character(data) && length(data) == 1) {
    text <- data
  } else if (!is.null(data)) {
    stop("geom_msa_track takes a data frame, a numeric vector or a string, ",
         "got a '", class(data)[1], "'")
  }

  track <- drop_null(list(
    id = id %||% slug(name), name = name, kind = kind, values = values,
    data = text, colors = colors, arcs = arcs, row = row, max = max,
    color = color, height = height
  ))
  msa_layer(append = list(columnTracks = convert_column_tracks(list(track))))
}

slug <- function(name) {
  gsub("^-+|-+$", "", gsub("[^a-z0-9]+", "-", tolower(name)))
}

#' Domain annotations over the alignment
#'
#' Draws each annotation as a box across the columns it covers, in a color per
#' feature type, with a legend. Takes a GFF3 file, a URL the viewer fetches,
#' GFF3 text, or a data frame with \code{seqname}, \code{start} and \code{end}
#' columns.
#'
#' \code{react-msaview-cli interpro} builds the file from InterPro's
#' precomputed matches.
#'
#' @param gff The annotations.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "p53.aln") + geom_msa_domains("p53-domains.gff")
#' }
#' @export
geom_msa_domains <- function(gff) {
  if (is.null(gff)) {
    stop("geom_msa_domains needs a gff")
  }
  if (is_url(gff)) {
    return(msa_layer(set = list(gffFilehandle = uri_location(gff))))
  }
  msa_layer(set = list(gff = convert_gff(gff)))
}

#' The residue color scale, and the channel it paints
#'
#' @param scheme A color scheme name, such as \code{"clustal"} or
#'   \code{"nucleotide"}.
#' @param encoding Which channel the scheme paints: \code{"fill"} colors each
#'   cell's background, \code{"color"} colors the letters, which lets a domain
#'   overlay mark each span with a bar under the row.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "p53.aln") +
#'   geom_msa_domains("p53-domains.gff") +
#'   scale_residue_color("clustal", encoding = "color")
#' }
#' @export
scale_residue_color <- function(scheme = NULL, encoding = NULL) {
  check_residue_encoding(encoding)
  msa_layer(set = list(colorScheme = scheme, residueEncoding = encoding))
}

#' The viewer's chrome and cell size
#'
#' @param theme \code{"light"}, \code{"dark"}, or a list of MUI theme options
#'   merged over the JBrowse theme.
#' @param col_width,row_height Pixels per column and per row.
#' @param draw_tree Draw the phylogeny. FALSE leaves a gutter holding the row
#'   labels alone.
#' @param show_branch_len Draw branch lengths. FALSE draws a cladogram.
#' @param tree_area_width Width of the tree and label gutter in pixels.
#' @param auto_tree_area_width Size that gutter to the labels it holds.
#' @param allowed_gappyness Hide columns that are at least this percent gaps.
#' @param hide_header Leave out the viewer's toolbar.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "p53.aln") + theme_msa("dark", col_width = 14, hide_header = TRUE)
#' }
#' @export
theme_msa <- function(theme = NULL, col_width = NULL, row_height = NULL,
                      draw_tree = NULL, show_branch_len = NULL,
                      tree_area_width = NULL, auto_tree_area_width = NULL,
                      allowed_gappyness = NULL, hide_header = NULL) {
  msa_layer(set = list(
    theme = theme, colWidth = col_width, rowHeight = row_height,
    drawTree = draw_tree, showBranchLen = show_branch_len,
    treeAreaWidth = tree_area_width, autoTreeAreaWidth = auto_tree_area_width,
    allowedGappyness = allowed_gappyness, hideHeader = hide_header
  ))
}

#' The span the viewer opens on
#'
#' Zooms and scrolls to a span once the alignment loads. \code{start} and
#' \code{end} alone count alignment columns; with \code{row} they count that
#' row's own residues.
#'
#' @param start,end The span, 1-based and inclusive.
#' @param row A row name, making the span residues of that row.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "p53.aln") + coord_msa(100, 288, row = "Human")
#' }
#' @export
coord_msa <- function(start, end, row = NULL) {
  msa_layer(set = list(
    region = convert_region(drop_null(list(start = start, end = end, row = row)))
  ))
}

#' Structures the rows map onto
#'
#' Says which residue of which structure each residue of a row is, for a page
#' showing a structure beside the alignment. Takes the list of mappings
#' \code{msaview()} takes.
#'
#' @param data A list of mappings, each a list with \code{row},
#'   \code{structure} and \code{segments}.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' mapping <- list(
#'   row = "Human",
#'   structure = list(id = "1TUP", kind = "experimental", asymId = "A"),
#'   segments = list(list(rowStart = 94, rowEnd = 289,
#'                        structStart = 94, structEnd = 289))
#' )
#' msaview(msa = "p53.aln") + geom_msa_structure(list(mapping))
#' }
#' @export
geom_msa_structure <- function(data) {
  msa_layer(append = list(residueMappings = convert_residue_mappings(data)))
}

#' Extra fields per row
#'
#' Carries a table of fields per alignment row, which the channels in
#' \code{\link{scale_row_color}} read. A data frame gives one row per alignment
#' row, named by its \code{label} or \code{row} column, which is the shape a
#' ggtree \code{tibble(label = , trait = )} already has.
#'
#' @param data A data frame of fields per row, or a named list of them.
#' @param key The column naming each row. Taken from \code{label}, \code{row} or
#'   \code{name} when absent.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' lineages <- data.frame(
#'   label = c("A/duck/Anhui/1/2013", "A/chicken/Taiwan/a174/2015"),
#'   clade = c("2.3.4.4b", "2.3.2.1c")
#' )
#' msaview(msa = "h5.aln", tree = "h5.nh") +
#'   geom_msa_rowdata(lineages) +
#'   scale_row_color("clade")
#' }
#' @export
geom_msa_rowdata <- function(data, key = NULL) {
  msa_layer(set = list(rowData = convert_row_data(data, key)))
}

#' Color a mark by a field of the row or feature table
#'
#' Colors one of the marks the viewer always draws by a field of a table.
#' \code{"tipLabel"} colors each tip label in the tree, \code{"rowTint"}
#' washes the row across the tree gutter and the alignment, and
#' \code{"branch"} colors a tree edge whose tips all share one value, which is
#' ggtree's \code{groupClade} with the group read from the table; all three
#' read \code{\link{geom_msa_rowdata}}'s table. \code{"featureFill"} colors
#' each span of the annotation overlay and \code{"featureLabel"} names the
#' field drawn inside a span, both from the features the GFF carries, where a
#' field is an annotation property (\code{accession}, \code{name},
#' \code{featureType}) or a GFF attribute such as \code{Name} or
#' \code{gene}. A feature carrying a GFF \code{color=} attribute keeps that
#' color.
#'
#' The scale is a named palette (\code{"ggplot"}, \code{"set1"},
#' \code{"dark2"}, \code{"okabeito"}, \code{"tableau"}) or a color per value.
#' A value the \code{map} leaves out keeps the plain mark.
#'
#' @param field The field to read.
#' @param channel \code{"tipLabel"} (default), \code{"rowTint"},
#'   \code{"branch"}, \code{"featureFill"} or \code{"featureLabel"}.
#' @param palette A palette name.
#' @param map A named list or vector of colors, keyed by field value.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "h5.aln", tree = "h5.nh") +
#'   geom_msa_rowdata(lineages) +
#'   scale_row_color("clade", palette = "set1") +
#'   scale_row_color("clade", channel = "rowTint",
#'                   map = list("2.3.4.4b" = "#e41a1c"))
#'
#' msaview(msa = "genes.aln", gff = "genes.gff") +
#'   scale_row_color("gene", channel = "featureFill", palette = "set1") +
#'   scale_row_color("Name", channel = "featureLabel")
#' }
#' @export
scale_row_color <- function(field, channel = "tipLabel", palette = NULL,
                            map = NULL) {
  scale <- drop_null(list(palette = palette, map = if (!is.null(map)) as.list(map)))
  encoding <- drop_null(list(
    channel = channel, field = field,
    scale = if (length(scale) > 0) scale
  ))
  msa_layer(append = list(encodings = convert_encodings(list(encoding))))
}

#' A column of colored cells beside the tree
#'
#' Draws one cell per alignment row between the tree and the alignment, colored
#' by a field of \code{\link{geom_msa_rowdata}}'s table, which is ggtree's
#' \code{gheatmap}. Eight of these make the tip-aligned matrix a surveillance
#' figure puts beside its phylogeny.
#'
#' The scale is a named palette (\code{"ggplot"}, \code{"set1"},
#' \code{"dark2"}, \code{"okabeito"}, \code{"tableau"}) or a color per value,
#' and strips over one field share that field's legend.
#'
#' @param field The field to color by.
#' @param palette A palette name.
#' @param map A named list or vector of colors, keyed by field value.
#' @param width The column's width in pixels. Default: the row height.
#' @param header The name drawn above the column. Default: the field.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "h5.aln", tree = "h5.nh") +
#'   geom_msa_rowdata(segments) +
#'   geom_msa_strip("HA", palette = "set1", width = 12) +
#'   geom_msa_strip("NA", header = "NA segment")
#' }
#' @export
geom_msa_strip <- function(field, palette = NULL, map = NULL, width = NULL,
                           header = NULL) {
  scale <- drop_null(list(palette = palette, map = if (!is.null(map)) as.list(map)))
  panel <- drop_null(list(
    kind = "strip", field = field, scale = if (length(scale) > 0) scale,
    width = width, header = header
  ))
  msa_layer(append = list(rowPanels = convert_row_panels(list(panel))))
}

#' Draw each row as its differences from one row
#'
#' Every other row draws as its differences from \code{row}, with matching
#' residues as \code{.}, the reading aid comparative papers use.
#'
#' @param row The row to compare against.
#' @return A layer to add to a viewer with \code{+}.
#'
#' @examples
#' \dontrun{
#' msaview(msa = "p53.aln") + stat_msa_diff("Human")
#' }
#' @export
stat_msa_diff <- function(row) {
  msa_layer(set = list(relativeTo = sanitize_names_or_null(row)))
}
