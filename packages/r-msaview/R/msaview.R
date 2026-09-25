#' Create an interactive MSA viewer
#'
#' Renders an interactive multiple sequence alignment viewer powered by
#' react-msaview. Accepts a wide range of R and Bioconductor objects for
#' both alignments and phylogenetic trees.
#'
#' \code{msaview} replaces whitespace and the Newick grammar characters in row
#' names with underscores, in the alignment, the tree, a GFF data frame's
#' \code{seqname}, and the row a highlight or column track names. Without that,
#' ape writes \code{Homo sapiens} as \code{Homo_sapiens}, the FASTA header keeps
#' the space, the viewer reads that row as \code{Homo}, and no tree tip matches
#' it.
#'
#' @param msa Alignment data. Can be:
#'   \itemize{
#'     \item A file path to a FASTA, Stockholm, or Clustal file
#'     \item An http(s) URL, which the viewer fetches itself
#'     \item A character string containing alignment text
#'     \item A \code{DNAStringSet} or \code{AAStringSet} (Biostrings)
#'     \item A \code{DNAMultipleAlignment} or \code{AAMultipleAlignment} (Biostrings)
#'     \item A named character vector of aligned sequences
#'   }
#' @param tree Tree data. Can be:
#'   \itemize{
#'     \item A file path to a Newick file
#'     \item An http(s) URL, which the viewer fetches itself
#'     \item A character string containing a Newick tree
#'     \item An \code{ape::phylo} object
#'     \item A \code{treeio::treedata} object
#'     \item A \code{ggtree} plot object (tree is extracted automatically)
#'   }
#' @param gff Domain annotation data. Can be:
#'   \itemize{
#'     \item A file path to a GFF3 file
#'     \item An http(s) URL, which the viewer fetches itself
#'     \item A character string containing GFF3 text
#'     \item A data frame with columns \code{seqname}, \code{start}, \code{end},
#'       and optionally \code{name}, \code{description}, \code{signature_desc}
#'       and \code{color}, the fill the viewer draws that span with
#'   }
#' @param color_scheme Color scheme name. Options include \code{"maeditor"}
#'   (default), \code{"clustal"}, \code{"lesk"}, \code{"cinema"}, \code{"flower"},
#'   \code{"clustalx_protein"}, \code{"jalview_taylor"}, \code{"jalview_zappo"},
#'   \code{"jalview_hydrophobicity"}, \code{"jalview_buried"},
#'   \code{"jalview_prophelix"}, \code{"jalview_propstrand"},
#'   \code{"jalview_propturn"}, \code{"nucleotide"}, \code{"jbrowse_dna"},
#'   \code{"rainbow_dna"}, \code{"clustalx_dna"},
#'   \code{"clustalx_protein_dynamic"}, \code{"percent_identity_dynamic"}.
#'   A named character vector or list of colors keyed by residue letter, such
#'   as \code{c(K = "#1f77b4", R = "#1f77b4")}, colors the letters it names in
#'   either case and leaves every other letter uncolored.
#' @param column_tracks Tracks supplied as data, drawn above the alignment
#'   beside the computed conservation tracks. A list of tracks, each a list
#'   with \code{id}, \code{name}, \code{kind} (\code{"bar"},
#'   \code{"text"} or \code{"arc"}), and then \code{values} (a numeric
#'   vector, one per column, drawn as bars scaled by \code{max}, default 1),
#'   \code{data} (a string, one character per column, colored by
#'   \code{colors}), or \code{arcs} (pairs of positions joined by a curve,
#'   given as a data frame with \code{start} and \code{end} columns and an
#'   optional \code{color}, or a list of such lists). Give \code{row} to
#'   index the residues of that row instead of alignment columns.
#'   \code{color} sets a bar or arc track's color and \code{height} its
#'   pixel height.
#' @param show_branch_len Logical. If \code{TRUE}, draw branch lengths
#'   (phylogram). If \code{FALSE}, draw a cladogram.
#' @param tree_order The order each node's children draw in, top to bottom:
#'   \code{"branchLength"} (the default, shortest branch first),
#'   \code{"input"} (as the tree file gives them), \code{"ladderize"}
#'   (fewest tips first) or \code{"ladderizeReverse"} (most tips first).
#' @param tree_root Where to root the tree: \code{"midpoint"}, halfway along
#'   the longest path between two tips, or a character vector of outgroup tip
#'   names, rooting on the branch above their common ancestor.
#' @param highlights A list of labeled highlights, each a list with 1-based
#'   inclusive coordinates: \code{list(start, end)} for alignment columns,
#'   \code{list(row, start, end)} for residues of the named row, or
#'   \code{list(rows = c(...))} for whole rows, plus an optional
#'   \code{label} and \code{color}. Drawn as a bordered band (or row tint)
#'   with the label beside it.
#' @param highlight_columns Alignment columns (1-based) to put under a
#'   persistent overlay, as a numeric vector.
#' @param clades Clades of the tree to mark, each a list with \code{mrca} (tip
#'   names whose most recent common ancestor is the clade) or \code{range}
#'   (the first and last tip of a run, in display order), \code{tips} (the
#'   number of tips the clade covers), \code{mark} (\code{"highlight"},
#'   \code{"bracket"}, \code{"collapse"}, \code{"focus"} or
#'   \code{"rotate"}), and an
#'   optional \code{color} and \code{label}. A clade that resolves to a
#'   different number of tips is dropped.
#' @param residue_mappings Which residue of which structure each residue of a
#'   row is, for a viewer showing a structure beside the alignment. A list of
#'   mappings, each a list with \code{row}, \code{structure} (a list with
#'   \code{id}, \code{kind} and \code{asymId}) and \code{segments} (a list of
#'   lists with \code{rowStart}, \code{rowEnd}, \code{structStart} and
#'   \code{structEnd}), plus optional \code{accession}, \code{unobserved} and
#'   \code{rowLength}.
#' @param row_data Extra fields per alignment row, as a data frame with a
#'   \code{label} (or \code{row}) column naming the row and one column per
#'   field, the shape a ggtree \code{tibble(label = , trait = )} already has. A
#'   named list of fields per row works too.
#' @param encodings What the viewer's own marks read from a table, as a list of
#'   lists with \code{channel} (\code{"tipLabel"} colors each tip label,
#'   \code{"rowTint"} washes the row across the tree gutter and the alignment,
#'   and \code{"branch"} colors a tree edge whose tips all share one value,
#'   each from \code{row_data}; \code{"featureFill"} colors each span of the
#'   annotation overlay and \code{"featureLabel"} names the field drawn inside
#'   a span, both from the features \code{gff} carries), \code{field}, and an
#'   optional \code{scale}, either \code{list(palette = "set1")} or
#'   \code{list(map = list(value = "#e41a1c"))}.
#' @param row_panels Panels drawn between the tree and the alignment. A list of
#'   panels, each a list with a \code{kind}. \code{kind = "strip"} colors one
#'   cell per row by a \code{field} of \code{row_data}, which is ggtree's
#'   \code{gheatmap}. \code{kind = "features"} draws the spans the \code{gff}
#'   carries, over the alignment's columns (\code{x = "column"}) or over each
#'   row's own residue positions (\code{x = "position"}), with
#'   \code{encoding = list(color = list(field =, scale =), label =)} and
#'   \code{transform = list(list(type = "align", on = "genE"))}. Both take
#'   \code{scale} (\code{list(palette = "set1")} or
#'   \code{list(map = list(value = "#e41a1c"))}), \code{width} in pixels and
#'   \code{header}, the name drawn above the column.
#' @param relative_to A row name. Every other row draws as its differences from
#'   that row, with matching residues as \code{.}.
#' @param region A span to zoom and scroll to once the alignment loads, as
#'   \code{list(start, end)} in alignment columns or
#'   \code{list(row, start, end)} in residues of that row, 1-based inclusive.
#' @param selection A block of the alignment to select, as
#'   \code{list(start, end)} in alignment columns, 1-based inclusive, plus an
#'   optional \code{rows}, a character vector naming the selected rows, which
#'   defaults to every row. Drawn as a blue band that a shift-drag in the
#'   viewer replaces.
#' @param col_width Width of one alignment column in pixels (horizontal zoom).
#' @param row_height Height of one row in pixels (vertical zoom).
#' @param allowed_gappyness Hide columns that are at least this percent gaps.
#'   Default 100, which hides nothing.
#' @param draw_tree Logical. If \code{TRUE} (default), draw the phylogeny. If
#'   \code{FALSE}, leave a gutter holding the row labels alone.
#' @param tree_area_width Width of the tree and label gutter in pixels.
#' @param auto_tree_area_width Logical. Size that gutter to the labels it
#'   holds. Pair with \code{draw_tree = FALSE}.
#' @param residue_encoding Which channel \code{color_scheme} paints:
#'   \code{"fill"} (default) colors each cell's background, and \code{"color"}
#'   colors the letters, which lets a domain overlay mark each span with a bar
#'   under the row.
#' @param theme \code{"light"} (default), \code{"dark"}, or a list of MUI theme
#'   options merged over the JBrowse theme.
#' @param hide_header Logical. If \code{TRUE}, leave out the viewer's toolbar,
#'   for a page or Shiny app drawing its own controls.
#' @param height Widget height (CSS units or pixels).
#' @param width Widget width (CSS units or pixels).
#' @param element_id HTML element ID.
#' @return An \code{htmlwidget} object.
#'
#' @examples
#' \dontrun{
#' # --- Basic usage with character strings ---
#' msaview(
#'   msa = ">seq1\nMKAA--LV\n>seq2\nMKAAGGLV\n>seq3\nMRAA--LI",
#'   tree = "((seq1:0.1,seq2:0.2):0.3,seq3:0.4);"
#' )
#'
#' # --- From files ---
#' msaview(msa = "alignment.stock")
#' msaview(msa = "alignment.fa", tree = "tree.nwk")
#'
#' # --- From a URL, fetched by the viewer ---
#' msaview(msa = "https://gmod.org/JBrowseMSA/data/pfam.stock")
#'
#' # --- With ape ---
#' library(ape)
#' tree <- rtree(10)
#' seqs <- setNames(
#'   replicate(10, paste0(sample(c("A","C","G","T"), 100, TRUE), collapse = "")),
#'   tree$tip.label
#' )
#' msaview(msa = seqs, tree = tree)
#'
#' # --- With Biostrings ---
#' library(Biostrings)
#' dna <- readDNAStringSet("aligned.fasta")
#' msaview(msa = dna, color_scheme = "nucleotide")
#'
#' aa <- readAAStringSet("proteins.fasta")
#' msaview(msa = aa, color_scheme = "clustal")
#'
#' # --- With Biostrings MultipleAlignment ---
#' library(Biostrings)
#' aln <- readDNAMultipleAlignment("alignment.phy", format = "phylip")
#' msaview(msa = aln)
#'
#' # --- With ggtree (tree extracted automatically) ---
#' library(ggtree)
#' library(ape)
#' tree <- rtree(20)
#' p <- ggtree(tree) + geom_tiplab()
#'
#' # Pass the ggtree plot object directly as the tree
#' seqs <- setNames(
#'   replicate(20, paste0(sample(c("A","C","G","T"), 200, TRUE), collapse = "")),
#'   tree$tip.label
#' )
#' msaview(msa = seqs, tree = p)
#'
#' # --- With treeio ---
#' library(treeio)
#' beast_tree <- read.beast("beast_output.tree")
#' msaview(tree = beast_tree)
#'
#' # --- With the msa package ---
#' library(msa)
#' library(Biostrings)
#' seqs <- readAAStringSet("unaligned_proteins.fasta")
#' aligned <- msa(seqs, method = "ClustalOmega")
#' msaview(msa = as(aligned, "AAStringSet"))
#'
#' # --- A track from your own numbers ---
#' msaview(
#'   msa = seqs,
#'   column_tracks = list(
#'     list(id = "dnds", name = "dN/dS", kind = "bar",
#'          values = dnds, max = 2, row = names(seqs)[1])
#'   )
#' )
#'
#' # --- Labeled highlights ---
#' msaview(
#'   msa = "alignment.fa",
#'   highlights = list(
#'     list(row = "human", start = 248, end = 248, label = "R248Q"),
#'     list(rows = c("beluga", "dolphin"), label = "frameshift carriers")
#'   )
#' )
#'
#' # --- Color schemes ---
#' msaview(msa = "alignment.fa", color_scheme = "clustalx_protein_dynamic")
#' msaview(msa = "alignment.fa", color_scheme = "percent_identity_dynamic")
#' msaview(msa = "alignment.fa",
#'         color_scheme = c(K = "#1f77b4", R = "#1f77b4", D = "#d62728"))
#'
#' # --- In Shiny ---
#' # input$<output id>_click holds the clicked cell,
#' # input$<output id>_viewport the columns on screen, and
#' # input$<output id>_selection the block a shift-drag selects
#' library(shiny)
#' ui <- fluidPage(msaviewOutput("msa", height = "600px"), verbatimTextOutput("cell"))
#' server <- function(input, output) {
#'   output$msa <- renderMsaview({
#'     msaview(msa = "alignment.stock")
#'   })
#'   output$cell <- renderPrint(input$msa_click)
#' }
#' shinyApp(ui, server)
#' }
#'
#' @export
msaview <- function(msa = NULL, tree = NULL, gff = NULL, color_scheme = NULL,
                    column_tracks = NULL, show_branch_len = NULL,
                    tree_order = NULL, tree_root = NULL,
                    highlights = NULL, highlight_columns = NULL,
                    clades = NULL,
                    residue_mappings = NULL, row_data = NULL,
                    encodings = NULL, row_panels = NULL, relative_to = NULL,
                    region = NULL, selection = NULL,
                    col_width = NULL, row_height = NULL,
                    allowed_gappyness = NULL, draw_tree = NULL,
                    tree_area_width = NULL, auto_tree_area_width = NULL,
                    residue_encoding = NULL, theme = NULL, hide_header = NULL,
                    height = NULL, width = NULL, element_id = NULL) {
  check_residue_encoding(residue_encoding)

  # the viewer fetches a URL itself; passed on as document text, a URL draws a
  # one-row alignment named after it
  msa_text <- if (is_url(msa)) NULL else convert_msa(msa)
  tree_text <- if (is_url(tree)) NULL else convert_tree(tree)
  gff_text <- if (is_url(gff)) NULL else convert_gff(gff)

  # MSAViewer props; a NULL assigned with $<- drops the field, where a NULL in
  # list() would serialize as JSON null
  props <- list()
  props$msa <- msa_text
  props$tree <- tree_text
  props$gff <- gff_text
  props$msaFilehandle <- uri_location(msa)
  props$treeFilehandle <- uri_location(tree)
  props$gffFilehandle <- uri_location(gff)
  props$colorScheme <- convert_color_scheme(color_scheme)
  props$columnTracks <- convert_column_tracks(column_tracks)
  props$showBranchLen <- show_branch_len
  props$treeOrder <- check_tree_order(tree_order)
  props$treeRoot <- convert_tree_root(tree_root)
  props$highlights <- convert_highlights(highlights)
  props$highlightColumns <- convert_highlight_columns(highlight_columns)
  props$clades <- convert_clades(clades)
  props$residueMappings <- convert_residue_mappings(residue_mappings)
  props$rowData <- convert_row_data(row_data)
  props$encodings <- convert_encodings(encodings)
  props$rowPanels <- convert_row_panels(row_panels)
  props$relativeTo <- sanitize_names_or_null(relative_to)
  props$region <- convert_region(region)
  props$selection <- convert_selection(selection)
  props$colWidth <- col_width
  props$rowHeight <- row_height
  props$allowedGappyness <- allowed_gappyness
  props$drawTree <- draw_tree
  props$treeAreaWidth <- tree_area_width
  props$autoTreeAreaWidth <- auto_tree_area_width
  props$residueEncoding <- residue_encoding
  props$theme <- theme
  props$hideHeader <- hide_header

  htmlwidgets::createWidget(
    name = "msaview",
    x = list(props = props),
    width = width,
    height = height,
    package = "msaviewr",
    elementId = element_id,
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = "100%",
      defaultHeight = 550,
      viewer.fill = TRUE,
      browser.fill = TRUE,
      knitr.figure = FALSE,
      knitr.defaultWidth = "100%",
      knitr.defaultHeight = 550
    )
  )
}

