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
#'   \code{"buried"}, \code{"taylor"}, \code{"hydrophobicity"}, \code{"helix"},
#'   \code{"strand"}, \code{"turn"}, \code{"nucleotide"}, \code{"purine_pyrimidine"},
#'   \code{"rainbow_dna"}, \code{"rainbow_rna"},
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
    config$data <- list(
      msa = msa_text %||% "",
      tree = tree_text %||% "",
      gff = gff_text %||% NULL
    )
  }
  if (!is.null(color_scheme)) {
    config$colorSchemeName <- color_scheme
  }
  if (!is.null(show_branch_len)) {
    config$showBranchLen <- show_branch_len
  }

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
#' @param height CSS height (default \code{"600px"}).
#' @return A Shiny output element.
#' @export
msaviewOutput <- function(output_id, width = "100%", height = "600px") {
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

convert_msa <- function(msa) {
  if (is.null(msa)) return(NULL)

  if (is.character(msa) && length(msa) == 1) {
    if (file.exists(msa)) {
      return(paste(readLines(msa, warn = FALSE), collapse = "\n"))
    }
    return(msa)
  }

  # named character vector -> FASTA
  if (is.character(msa) && !is.null(names(msa))) {
    return(named_vec_to_fasta(msa))
  }

  # Biostrings XStringSet (DNAStringSet, AAStringSet, RNAStringSet)
  if (inherits(msa, "XStringSet")) {
    return(xstringset_to_fasta(msa))
  }

  # Biostrings MultipleAlignment (DNAMultipleAlignment, AAMultipleAlignment, etc.)
  if (inherits(msa, "MultipleAlignment")) {
    if (!requireNamespace("Biostrings", quietly = TRUE)) {
      stop("The 'Biostrings' package is required to convert MultipleAlignment objects")
    }
    ss <- Biostrings::unmasked(msa)
    return(xstringset_to_fasta(ss))
  }

  stop("Unsupported MSA input type: ", class(msa)[1],
       ". Expected a file path, character string, named character vector, ",
       "XStringSet, or MultipleAlignment.")
}

convert_tree <- function(tree) {
  if (is.null(tree)) return(NULL)

  if (is.character(tree) && length(tree) == 1) {
    if (file.exists(tree)) {
      return(paste(readLines(tree, warn = FALSE), collapse = "\n"))
    }
    return(tree)
  }

  # ape phylo object
  if (inherits(tree, "phylo")) {
    if (!requireNamespace("ape", quietly = TRUE)) {
      stop("The 'ape' package is required to convert phylo objects")
    }
    return(ape::write.tree(tree))
  }

  # treeio treedata object
  if (inherits(tree, "treedata")) {
    return(treedata_to_newick(tree))
  }

  # ggtree plot object - extract the tree
  if (inherits(tree, "ggtree") || inherits(tree, "gg")) {
    return(extract_tree_from_ggtree(tree))
  }

  stop("Unsupported tree input type: ", class(tree)[1],
       ". Expected a file path, Newick string, phylo, treedata, or ggtree object.")
}

named_vec_to_fasta <- function(seqs) {
  lines <- vapply(names(seqs), function(nm) {
    paste0(">", nm, "\n", seqs[[nm]])
  }, character(1))
  paste(lines, collapse = "\n")
}

xstringset_to_fasta <- function(ss) {
  nms <- names(ss)
  seqs <- as.character(ss)
  lines <- vapply(seq_along(seqs), function(i) {
    nm <- if (!is.null(nms)) nms[i] else paste0("seq", i)
    paste0(">", nm, "\n", seqs[i])
  }, character(1))
  paste(lines, collapse = "\n")
}

treedata_to_newick <- function(td) {
  if (!requireNamespace("treeio", quietly = TRUE)) {
    stop("The 'treeio' package is required to convert treedata objects")
  }
  if (!requireNamespace("ape", quietly = TRUE)) {
    stop("The 'ape' package is required to convert treedata objects")
  }
  phy <- treeio::as.phylo(td)
  ape::write.tree(phy)
}

convert_gff <- function(gff) {
  if (is.null(gff)) return(NULL)

  if (is.character(gff) && length(gff) == 1) {
    if (file.exists(gff)) {
      return(paste(readLines(gff, warn = FALSE), collapse = "\n"))
    }
    return(gff)
  }

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

  source <- if ("source" %in% names(df)) df$source else rep(".", nrow(df))
  feature <- if ("feature" %in% names(df)) df$feature else rep("protein_match", nrow(df))
  score <- if ("score" %in% names(df)) df$score else rep(".", nrow(df))
  strand <- if ("strand" %in% names(df)) df$strand else rep(".", nrow(df))
  phase <- if ("phase" %in% names(df)) df$phase else rep(".", nrow(df))

  attr_parts <- list()
  if ("name" %in% names(df)) {
    attr_parts[["Name"]] <- utils::URLencode(as.character(df$name), reserved = TRUE)
  }
  if ("signature_desc" %in% names(df)) {
    attr_parts[["signature_desc"]] <- utils::URLencode(
      as.character(df$signature_desc), reserved = TRUE
    )
  }
  if ("description" %in% names(df)) {
    attr_parts[["description"]] <- utils::URLencode(
      as.character(df$description), reserved = TRUE
    )
  }

  attributes <- if (length(attr_parts) > 0) {
    do.call(paste, c(
      lapply(names(attr_parts), function(k) paste0(k, "=", attr_parts[[k]])),
      list(sep = ";")
    ))
  } else {
    rep(".", nrow(df))
  }

  rows <- paste(
    df$seqname, source, feature, df$start, df$end,
    score, strand, phase, attributes,
    sep = "\t"
  )
  paste(c("##gff-version 3", rows), collapse = "\n")
}

extract_tree_from_ggtree <- function(p) {
  # ggtree stores the original tree data in the plot
  # try treeio::get.tree first, then fall back to the $data slot
  if (requireNamespace("treeio", quietly = TRUE)) {
    td <- tryCatch(treeio::get.tree(p), error = function(e) NULL)
    if (!is.null(td)) {
      return(treedata_to_newick(td))
    }
  }

  # fallback: ggtree objects are ggplot objects with $data containing a
  # tibble that has parent/node/label columns
  if (!is.null(p$data) && "parent" %in% names(p$data) && "label" %in% names(p$data)) {
    if (requireNamespace("ape", quietly = TRUE)) {
      # try to get the phylo object from the plot's internal data
      td <- tryCatch({
        tree_data <- p$data
        if (inherits(tree_data, "tbl_tree")) {
          treeio::as.phylo(tree_data)
        } else {
          NULL
        }
      }, error = function(e) NULL)
      if (inherits(td, "phylo")) {
        return(ape::write.tree(td))
      }
    }
  }

  stop("Could not extract tree from ggtree object. ",
       "Pass the phylo object directly instead, e.g. msaview(tree = tree)")
}
