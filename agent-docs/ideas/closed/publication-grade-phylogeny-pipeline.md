# Publication-grade trees in examples-gen

**Closed: the documentation half is done, and the pipeline half is out of
scope.**

The backlog entry asked to document and support an optional upgrade path from
ClustalW neighbor-joining to MAFFT/MUSCLE + IQ-TREE/FastTree in
`scripts/examples-gen`.

The documentation exists. `scripts/examples-gen/README.md` states the tradeoff
where it describes the pipeline: ClustalW is progressive, fast, deterministic,
zero-config and fine for illustration, and publication work would move to
MAFFT/MUSCLE + IQ-TREE/RAxML. A reader following that README cannot mistake the
example trees for publication output.

Wiring a second toolchain into the generator is a bigger change. It adds
heavyweight external binaries to a script that exists so that
`apt-get install clustalw` reproduces the examples, and the trees it would
produce only feed demo data. `../neighbor-joining-scaling.md` reaches the same
conclusion from the other direction: pointing users at FastTree/IQ-TREE is
better than improving this repo's phylogenetics.