#' Shiny output binding for msaview
#'
#' Use in a Shiny UI to create a placeholder for an MSA viewer.
#'
#' @param output_id Output variable name.
#' @param width CSS width (default \code{"100\%"}).
#' @param height CSS height (default \code{"550px"}).
#' @return A Shiny output element.
#' @export
msaviewOutput <- function(output_id, width = "100%", height = "550px") {
  htmlwidgets::shinyWidgetOutput(output_id, "msaview", width, height,
                                  package = "msaviewr")
}

#' Shiny render function for msaview
#'
#' Use in a Shiny server to render an MSA viewer.
#'
#' @param expr Expression that produces an \code{msaview} widget.
#' @param env Environment.
#' @param quoted Is \code{expr} quoted?
#' @return A Shiny render function.
#' @export
renderMsaview <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) expr <- substitute(expr)
  htmlwidgets::shinyRenderWidget(expr, msaviewOutput, env, quoted = TRUE)
}

`%||%` <- function(a, b) if (is.null(a)) b else a

need_pkg <- function(pkg, what) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    stop("The '", pkg, "' package is required to ", what)
  }
}

# A file path, a single string of document text, or the lines of one (what
# readLines returns). Anything else is left to the caller's typed branches.
read_text <- function(x) {
  if (!is.character(x)) return(NULL)
  if (length(x) == 1 && file.exists(x)) {
    return(paste(readLines(x, warn = FALSE), collapse = "\n"))
  }
  if (length(x) == 1 && looks_like_path(x)) {
    warning("'", x, "' looks like a file path but no such file exists; ",
            "passing it to the viewer as text", call. = FALSE)
  }
  paste(x, collapse = "\n")
}

