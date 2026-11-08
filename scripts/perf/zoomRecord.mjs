// node scripts/perf/zoomRecord.mjs <dist> <out.webm> [large|small] [cpuRate]
import { launch } from 'puppeteer-core'

import {
  BROWSER_ARGS,
  delay,
  findChrome,
  startStaticServer,
} from '../screenshots/lib.mjs'

const [dist, out, dataset = 'large', rate = '1'] = process.argv.slice(2)
const PORT = 4190 + Math.floor(Math.random() * 100)

const snap = msaview =>
  `#data=${encodeURIComponent(JSON.stringify({ msaview: { type: 'MsaView', height: 600, ...msaview } }))}`
const urls = {
  large: snap({
    msaFilehandle: { uri: 'data/zoombench-large.fa' },
    treeFilehandle: { uri: 'data/zoombench-large.nh' },
  }),
  small: snap({
    msaFilehandle: { uri: 'data/kinase.aln' },
    treeFilehandle: { uri: 'data/kinase.nh' },
  }),
}

const flick = dir => [0, 40, 80, 120, 160].map(t => [t, dir * 100])
const notch = dir => [[0, dir * 100]]
const pinch = dir =>
  Array.from({ length: 60 }, (_, i) => [
    i * 8,
    dir * (1 + 3 * Math.sin((Math.PI * i) / 59)),
  ])

// [pause before, gesture]
const script = [
  [600, notch(-1)],
  [500, notch(-1)],
  [500, notch(-1)],
  [800, flick(1)],
  [900, pinch(-1)],
  [700, pinch(1)],
  [700, flick(-1)],
  [700, flick(1)],
]

const server = await startStaticServer(PORT, dist)
const browser = await launch({
  executablePath: findChrome(),
  headless: true,
  args: [...BROWSER_ARGS, '--window-size=1200,760'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 760 })
  const cdp = await page.createCDPSession()
  await page.goto(`http://localhost:${PORT}/${urls[dataset]}`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  })
  const canvas = await page.waitForSelector('[data-testid="msa_canvas"]', {
    visible: true,
    timeout: 60000,
  })
  await delay(1500)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) })
  const box = await canvas.boundingBox()
  const x = Math.round(box.x + box.width * 0.4)
  const y = Math.round(box.y + Math.min(box.height, 500) * 0.4)
  await page.mouse.move(x, y)
  const recorder = await page.screencast({ path: out, fps: 30 })
  for (const [pause, steps] of script) {
    await delay(pause)
    const t0 = performance.now()
    for (const [at, deltaY] of steps) {
      const wait = t0 + at - performance.now()
      if (wait > 0) {
        await delay(wait)
      }
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x,
        y,
        deltaX: 0,
        deltaY,
        modifiers: 2,
      })
    }
  }
  await delay(1000)
  await recorder.stop()
} finally {
  await browser.close()
  server.close()
}
