/**
 * Builds msaview/static/widget.js, the anywidget front end. anywidget sends the
 * file's text to the page and imports it from a blob URL, so the bundle is one
 * self-contained ES module: React, MUI, mobx and the viewer included, and no
 * relative imports or extra chunks.
 */
import * as esbuild from 'esbuild'

const options = {
  entryPoints: ['src/widget.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'msaview/static/widget.js',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
}

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(options)
  await ctx.watch()
} else {
  await esbuild.build(options)
}
