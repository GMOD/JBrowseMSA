# msaviewr Shiny example
# Demonstrates reactive MSA viewing with file upload

library(shiny)
library(msaviewr)

ui <- fluidPage(
  titlePanel("MSA Viewer"),
  sidebarLayout(
    sidebarPanel(
      fileInput("msa_file", "Upload alignment (FASTA/Stockholm/Clustal)",
                accept = c(".fa", ".fasta", ".stock", ".sto", ".aln", ".clustal")),
      fileInput("tree_file", "Upload tree (Newick, optional)",
                accept = c(".nwk", ".nh", ".newick", ".tree")),
      selectInput("color_scheme", "Color scheme",
                  choices = c("maeditor", "clustal", "lesk", "cinema", "flower",
                              "nucleotide", "purine_pyrimidine",
                              "clustalx_protein_dynamic",
                              "percent_identity_dynamic"),
                  selected = "maeditor"),
      actionButton("example_btn", "Load example data")
    ),
    mainPanel(
      msaviewOutput("msa_viewer", height = "600px")
    )
  )
)

server <- function(input, output, session) {
  msa_data <- reactiveVal(NULL)
  tree_data <- reactiveVal(NULL)

  observeEvent(input$msa_file, {
    msa_data(input$msa_file$datapath)
  })

  observeEvent(input$tree_file, {
    tree_data(input$tree_file$datapath)
  })

  observeEvent(input$example_btn, {
    msa_data(paste0(
      ">human\nMVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH\n",
      ">mouse\nMVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH\n",
      ">goat\nMSLTRTERTIILSLWSKISTQADVIGTETLERLFSCYPQAKTYFPHFDLHS"
    ))
    tree_data("((human:0.1,mouse:0.2):0.05,goat:0.3);")
  })

  output$msa_viewer <- renderMsaview({
    req(msa_data())
    msaview(
      msa = msa_data(),
      tree = tree_data(),
      color_scheme = input$color_scheme
    )
  })
}

shinyApp(ui, server)
