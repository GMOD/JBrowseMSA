import { types } from '@jbrowse/mobx-state-tree'

import type {
  IAnyType,
  IOptionalIType,
  OptionalDefaultValueOrFunction,
} from '@jbrowse/mobx-state-tree'

/**
 * `types.stripDefault`, degrading to `types.optional` on hosts that lack it.
 *
 * stripDefault keeps defaulted properties out of snapshots, and only the
 * mobx-state-tree in unreleased @jbrowse/core has it. The plugin bundle
 * externalizes mobx-state-tree, so the host's copy is known only at runtime, and
 * calling a missing stripDefault during model construction makes PluginLoader
 * reject and the whole app show its error page.
 *
 * The signatures are identical; on older hosts, defaults reappear in snapshots
 * and shared URLs. stripDefaultSnapshot.test.ts pins the stripped behaviour.
 */
export function stripDefault<IT extends IAnyType>(
  type: IT,
  defaultValue: OptionalDefaultValueOrFunction<IT>,
): IOptionalIType<IT, [undefined]> {
  return typeof types.stripDefault === 'function'
    ? types.stripDefault(type, defaultValue)
    : types.optional(type, defaultValue)
}
