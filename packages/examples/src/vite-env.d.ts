/// <reference types="vite/client" />

// Fallback declarations for Vite's virtual ?raw imports, in case vite/client
// fails to resolve in a given typecheck environment (CI hoisting differences).
declare module '*?raw' {
  const src: string
  export default src
}
