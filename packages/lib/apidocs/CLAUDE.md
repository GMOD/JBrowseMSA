## Generated files: do not hand-edit

`pnpm --filter react-msaview statedocs` generates every `.md` file in this
directory except this one. It reads the `#stateModel`, `#property`, `#volatile`,
`#getter`, `#action` and `#method` tags in `packages/lib/src/model.ts` and the
models under `packages/lib/src/model/`.

To change what these docs say, edit the doc comment on the model member and
re-run the generator. The next run discards a hand-patched entry, and until then
the file disagrees with the source.

The generator parses with an aliased TypeScript 6 (`typescript6` in the root
devDependencies), not the repo's TypeScript 7. The native compiler exposes no
`createProgram`, checker, or scanner to build an AST with. Keep the alias when
bumping TypeScript.
