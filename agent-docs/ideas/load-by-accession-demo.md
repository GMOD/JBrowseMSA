# Demo: load an alignment by accession

A Pfam/Rfam/InterPro accession box that pulls the family alignment from EBI —
"try it on your own family" with no file handling at all.

Rfam pays double. Its Stockholm carries the tree and the secondary structure
inline, so an Rfam accession exercises a path the viewer supports but barely
demos.

The protein half is partly there since 2026-09-05, inside JBrowse rather than on
this site: jbrowse-plugin-msaview takes a UniProt accession as the query of a
`searchParams` launch or as a `geneCandidates` entry of a UniRef
`orthologParams` launch, and the gallery links one. A Pfam/Rfam family box on
this site is still open.
