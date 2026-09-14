// Vite resolves a `?raw` import to the file's text. The lib does not build with
// Vite, but realResidueMapping.test.ts reads the examples package's alignment
// files that way (they are files, not string constants), so tsc has to be told
// what the suffix means. tsconfig.build.json excludes this, and tsc emits
// nothing for a .d.ts anyway, so it stays out of the published types.
declare module '*?raw' {
  const content: string
  export default content
}
