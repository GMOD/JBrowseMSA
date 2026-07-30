import { types } from '@jbrowse/mobx-state-tree'

import type {
  IAnyType,
  IOptionalIType,
  OptionalDefaultValueOrFunction,
} from '@jbrowse/mobx-state-tree'

/**
 * `types.stripDefault`, degrading to `types.optional` on hosts that lack it.
 *
 * stripDefault keeps defaulted properties out of snapshots, but it exists only
 * in the mobx-state-tree that ships with unreleased @jbrowse/core. This package
 * declares `@jbrowse/mobx-state-tree: ^5.0.0`, and inside jbrowse-web the host
 * supplies its own copy at runtime -- the plugin bundle externalizes it -- so we
 * genuinely do not know which version we are calling until we are running.
 *
 * Calling it where it is absent throws while the model is being constructed,
 * which in a plugin bundle means PluginLoader rejects and the entire app renders
 * its error page. Losing minimal snapshots is a far better failure than losing
 * the session, so this degrades instead.
 *
 * The two signatures are identical, so behaviour differs only in that defaults
 * reappear in snapshots on older hosts (bigger session snapshots and shared
 * URLs, nothing incorrect). stripDefaultSnapshot.test.ts still pins the stripped
 * behaviour, since dev runs against a version that has it.
 */
export function stripDefault<IT extends IAnyType>(
  type: IT,
  defaultValue: OptionalDefaultValueOrFunction<IT>,
): IOptionalIType<IT, [undefined]> {
  return typeof types.stripDefault === 'function'
    ? types.stripDefault(type, defaultValue)
    : types.optional(type, defaultValue)
}