# One line ending in an extension, with none of the characters a FASTA,
# Stockholm, Newick or GFF document is made of
looks_like_path <- function(x) {
  !grepl("[\n\t>#(;]", x) && grepl("\\.[A-Za-z0-9]{1,8}$", x)
}

convert_msa <- function(msa) {
  if (is.null(msa)) return(NULL)

  # a named character vector holds sequences, so even a one-element named
  # vector becomes FASTA
  if (is.character(msa) && !is.null(names(msa))) {
    return(to_fasta(msa))
  }
  text <- read_text(msa)
  if (!is.null(text)) return(text)

  # Biostrings XStringSet (DNAStringSet, AAStringSet, RNAStringSet)
  if (inherits(msa, "XStringSet")) {
    return(to_fasta(as.character(msa)))
  }

  # Biostrings MultipleAlignment (DNAMultipleAlignment, AAMultipleAlignment, etc.)
  if (inherits(msa, "MultipleAlignment")) {
    need_pkg("Biostrings", "convert MultipleAlignment objects")
    return(to_fasta(as.character(Biostrings::unmasked(msa))))
  }

  stop("Unsupported MSA input type: ", class(msa)[1],
       ". Expected a file path, character string, named character vector, ",
       "XStringSet, or MultipleAlignment.")
}

