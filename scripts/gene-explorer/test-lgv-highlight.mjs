/**
 * Live end-to-end test of the gene explorer's ProteinView (3D) -> LinearGenomeView
 * hover linkage, against the deployed site + JBrowse + plugins + hosted data.
 *
 * Drives the real gene-explorer page (so the session spec is exactly what the
 * site builds — MSA row, knownCanonical feature, AlphaFold url and all), grabs
 * its "Open in JBrowse" URL, opens it in the live webgl-poc JBrowse in a real
 * (headless, swiftshader-WebGL) Chrome, waits for the AlphaFold structure to load
 * and align, then drives the structure model's hover directly
 * (structure.setHoveredPosition — exactly what molstar's hover handler does) and
 * asserts the genome regions it produces (structure.hoverGenomeHighlights, which
 * the LGV renders) land in the gene's CDS and that adjacent residues map one
 * codon (3 bp) apart.
 *
 *   node scripts/gene-explorer/test-lgv-highlight.mjs [SYMBOL]   # default TP53
 */
import puppeteer from 'puppeteer-core'

import { delay, findChrome } from '../screenshots/lib.mjs'

const SYMBOL = process.argv[2] ?? 'TP53'
const SITE = `https://gmod.org/JBrowseMSA/gene-explorer/?gene=${SYMBOL}`
const MSA_GZ =
  'https://jbrowse.org/demos/msaview/100way/hg38.knownCanonical.multiz100way.aa.fa.gz'

// CDS bounds straight from the plain-text .cds sidecar (no bgzf needed here)
async function cdsBounds(symbol) {
  const text = await (await fetch(`${MSA_GZ}.cds`)).text()
  const line = text.split('\n').find(l => l.startsWith(`${symbol}\t`))
  if (!line) {
    throw new Error(`${symbol} not in .cds index`)
  }
  const [, , refName, , spec] = line.split('\t')
  const starts = spec.split(',').map(s => Number(s.split(':')[0]))
  const ends = spec.split(',').map(s => Number(s.split(':')[1]))
  // the session emits canonical refnames (hg38 sequence is "17", not "chr17")
  return {
    refName: refName.replace(/^chr/, ''),
    min: Math.min(...starts),
    max: Math.max(...ends),
  }
}

