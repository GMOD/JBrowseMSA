// Guard: this workspace is pnpm-only (pnpm-workspace.yaml, overrides,
// allowBuilds, and a single pnpm-lock.yaml at the root). Installing with npm or
// yarn silently produces a different, unvetted dependency tree and drops a
// second lockfile. Fail fast instead.
//
// Dependency-free on purpose so it works offline and before anything is
// installed. Run as the root `preinstall` script; the root package is private,
// so this never runs for consumers of the published packages.

const agent = process.env.npm_config_user_agent ?? ''

if (agent && !agent.startsWith('pnpm/')) {
  const name = agent.split('/')[0]
  console.error(
    `\nThis repository uses pnpm. You ran "${name}".\n\n` +
      `  corepack enable\n` +
      `  pnpm install\n\n` +
      `See CLAUDE.md / README.md for the workspace setup.\n`,
  )
  process.exit(1)
}