# Each highlight serializes as one JSON object. `rows` has to stay an array
# even when it holds one name, and a scalar has to stay a scalar, which
# htmlwidgets' auto_unbox would otherwise decide per element. unname() keeps
# the list a JSON array: Map() over a named vector names its result, a named
# list serializes as a JSON object, and the viewer iterates the value it gets.
convert_highlights <- function(highlights) {
  if (is.null(highlights)) return(NULL)
  unname(lapply(highlights, function(h) {
    if (!is.null(h$rows)) h$rows <- I(sanitize_names(h$rows))
    if (!is.null(h$row)) h$row <- sanitize_names(h$row)
    h
  }))
}

# The row table as the viewer stores it: an object keyed by row name whose
# values are that row's fields. A data frame names its rows in `key`, or in
# whichever of label/row/name it carries. The keys are row names, so they take
# the substitution the alignment and the tree take.
convert_row_data <- function(data, key = NULL) {
  if (is.null(data)) return(NULL)
  if (is.data.frame(data)) {
    key <- key %||% intersect(c("label", "row", "name"), names(data))[1]
    if (is.na(key)) {
      stop("row_data needs a 'label' or 'row' column naming each row, got ",
           paste(names(data), collapse = ", "))
    }
    fields <- setdiff(names(data), key)
    if (length(fields) == 0) {
      stop("row_data needs a field column beside '", key, "'")
    }
    table <- lapply(seq_len(nrow(data)), function(i) {
      as.list(vapply(fields, function(f) as.character(data[[f]][[i]]),
                     character(1)))
    })
    names(table) <- sanitize_names(data[[key]])
    return(table)
  }
  if (!is.list(data) || is.null(names(data))) {
    stop("row_data must be a data frame or a named list of fields per row")
  }
  stats::setNames(lapply(data, as.list), sanitize_names(names(data)))
}

