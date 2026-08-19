# Generated intermediates in git

**Closed: already fixed. Verified 2026-08-19.**

The backlog entry claimed `scripts/*/work/` and `scripts/examples-gen/build/`
held generated `.aln`, `.dnd`, `.afa` and `.vcf` files in git, and asked for a
`.gitignore` plus a note in the generator READMEs.

Those ignores are in place — `scripts/examples-gen/.gitignore` holds `build/`,
`scripts/tp53-protein-link/.gitignore` and
`scripts/braf-protein-link/.gitignore` hold `work/`, and the other two
generators never write a work directory.
`git ls-files 'scripts/*/work/*' 'scripts/examples-gen/build/*'` returns
nothing, and neither directory exists in a clean checkout.

The `.aln` files still tracked under `packages/app/public/data/` are not this
problem. Those are the demo app's served data, load-bearing for the deployed
site, and the diff-gated `pnpm figures` / `pnpm screenshots` runs depend on
them.
