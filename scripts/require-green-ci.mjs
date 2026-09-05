#!/usr/bin/env node
//
// Refuses to tag a release unless CI is green on the exact commit being tagged
// -- pushing that commit and waiting for the run, rather than making you do both
// by hand.
//
// release.js builds before it tags, so a broken build already cannot get a tag.
// Nothing local covers the rest: lint, typecheck and the test suite only ever
// run in CI, so without this the tag can carry a tree that fails all three.
//
// The commit it pushes is the one release.js is about to tag anyway -- it pushes
// branch and tag together at the end either way, so waiting here only moves that
// push earlier and buys the CI result before the tag exists rather than after.
//
// CI_WAIT_MINUTES=0 restores a plain check: report the current state and exit,
// never push, never wait.
//
// Escape hatch: ALLOW_RED_CI=1 pnpm release:patch
//
/* global process, console */
/* eslint-disable no-console */
import { execFileSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const WORKFLOW = 'CI'
const POLL_MS = 15_000
const WAIT_MS = Number(process.env.CI_WAIT_MINUTES ?? 45) * 60_000

// A workflow that never starts is indistinguishable from one queued behind a
// busy runner until you decide how long "never" is.
const APPEAR_MS = 5 * 60_000

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function pushed(sha) {
  return !!git('branch', '-r', '--contains', sha)
}

function latestRun(sha) {
  const { workflow_runs } = JSON.parse(
    execFileSync(
      'gh',
      ['api', `repos/:owner/:repo/actions/runs?head_sha=${sha}`],
      { encoding: 'utf8' },
    ),
  )
  return workflow_runs.find(r => r.name === WORKFLOW)
}

function fail(problem) {
  console.error(
    `Refusing to release: ${problem}\n\n` +
      'npm has no undo, and jbrowse-plugin-msaview bundles this package into the\n' +
      'UMD the plugin store serves with no-cache. If the failure is genuinely\n' +
      'unrelated, rerun with ALLOW_RED_CI=1 and say why in the release notes.',
  )
  process.exit(1)
}

async function main() {
  const sha = git('rev-parse', 'HEAD')
  const short = sha.slice(0, 7)

  if (!WAIT_MS) {
    if (!pushed(sha)) {
      fail(`HEAD (${short}) is not pushed, so ${WORKFLOW} has never seen it`)
    }
    const run = latestRun(sha)
    if (!run) {
      fail(`no ${WORKFLOW} run exists for ${short}`)
    } else if (run.status !== 'completed') {
      fail(`${WORKFLOW} is still ${run.status} -- wait for it: ${run.html_url}`)
    } else if (run.conclusion !== 'success') {
      fail(`${WORKFLOW} concluded ${run.conclusion}: ${run.html_url}`)
    }
    console.log(`${WORKFLOW} is green on ${short}: ${run.html_url}`)
    return
  }

  if (!pushed(sha)) {
    console.log(`Pushing ${short} so ${WORKFLOW} can see it`)
    execFileSync('git', ['push'], { stdio: 'inherit' })
  }

  const started = Date.now()
  let announced

  for (;;) {
    const run = latestRun(sha)

    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') {
        fail(`${WORKFLOW} concluded ${run.conclusion}: ${run.html_url}`)
      }
      console.log(`${WORKFLOW} is green on ${short}: ${run.html_url}`)
      return
    }

    if (run && announced !== run.id) {
      console.log(`Waiting for ${WORKFLOW} on ${short}: ${run.html_url}`)
      announced = run.id
    }

    const waited = Date.now() - started
    if (!run && waited > APPEAR_MS) {
      fail(
        `no ${WORKFLOW} run appeared for ${short} in ${APPEAR_MS / 60_000} minutes -- ` +
          'check the workflow still triggers on this branch',
      )
    }
    if (waited > WAIT_MS) {
      fail(
        `${WORKFLOW} is still ${run.status} after ${WAIT_MS / 60_000} minutes: ${run.html_url}`,
      )
    }

    await sleep(POLL_MS)
  }
}

if (process.env.ALLOW_RED_CI) {
  console.warn('ALLOW_RED_CI set -- skipping the green-CI release gate')
} else {
  await main()
}