# Each encoding serializes as one JSON object, with its scale an object of its
# own rather than an array.
convert_encodings <- function(encodings) {
  if (is.null(encodings)) return(NULL)
  if (!is.list(encodings)) {
    stop("encodings must be a list of encodings, each a list with channel and field")
  }
  unname(lapply(encodings, function(e) {
    for (field in c("channel", "field")) {
      if (is.null(e[[field]])) stop("encoding is missing '", field, "'")
    }
    channels <- c("tipLabel", "rowTint", "branch", "featureFill", "featureLabel")
    if (!e$channel %in% channels) {
      stop("encoding channel must be one of ",
           paste0("'", channels, "'", collapse = ", "), ", got '",
           e$channel, "'")
    }
    if (!is.null(e$scale)) {
      e$scale <- as.list(e$scale)
      if (!is.null(e$scale$map)) e$scale$map <- as.list(e$scale$map)
    }
    e
  }))
}

# Each panel serializes as one JSON object, with its scale an object of its own
# rather than an array, and its width and header scalars. A features panel
# carries its channels under `encoding` and its transforms as an array.
convert_row_panels <- function(panels) {
  if (is.null(panels)) return(NULL)
  if (!is.list(panels)) {
    stop("row_panels must be a list of panels, each a list with kind and field")
  }
  unname(lapply(panels, function(panel) {
    panel$kind <- panel$kind %||% "strip"
    if (!panel$kind %in% c("strip", "features")) {
      stop("row panel kind must be 'strip' or 'features', got '",
           panel$kind, "'")
    }
    if (!is.null(panel$width)) panel$width <- as.numeric(panel$width)
    if (panel$kind == "features") {
      panel$x <- panel$x %||% "position"
      if (!panel$x %in% c("column", "position")) {
        stop("features panel x must be 'column' or 'position', got '",
             panel$x, "'")
      }
      if (!is.null(panel$encoding)) {
        panel$encoding <- as.list(panel$encoding)
        color <- panel$encoding$color
        if (!is.null(color)) {
          color <- as.list(color)
          if (is.null(color$field)) stop("features color is missing 'field'")
          if (!is.null(color$scale)) {
            color$scale <- as.list(color$scale)
            if (!is.null(color$scale$map)) {
              color$scale$map <- as.list(color$scale$map)
            }
          }
          panel$encoding$color <- color
        }
      }
      if (!is.null(panel$transform)) {
        panel$transform <- unname(lapply(panel$transform, as.list))
      }
      return(panel)
    }
    if (is.null(panel$field)) stop("row panel is missing 'field'")
    if (!is.null(panel$scale)) {
      panel$scale <- as.list(panel$scale)
      if (!is.null(panel$scale$map)) panel$scale$map <- as.list(panel$scale$map)
    }
    panel
  }))
}

