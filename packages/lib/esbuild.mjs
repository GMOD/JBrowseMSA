/**
 * Builds the standalone UMD-style bundle consumed in a plain HTML page via
 *   <script src="https://unpkg.com/react-msaview/bundle/index.js">
 * which exposes `window.ReactMSAView` (see USAGE.md). Unlike the npm `dist`
 * (tsc, externalized deps) this is fully self-contained: React, ReactDOM, MUI,
 * mobx and the viewer are all bundled so the script tag is the only dependency.
 */
import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/umd.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'ReactMSAView',
  outfile: 'bundle/index.js',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  minify: true,
  sourcemap: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
})
