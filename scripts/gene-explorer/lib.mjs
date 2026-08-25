/**
 * Shared puppeteer plumbing for the gene-explorer scripts: drive the deployed
 * page like a user would, take the JBrowse URL it builds, open it in a headless
 * swiftshader-WebGL Chrome, and wait for the structure to load and connect.
 */
import { inflateSync } from 'node:zlib'

import puppeteer from 'puppeteer-core'

import { delay, findChrome } from '../screenshots/lib.mjs'

// GENE_EXPLORER_SITE points the scripts at a local `astro dev` instead
export const SITE =
  process.env.GENE_EXPLORER_SITE ?? 'https://gmod.org/JBrowseMSA/gene-explorer/'

export function launchBrowser(viewport, extraArgs = []) {
  return puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      ...extraArgs,
    ],
    defaultViewport: viewport,
  })
}

// The "Open in JBrowse" link the page builds for a gene, polled for up to
// ~40s while the page resolves the gene, its transcript and alignment.
export async function fetchJbrowseUrl(page, symbol) {
  await page.goto(`${SITE}?gene=${symbol}`, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  })
  for (let i = 0; i < 40; i++) {
    const url = await page.evaluate(
      () =>
        [...document.querySelectorAll('a')].find(a =>
          (a.href || '').includes('session=encoded-'),
        )?.href,
    )
    if (url) {
      return url
    }
    await delay(1000)
  }
  return undefined
}

// The session snapshot inside an `encoded-` launch URL: url-safe base64 of the
// deflated JSON, the inverse of what the page's sessionUrl() emits.
export function decodeSessionUrl(url) {
  const encoded = url.split('session=encoded-')[1]
  return JSON.parse(inflateSync(Buffer.from(encoded, 'base64url')).toString())
}

// A session carrying plugins the config didn't declare trips jbrowse-web's
// trust gate; click through it. A session with no gate falls out of the loop.
export async function clickTrust(page) {
  for (let i = 0; i < 15; i++) {
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x =>
        /trust|yes|continue/i.test(x.textContent || ''),
      )
      if (b) {
        b.click()
        return true
      }
      return false
    })
    if (clicked) {
      return
    }
    await delay(1000)
  }
}

export async function openSession(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await clickTrust(page)
}

// Poll until the first ProteinView structure has loaded, aligned, and resolved
// its connected genome view (up to ~3 min: molstar + AlphaFold are slow under
// swiftshader). Returns the last readiness probe either way.
export async function waitForStructure(page) {
  let ready = {}
  for (let i = 0; i < 90; i++) {
    ready = await page.evaluate(() => {
      const root = window.JBrowseRootModel
      if (!root) {
        return { stage: 'no-root' }
      }
      const views = root.session?.views ?? []
      const pv = views.find(v => v.type === 'ProteinView')
      const msa = views.find(v => v.type === 'MsaView')
      const s = pv?.structures?.[0]
      return {
        msaConnected: !!msa?.connectedView,
        structure: !!s,
        structureConnected: !!s?.connectedView,
        aligned: !!s?.pairwiseAlignment,
        seqCount: s?.structureSequences?.length ?? 0,
        error: pv?.error
          ? String(pv.error)
          : s?.error
            ? String(s.error)
            : undefined,
      }
    })
    if (ready.error) {
      console.log('  [model error]', ready.error)
    }
    if (ready.structure && ready.aligned && ready.structureConnected) {
      break
    }
    await delay(2000)
  }
  return ready
}
