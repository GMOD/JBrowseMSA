# Publication-grade trees in examples-gen

**Closed: the documentation half is done, and the pipeline half is out of
scope.**

The backlog entry asked to document and support an optional upgrade path from
ClustalW neighbor-joining to MAFFT/MUSCLE + IQ-TREE/FastTree in
`scripts/examples-gen`.

The documentation exists. `scripts/examples-gen/README.md` states the tradeoff
where the pipeline is described: ClustalW is progressive, fast, deterministic,
zero-config and fine for illustration; for publication you would graduate to
MAFFT/MUSCLE + IQ-TREE/RAxML. A reader following that README cannot mistake the
example trees for publication output.

Actually wiring a second toolchain into the generator is a different
proposition. It adds heavyweight external binaries to a script whose whole value
is that `apt-get install clustalw` reproduces the examples, to produce trees
that only feed demo data. `../neighbor-joining-scaling.md` reaches the same
conclusion from the other direction — pointing users at FastTree/IQ-TREE beats
making this repo's phylogenetics better.
