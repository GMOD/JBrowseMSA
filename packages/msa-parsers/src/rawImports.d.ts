// Vitest resolves a `?raw` import to the file's text, which is how the tests
// read their fixtures; tsc emits nothing for a .d.ts, so this stays out of the
// published types.
declare module '*?raw' {
  const content: string
  export default content
}
