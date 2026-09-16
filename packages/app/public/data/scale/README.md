# Hosted data for the RSV tutorials

Served at `gmod.org/JBrowseMSA/demo/data/scale/*`, generated from Nextstrain's
RSV-A genome build (https://data.nextstrain.org/rsv_a_genome.json) by
`docs/tutorials/scripts/build_phylogeny_at_scale.sh` (the alignments and trees)
and `docs/tutorials/scripts/build_phylogeny_metadata.py` (the row table).
Regenerate with:

```sh
bash docs/tutorials/scripts/build_phylogeny_at_scale.sh /tmp/scale
python3 docs/tutorials/scripts/build_phylogeny_metadata.py /tmp/scale
cp /tmp/scale/rsv-{full,sample}.{aln,nh} packages/app/public/data/scale/
cp /tmp/scale/rsv-sample-rowdata.json packages/app/public/data/scale/
```

| File             | Rows | Format         | Provenance                                                                                                                        |
| ---------------- | ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `rsv-full.aln`   | 1840 | FASTA (aligned) | Every tip in the build, reconstructed to reference coordinates from the root sequence and each branch's mutations, sliced to the G gene (966 nt) so the file stays a few MB |
| `rsv-full.nh`    | 1840 | Newick          | The build's own tree, tip names `accession\|clade\|country\|year`, branch lengths from each node's cumulative divergence          |
| `rsv-sample.aln` | 184  | FASTA (aligned) | Every 10th tip in `rsv-full.aln`'s own order, whole genome (15,225 nt)                                                             |
| `rsv-sample.nh`  | 184  | Newick          | `rsv-full.nh` pruned to the same 184 tips                                                                                          |
| `rsv-sample-rowdata.json` | 184 | JSON object | The row table `docs/tutorials/phylogeny_metadata.md` encodes, keyed by the same row names: `clade`, `country`, `region` and `year` from each tip's `node_attrs`, written by `docs/tutorials/scripts/build_phylogeny_metadata.py` |
