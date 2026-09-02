import type { FileLocation } from '@jbrowse/core/util/types'

/**
 * The name to save an export under: the loaded alignment's file name with the
 * extension swapped, or a plain default when the alignment was pasted in.
 */
export function exportFileName(
  location: FileLocation | undefined,
  extension: string,
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
  return `${base || 'image'}.${extension}`
}