# Each clade serializes as one JSON object. `mrca` and `range` stay arrays at
# length one, and they hold row names, so they take the substitution the
# alignment and the tree take.
convert_clades <- function(clades) {
  if (is.null(clades)) return(NULL)
  if (!is.list(clades)) {
    stop("clades must be a list of clades, each a list with mrca or range, and tips")
  }
  unname(lapply(clades, function(clade) {
    if (is.null(clade$mrca) && is.null(clade$range)) {
      stop("a clade needs 'mrca', the tip names it spans, or 'range', its two ends")
    }
    if (is.null(clade$tips)) {
      stop("a clade needs 'tips', the number of tips it covers")
    }
    if (!is.null(clade$mrca)) clade$mrca <- I(sanitize_names(clade$mrca))
    if (!is.null(clade$range)) clade$range <- I(sanitize_names(clade$range))
    clade$tips <- as.integer(clade$tips)
    clade$mark <- clade$mark %||% "highlight"
    clade
  }))
}

check_tree_order <- function(order) {
  orders <- c("branchLength", "input", "ladderize", "ladderizeReverse")
  if (!is.null(order) && !(length(order) == 1 && order %in% orders)) {
    stop("tree_order must be one of ", paste(orders, collapse = ", "))
  }
  order
}

# "midpoint" goes as the string, and any other names are an outgroup, which
# stays an array at length one and takes the tree's row-name substitution
convert_tree_root <- function(root) {
  if (is.null(root)) return(NULL)
  if (identical(root, "midpoint")) return("midpoint")
  list(outgroup = I(sanitize_names(root)))
}

# One column stays a JSON array. Integers, because a column is a position and
# jsonlite writes a double as 12.0, which the viewer reads as a fractional
# column.
convert_highlight_columns <- function(columns) {
  if (is.null(columns)) return(NULL)
  I(as.integer(columns))
}

# Each mapping serializes as one JSON object, with `segments` and `unobserved`
# staying arrays at length one.
convert_residue_mappings <- function(mappings) {
  if (is.null(mappings)) return(NULL)
  if (!is.list(mappings)) {
    stop("residue_mappings must be a list of mappings, each a list with row, structure and segments")
  }
  unname(lapply(mappings, function(m) {
    for (field in c("row", "structure", "segments")) {
      if (is.null(m[[field]])) stop("residue mapping is missing '", field, "'")
    }
    m$row <- sanitize_names(m$row)
    m$segments <- I(lapply(m$segments, as.list))
    if (!is.null(m$unobserved)) {
      m$unobserved <- I(lapply(m$unobserved, function(pair) I(as.integer(pair))))
    }
    m
  }))
}

