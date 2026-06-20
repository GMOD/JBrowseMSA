/**
 * Print the markdown reference-link definitions that make each user-guide figure
 * a clickable link to the live demo app, loaded into the exact same state via
 * the app's `?data=` URL-param API. Reuses the screenshot specs as the single
 * source of truth, so the live links stay in lockstep with the figures.
 *
 * Regenerate the block at the bottom of docs/user_guide.md with:
 *   node scripts/screenshots/genGuideLinks.mjs
 */
import { specs } from './specs.mjs'

const DEMO = 'https://gmod.org/JBrowseMSA/demo/'

for (const spec of specs) {
  console.log(`[live-${spec.name}]: ${DEMO}${spec.url ?? ''}`)
}
