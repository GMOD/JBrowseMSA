import type { FileLocation } from '@jbrowse/core/util/types'

/**
 * The name to save an export under: the loaded file's name with the extension
 * swapped, or `fallback` when the data was pasted in.
 */
export function exportFileName(
  location: FileLocation | undefined,
  extension: string,
  fallback = 'image',
) {
  const loc = location as
    | { uri?: string; localPath?: string; name?: string }
    | undefined
  const path = loc?.uri ?? loc?.localPath ?? loc?.name
  const base = path
    ?.split(/[?#]/)[0]
    ?.split(/[/\\]/)
    .pop()
    ?.replace(/\.[^.]*$/, '')
  return `${base || fallback}.${extension}`
}
