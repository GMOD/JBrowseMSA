# Demo: load an alignment by accession

A Pfam/Rfam/InterPro accession box would load the family alignment from EBI, so
a reader can try the viewer on their own family with no file handling.

Rfam accessions are especially useful. An Rfam Stockholm file carries the tree
and the secondary structure inline, so loading one exercises a path the viewer
supports but its demos rarely show.

Since 2026-09-05 the protein case partly exists, inside JBrowse rather than on
this site: jbrowse-plugin-msaview takes a UniProt accession as the query of a
`searchParams` launch or as a `geneCandidates` entry of a UniRef
`orthologParams` launch, and the tutorial index links one. A Pfam/Rfam family
box on this site is still open.