# One object, not an array, so its scalars unbox the way the viewer reads them
convert_region <- function(region) {
  if (is.null(region)) return(NULL)
  if (!is.list(region) || is.null(region$start) || is.null(region$end)) {
    stop("region must be a list with start and end, and an optional row")
  }
  region$start <- as.integer(region$start)
  region$end <- as.integer(region$end)
  if (!is.null(region$row)) region$row <- sanitize_names(region$row)
  region
}

# One object, like a region, with `rows` kept an array when it names one row
convert_selection <- function(selection) {
  if (is.null(selection)) return(NULL)
  if (!is.list(selection) || is.null(selection$start) ||
      is.null(selection$end)) {
    stop("selection must be a list with start and end, and optional rows")
  }
  selection$start <- as.integer(selection$start)
  selection$end <- as.integer(selection$end)
  if (!is.null(selection$rows)) {
    selection$rows <- I(sanitize_names(selection$rows))
  }
  selection
}

# A scheme name passes through, and a named vector or list of colors becomes
# the viewer's {map}, one color per residue letter
convert_color_scheme <- function(scheme) {
  if (is.null(scheme)) return(NULL)
  named <- !is.null(names(scheme)) && all(nzchar(names(scheme)))
  if (named) return(list(map = as.list(scheme)))
  if (is.character(scheme) && length(scheme) == 1) return(scheme)
  stop("color_scheme must be a scheme name or a named vector of colors, ",
       "such as c(K = \"#1f77b4\")")
}

check_residue_encoding <- function(encoding) {
  if (!is.null(encoding) && !encoding %in% c("fill", "color")) {
    stop("residue_encoding must be 'fill' or 'color', got '", encoding, "'")
  }
}

sanitize_names_or_null <- function(x) {
  if (is.null(x)) NULL else sanitize_names(x)
}

convert_tree <- function(tree) {
  if (is.null(tree)) return(NULL)

  text <- read_text(tree)
  if (!is.null(text)) return(text)

  if (inherits(tree, "phylo")) {
    return(phylo_to_newick(tree))
  }

  if (inherits(tree, "treedata")) {
    need_pkg("treeio", "convert treedata objects")
    return(phylo_to_newick(treeio::as.phylo(tree)))
  }

  if (inherits(tree, "ggtree") || inherits(tree, "gg")) {
    return(extract_tree_from_ggtree(tree))
  }

  stop("Unsupported tree input type: ", class(tree)[1],
       ". Expected a file path, Newick string, phylo, treedata, or ggtree object.")
}

is_url <- function(x) {
  is.character(x) && length(x) == 1 && grepl("^(https?|ftp)://", x)
}

uri_location <- function(x) {
  if (is_url(x)) list(uri = x, locationType = "UriLocation") else NULL
}

#' Sanitize row names for FASTA and Newick
#'
#' The viewer names an alignment row by its FASTA defline up to the first
#' whitespace, and a Newick label cannot hold the grammar characters unquoted.
#' ape writes \code{Homo sapiens} and \code{chr1:1-100} as \code{Homo_sapiens}
#' and \code{chr1-1-100}, while the FASTA header keeps the space and the viewer
#' reads the row as \code{Homo}. Applying one substitution to the alignment, the
#' tree, and the row a GFF feature, highlight or track names gives every side
#' the same string.
#'
#' @param x Character vector of names.
#' @return The names with whitespace and Newick grammar characters replaced by
#'   underscores.
#' @noRd
sanitize_names <- function(x) {
  gsub("[[:space:],:;()\\[\\]'\"]+", "_", as.character(x), perl = TRUE)
}

# Indexes by position, not by name, since a lookup by name gives every duplicate
# the first match. An unnamed entry gets a placeholder header.
to_fasta <- function(seqs) {
  nms <- names(seqs)
  if (is.null(nms)) nms <- rep("", length(seqs))
  blank <- is.na(nms) | nms == ""
  nms[blank] <- paste0("seq", seq_along(seqs))[blank]
  paste0(">", sanitize_names(nms), "\n", as.character(seqs), collapse = "\n")
}

phylo_to_newick <- function(phy) {
  need_pkg("ape", "convert tree objects")
  phy$tip.label <- sanitize_names(phy$tip.label)
  ape::write.tree(phy)
}

