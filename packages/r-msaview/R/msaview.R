#' Create an interactive MSA viewer
#'
#' Renders an interactive multiple sequence alignment viewer powered by
#' react-msaview. Accepts a wide range of R and Bioconductor objects for
#' both alignments and phylogenetic trees.
#'
#' @param msa Alignment data. Can be:
#'   \itemize{
#'     \item A file path to a FASTA, Stockholm, or Clustal file
#'     \item A character string containing alignment text
#'     \item A \code{DNAStringSet} or \code{AAStringSet} (Biostrings)
#'     \item A \code{DNAMultipleAlignment} or \code{AAMultipleAlignment} (Biostrings)
#'     \item A named character vector of aligned sequences
#'   }
#' @param tree Tree data. Can be:
#'   \itemize{
#'     \item A file path to a Newick file
#'     \item A character string containing a Newick tree
#'     \item An \code{ape::phylo} object
#'     \item A \code{treeio::treedata} object
#'     \item A \code{ggtree} plot object (tree is extracted automatically)
#'   }
#' @param gff Domain annotation data. Can be:
#'   \itemize{
#'     \item A file path to a GFF3 file
#'     \item A character string containing GFF3 text
#'     \item A data frame with columns \code{seqname}, \code{start}, \code{end},
#'       and optionally \code{name}, \code{description}, \code{signature_desc}
#'   }
#' @param color_scheme Color scheme name. Options include \code{"maeditor"}
#'   (default), \code{"clustal"}, \code{"lesk"}, \code{"cinema"}, \code{"flower"},
#'   \code{"clustalx_protein"}, \code{"jalview_taylor"}, \code{"jalview_zappo"},
#'   \code{"jalview_hydrophobicity"}, \code{"jalview_buried"},
#'   \code{"jalview_prophelix"}, \code{"jalview_propstrand"},
#'   \code{"jalview_propturn"}, \code{"nucleotide"}, \code{"jbrowse_dna"},
#'   \code{"rainbow_dna"}, \code{"clustalx_dna"},
#'   \code{"clustalx_protein_dynamic"}, \code{"percent_identity_dynamic"}.
#' @param show_branch_len Logical. If \code{TRUE}, draw branch lengths
#'   (phylogram). If \code{FALSE}, draw a cladogram.
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
#' # --- Color schemes ---
#' msaview(msa = "alignment.fa", color_scheme = "clustalx_protein_dynamic")
#' msaview(msa = "alignment.fa", color_scheme = "percent_identity_dynamic")
#'
#' # --- In Shiny ---
#' library(shiny)
#' ui <- fluidPage(msaviewOutput("msa", height = "600px"))
#' server <- function(input, output) {
#'   output$msa <- renderMsaview({
#'     msaview(msa = "alignment.stock")
#'   })
#' }
#' shinyApp(ui, server)
#' }
#'
#' @export
msaview <- function(msa = NULL, tree = NULL, gff = NULL, color_scheme = NULL,
                    show_branch_len = NULL,
                    height = NULL, width = NULL, element_id = NULL) {
  msa_text <- convert_msa(msa)
  tree_text <- convert_tree(tree)
  gff_text <- convert_gff(gff)

  config <- list(type = "MsaView")
  if (!is.null(msa_text) || !is.null(tree_text) || !is.null(gff_text)) {
    # a NULL element survives list() and serializes as JSON null, which the
    # viewer's model rejects; an absent gff has to be absent
    config$data <- list(msa = msa_text %||% "", tree = tree_text %||% "")
    config$data$gff <- gff_text
  }
  config$colorSchemeName <- color_scheme
  config$showBranchLen <- show_branch_len

  htmlwidgets::createWidget(
    name = "msaview",
    x = list(config = config),
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
  paste(x, collapse = "\n")
}

convert_msa <- function(msa) {
  if (is.null(msa)) return(NULL)

  # names are what mark a character vector as sequences rather than alignment
  # text, so a one-sequence named vector is still FASTA input, not a document
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

# Indexed by position, not by name: looking sequences up by name hands every
# duplicate the first match. An unnamed entry gets a placeholder header.
to_fasta <- function(seqs) {
  nms <- names(seqs)
  if (is.null(nms)) nms <- rep("", length(seqs))
  blank <- is.na(nms) | nms == ""
  nms[blank] <- paste0("seq", seq_along(seqs))[blank]
  paste0(">", nms, "\n", as.character(seqs), collapse = "\n")
}

phylo_to_newick <- function(phy) {
  need_pkg("ape", "convert tree objects")
  ape::write.tree(phy)
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
                 description = "description")
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
    df$seqname, column("source", "."), column("feature", "protein_match"),
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
