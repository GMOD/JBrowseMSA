import { parseEmfAln, parseEmfTree as parseEmfTreeBody } from 'emf-js'

/**
 * EMF text from its first `SEQ` line on. An Ensembl Compara dump opens with
 * `##FORMAT (compara)`, `##DATE`, `##RELEASE` and `#` comment lines, which
 * emf-js would read as alignment columns.
 */
export function stripEmfHeader(text: string) {
  return text.replace(/^(?:#[^\n]*\n|[^\S\n]*\n)*/, '')
}

export function isEmf(text: string) {
  return stripEmfHeader(text).startsWith('SEQ')
}

export function parseEmfAlignment(text: string) {
  return parseEmfAln(stripEmfHeader(text))
}

export function parseEmfTree(text: string) {
  return parseEmfTreeBody(stripEmfHeader(text))
}
