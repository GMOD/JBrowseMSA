/**
 * Bundles the CLI into one self-contained dist/index.js.
 *
 * The viewer's runtime -- @jbrowse/core, MUI, mobx, mobx-state-tree, React --
 * has to be one copy of each or the model's identifier types throw on create.
 * Left as npm dependencies, that is a peer puzzle the installer loses: the
 * @jbrowse/core on npm pins mobx 6 / mobx-state-tree 5 / MUI 7 while this
 * workspace builds against mobx 7 / 6 / MUI 9, so `npm i -g react-msaview-cli`
 * ended up with two mobx copies and every command that renders died with
 * "[mobx-state-tree] Identifier types can only be instantiated as direct child
 * of a model type". Bundling ships the exact tree the repo tested.
 *
 * jsdom stays external (a dependency) because it carries its own resolution of
 * native-ish modules, and @napi-rs/canvas is optional and loaded dynamically.
 */
import * as esbuild from 'esbuild'

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node22',
  jsx: 'automatic',
  external: ['jsdom', '@napi-rs/canvas'],
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
}

if (process.argv.includes('--watch')) {
  await (await esbuild.context(options)).watch()
} else {
  await esbuild.build(options)
}