convert_column_tracks <- function(tracks) {
  if (is.null(tracks)) return(NULL)
  if (!is.list(tracks)) {
    stop("column_tracks must be a list of tracks, each a list with id, name and kind")
  }
  unname(lapply(tracks, function(track) {
    for (field in c("id", "name", "kind")) {
      if (is.null(track[[field]])) stop("column track is missing '", field, "'")
    }
    if (!track$kind %in% c("bar", "text", "arc")) {
      stop("column track kind must be 'bar', 'text' or 'arc', got '",
           track$kind, "'")
    }
    # a one-column vector would unbox to a scalar; I() keeps it an array
    if (!is.null(track$row)) track$row <- sanitize_names(track$row)
    if (!is.null(track$values)) track$values <- I(as.numeric(track$values))
    if (!is.null(track$colors)) track$colors <- as.list(track$colors)
    if (!is.null(track$arcs)) track$arcs <- convert_arcs(track$arcs)
    track
  }))
}

# An arc track's pairs, as a data frame of start/end (+ optional color) or a
# list of such lists. Both land as a JSON array of objects, and a single arc
# stays an array rather than unboxing to one object.
convert_arcs <- function(arcs) {
  if (is.data.frame(arcs)) {
    if (!all(c("start", "end") %in% names(arcs))) {
      stop("an arc data frame must have 'start' and 'end' columns")
    }
    arcs <- lapply(seq_len(nrow(arcs)), function(i) as.list(arcs[i, ]))
  }
  if (!is.list(arcs)) {
    stop("arcs must be a data frame or a list of lists with start and end")
  }
  I(lapply(arcs, function(arc) {
    for (field in c("start", "end")) {
      if (is.null(arc[[field]])) stop("arc is missing '", field, "'")
      arc[[field]] <- as.numeric(arc[[field]])
    }
    if (!is.null(arc$color)) arc$color <- as.character(arc$color)
    arc
  }))
}

convert_gff <- function(gff) {
  if (is.null(gff)) return(NULL)

  text <- read_text(gff)
  if (!is.null(text)) return(text)

  if (is.data.frame(gff)) {
    return(df_to_gff3(gff))
  }

  stop("Unsupported gff input type: ", class(gff)[1],
       ". Expected a file path, GFF3 string, or data frame.")
}

df_to_gff3 <- function(df) {
  if (!("seqname" %in% names(df))) {
    stop("GFF data frame must have a 'seqname' column")
  }
  if (!all(c("start", "end") %in% names(df))) {
    stop("GFF data frame must have 'start' and 'end' columns")
  }

  column <- function(name, default) {
    if (name %in% names(df)) as.character(df[[name]]) else rep(default, nrow(df))
  }
  # paste() renders 100000 as "1e+05", which no GFF parser reads as a position
  coord <- function(name) format(df[[name]], scientific = FALSE, trim = TRUE)

  attr_keys <- c(name = "Name", signature_desc = "signature_desc",
                 description = "description", color = "color")
  attr_keys <- attr_keys[names(attr_keys) %in% names(df)]
  attributes <- if (length(attr_keys) > 0) {
    encoded <- lapply(names(attr_keys), function(col) {
      paste0(attr_keys[[col]], "=",
             utils::URLencode(as.character(df[[col]]), reserved = TRUE))
    })
    do.call(paste, c(encoded, list(sep = ";")))
  } else {
    rep(".", nrow(df))
  }

  rows <- paste(
    sanitize_names(df$seqname), column("source", "."),
    column("feature", "protein_match"),
    coord("start"), coord("end"),
    column("score", "."), column("strand", "."), column("phase", "."),
    attributes,
    sep = "\t"
  )
  paste(c("##gff-version 3", rows), collapse = "\n")
}

# ggtree keeps the tree it drew: get.tree() reads it back from the plot, and
# when that fails the plot's $data is a tbl_tree that as.phylo() rebuilds
extract_tree_from_ggtree <- function(p) {
  need_pkg("treeio", "extract a tree from a ggtree object")
  candidates <- list(
    function() treeio::get.tree(p),
    function() treeio::as.phylo(p$data)
  )
  for (get in candidates) {
    phy <- tryCatch(treeio::as.phylo(get()), error = function(e) NULL)
    if (inherits(phy, "phylo")) {
      return(phylo_to_newick(phy))
    }
  }
  stop("Could not extract tree from ggtree object. ",
       "Pass the phylo object directly instead, e.g. msaview(tree = tree)")
}