async function main() {
  const cds = await cdsBounds(SYMBOL)
  console.log(`${SYMBOL}  CDS ${cds.refName}:${cds.min}-${cds.max}`)

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
    defaultViewport: { width: 1600, height: 900 },
  })
  const failures = []
  try {
    const page = await browser.newPage()
    page.on('pageerror', e => console.log('  [pageerror]', e.message))

    // ---- 1. the gene-explorer page builds the spec; grab its JBrowse URL ----
    await page.goto(SITE, { waitUntil: 'networkidle2', timeout: 60000 })
    let jbrowseUrl
    let pageState
    for (let i = 0; i < 40; i++) {
      pageState = await page.evaluate(() => {
        const txt = document.body.innerText
        const anchor = [...document.querySelectorAll('a')].find(a =>
          (a.href || '').includes('session=spec-'),
        )
        return {
          jbrowseUrl: anchor?.href,
          previewLoaded: txt.includes('100-way alignment'),
          notHostedMsg: txt.includes('once the alignment file is hosted'),
          error:
            /error|failed|not found/i.test(txt) && txt.length < 400
              ? txt
              : undefined,
        }
      })
      if (pageState.jbrowseUrl) break
      await delay(1000)
    }
    console.log(
      '  page:',
      JSON.stringify({
        gotUrl: !!pageState.jbrowseUrl,
        previewLoaded: pageState.previewLoaded,
        notHostedMsg: pageState.notHostedMsg,
      }),
    )
    if (!pageState.jbrowseUrl) {
      failures.push('gene-explorer page never produced an Open-in-JBrowse URL')
    }
    if (pageState.notHostedMsg) {
      failures.push(
        'page shows stale "alignment not hosted" message (MSA preview did not load)',
      )
    }
    jbrowseUrl = pageState.jbrowseUrl
    const hasProteinView = jbrowseUrl?.includes('ProteinView')
    if (jbrowseUrl && !hasProteinView) {
      failures.push('spec has no ProteinView (no structure linkage to test)')
    }

    // ---- 2. open the built session in live JBrowse, test 3D -> LGV ----------
    if (jbrowseUrl && hasProteinView) {
      await page.goto(jbrowseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
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
        if (clicked) break
        await delay(1000)
      }

      // fail fast: the LGV must keep the spec's pinned id so connectedViewId
      // resolves. A stale jbrowse build assigns a random id (no linkage). Don't
      // wait on the slow molstar load if the connection can't form anyway.
      let connected = false
      let lgvId
      for (let i = 0; i < 20; i++) {
        const c = await page.evaluate(() => {
          const views = window.JBrowseRootModel?.session?.views ?? []
          const lgv = views.find(v => v.type === 'LinearGenomeView')
          return {
            lgvId: lgv?.id,
            anyConnected: views.some(v => v.connectedViewId && v.connectedView),
          }
        })
        lgvId = c.lgvId
        if (c.anyConnected) {
          connected = true
          break
        }
        await delay(1500)
      }
      console.log(
        `  LGV id=${lgvId} (spec pinned lgv-${SYMBOL})  connectedViewResolves=${connected}`,
      )
      if (!connected) {
        failures.push(
          `no view resolved connectedView — LGV id "${lgvId}" != pinned "lgv-${SYMBOL}" (stale jbrowse build not preserving spec id?)`,
        )
      }

      let ready = {}
      if (connected) {
        for (let i = 0; i < 90; i++) {
          ready = await page.evaluate(() => {
            const root = window.JBrowseRootModel
            if (!root) return { stage: 'no-root' }
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
          if (ready.error) console.log('  [model error]', ready.error)
          if (ready.structure && ready.aligned && ready.structureConnected)
            break
          await delay(2000)
        }
        console.log('  jbrowse ready:', JSON.stringify(ready))
        if (!ready?.aligned)
          failures.push('structure pairwiseAlignment never computed')
        if (!ready?.structureConnected)
          failures.push('structure.connectedView never resolved')
      }

      if (ready?.aligned && ready?.structureConnected) {
        const probe = await page.evaluate(
          (min, max) => {
            const root = window.JBrowseRootModel
            const s = root.session.views.find(v => v.type === 'ProteinView')
              .structures[0]
            const mid = Math.floor(
              (s.userProvidedTranscriptSequence?.length ?? 200) / 2,
            )
            const read = pos => {
              s.setHoveredPosition({ structureSeqPos: pos })
              const h = s.hoverGenomeHighlights
              return h?.length ? { ...h[0] } : undefined
            }
            const a = read(mid)
            const b = read(mid + 1)
            s.setClickedStructureRange({ start: mid, end: mid + 5 })
            const click = s.clickGenomeHighlights
            return {
              mid,
              a,
              b,
              click: click?.length ? { ...click[0] } : undefined,
              inCds: a ? a.start >= min && a.start <= max : false,
              codonGap: a && b ? Math.abs(a.start - b.start) : undefined,
            }
          },
          cds.min,
          cds.max,
        )
        console.log('  probe:', JSON.stringify(probe))

        if (!probe.a)
          failures.push('hoverGenomeHighlights empty for a mid-protein residue')
        if (probe.a && !probe.inCds)
          failures.push(
            `highlight start ${probe.a.start} outside CDS [${cds.min},${cds.max}]`,
          )
        if (probe.a && probe.a.refName !== cds.refName)
          failures.push(
            `highlight refName ${probe.a.refName} != ${cds.refName}`,
          )
        if (probe.codonGap !== undefined && probe.codonGap !== 3)
          failures.push(
            `adjacent residues map ${probe.codonGap} bp apart, expected 3`,
          )
        if (!probe.click) failures.push('clickGenomeHighlights empty')

        // the model getter being right isn't enough — the LGV must actually
        // RENDER the highlight. This catches the refname-aliasing class of bug
        // (correct coords, but the overlay can't place itself). Let mobx/React
        // flush, then look for the rendered highlight overlay in the DOM.
        await delay(2500)
        const domHighlights = await page.evaluate(
          () =>
            [...document.querySelectorAll('div')].filter(
              d =>
                getComputedStyle(d).backgroundColor ===
                'rgba(255, 255, 0, 0.2)',
            ).length,
        )
        console.log('  rendered highlight overlays in LGV:', domHighlights)
        if (domHighlights === 0)
          failures.push(
            'LGV rendered NO highlight overlay despite valid clickGenomeHighlights (refname alias / rendering bug)',
          )
      }
    }
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\nFAIL (${SYMBOL}):\n - ${failures.join('\n - ')}`)
    process.exit(1)
  }
  console.log(
    `\nPASS: ${SYMBOL} ProteinView -> LGV genome highlight is correct.`,
  )
}

main().catch(e => {
  console.error('ERROR', e)
  process.exit(1)
})
