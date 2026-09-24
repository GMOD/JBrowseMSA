# TEM beta-lactamase allele data

The files the figures in [`docs/tutorials/tem_alleles.md`](../../../../../docs/tutorials/tem_alleles.md)
load, served at `gmod.org/JBrowseMSA/demo/data/tem/*`. All of them come out of
one run of `docs/tutorials/scripts/build_tem_alleles.sh`, which downloads NCBI's
Reference Gene Catalog and the AMRFinderPlus reference proteins. Regenerate
with:

```sh
bash docs/tutorials/scripts/build_tem_alleles.sh /tmp/tem
cp /tmp/tem/tem.afa /tmp/tem/tem.nwk /tmp/tem/tem-rowdata.json /tmp/tem/tem-alleles.tsv packages/app/public/data/tem/
```

| File               | Rows | Format          | Provenance                                                                                                                                       |
| ------------------ | ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tem-alleles.tsv`  | 46   | TSV             | The selection: the twelve lowest-numbered `blaTEM-<n>` alleles of each phenotype the catalog's product names record, with subclass and accession   |
| `tem.afa`          | 46   | FASTA (aligned) | ClustalW 2.1 over the AMRProt.fa sequences of those accessions, 286 columns, deflines the allele names                                            |
| `tem.nwk`          | 46   | Newick          | ClustalW neighbor joining on the alignment                                                                                                       |
| `tem-rowdata.json` | 46   | JSON object     | The row table: the catalog's phenotype and subclass per allele, plus the residue it carries at Ambler 104, 164, 238, 240, 69, 244, 276 and 265    |

The viewer loads all three of the alignment, the tree and the row table by URL,
the last through `treeMetadataFilehandle`, since the table is 11 kB and the
filehandle keeps the link short.
