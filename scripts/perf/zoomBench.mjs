// Ctrl-wheel zoom benchmark: drives the built demo app with synthetic wheel
// events over a few alignment sizes and reports frame intervals, long tasks,
// Chrome's per-category task time and the hottest functions in a CPU profile.
//
//   node scripts/perf/zoomBench.mjs --build            # build the app first
//   node scripts/perf/zoomBench.mjs --cpu=1,4 --sizes=small,large --top=25
//
// --build writes an unminified, source-mapped app build to --dist (default
// $TMPDIR/msa-zoombench-dist), so the profile names functions by source line.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { launch } from 'puppeteer-core'

import {
  BROWSER_ARGS,
  appDataDir,
  delay,
  findChrome,
  flag,
  listOpt,
  numOpt,
  opt,
  repoRoot,
  startStaticServer,
} from '../screenshots/lib.mjs'

const PORT = numOpt('port', 4179)
const dist = opt('dist', path.join(os.tmpdir(), 'msa-zoombench-dist'))
const cpuRates = (listOpt('cpu').length ? listOpt('cpu') : ['1', '4']).map(
  Number,
)
const sizeNames = listOpt('sizes').length
  ? listOpt('sizes')
  : ['small', 'medium', 'large']
const topN = numOpt('top', 20)
const outJson = opt('json', undefined)

if (flag('build') || !fs.existsSync(path.join(dist, 'index.html'))) {
  execFileSync(
    'pnpm',
    [
      '--filter',
      'app',
      'exec',
      'vite',
      'build',
      '--minify',
      'false',
      '--sourcemap',
      'true',
      '--outDir',
      dist,
      '--emptyOutDir',
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  )
}

// deterministic PRNG so every run benchmarks the same alignment
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// rows descend from one ancestor through a balanced binary tree, mutating and
// gapping along each branch, so the colors and the tree look like real data
function syntheticAlignment(rows, cols, seed = 1) {
  const rand = rng(seed)
  const aa = 'ACDEFGHIKLMNPQRSTVWY'
  const mutate = (seq, rate) =>
    seq.map(c =>
      rand() < rate ? (rand() < 0.1 ? '-' : aa[Math.floor(rand() * 20)]) : c,
    )
  const root = Array.from({ length: cols }, () => aa[Math.floor(rand() * 20)])
  const seqs = []
  function grow(seq, n, prefix) {
    if (n === 1) {
      const name = `seq${seqs.length}`
      seqs.push([name, mutate(seq, 0.03).join('')])
      return `${name}:0.03`
    }
    const half = Math.floor(n / 2)
    const left = grow(mutate(seq, 0.05), half, `${prefix}0`)
    const right = grow(mutate(seq, 0.05), n - half, `${prefix}1`)
    return `(${left},${right}):0.05`
  }
  const tree = `${grow(root, rows, '')};`
  const fasta = seqs.map(([n, s]) => `>${n}\n${s}`).join('\n')
  return { fasta, tree }
}

const dataDir = path.join(dist, 'data')
fs.mkdirSync(dataDir, { recursive: true })
for (const [name, rows, cols] of [
  ['medium', 500, 1000],
  ['large', 2000, 3000],
]) {
  const file = path.join(dataDir, `zoombench-${name}.fa`)
  if (!fs.existsSync(file)) {
    const { fasta, tree } = syntheticAlignment(rows, cols)
    fs.writeFileSync(file, fasta)
    fs.writeFileSync(path.join(dataDir, `zoombench-${name}.nh`), tree)
  }
}
if (!fs.existsSync(path.join(dataDir, 'kinase.aln'))) {
  fs.cpSync(appDataDir, dataDir, { recursive: true })
}

const snap = msaview =>
  `#data=${encodeURIComponent(JSON.stringify({ msaview: { type: 'MsaView', height: 700, ...msaview } }))}`

const sizes = {
  small: snap({
    msaFilehandle: { uri: 'data/kinase.aln' },
    treeFilehandle: { uri: 'data/kinase.nh' },
  }),
  medium: snap({
    msaFilehandle: { uri: 'data/zoombench-medium.fa' },
    treeFilehandle: { uri: 'data/zoombench-medium.nh' },
  }),
  large: snap({
    msaFilehandle: { uri: 'data/zoombench-large.fa' },
    treeFilehandle: { uri: 'data/zoombench-large.nh' },
  }),
}

// each step is [msSinceGestureStart, deltaY]
const flick = dir => [0, 40, 80, 120, 160].map(t => [t, dir * 100])
const pinch = dir =>
  Array.from({ length: 50 }, (_, i) => [
    i * 8,
    dir * (2 + 4 * Math.sin((Math.PI * i) / 49)),
  ])

const scenarios = {
  'flick 5 notches in/out x3': [
    ...Array.from({ length: 3 }, () => [flick(-1), flick(1)]).flat(),
  ],
  'pinch 50 events in/out x3': [
    ...Array.from({ length: 3 }, () => [pinch(-1), pinch(1)]).flat(),
  ],
  'sweep: zoom out to min, back in': [
    ...Array.from({ length: 6 }, () => flick(1)),
    ...Array.from({ length: 6 }, () => flick(-1)),
  ],
}

const pct = (arr, p) => {
  if (!arr.length) {
    return 0
  }
  const s = [...arr].toSorted((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}

async function runGesture(cdp, x, y, steps) {
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

// a source map's mappings decoded per generated line into
// [genCol, sourceIndex, sourceLine] triples, enough to name a frame's source
const B64 = Object.fromEntries(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .map((c, i) => [c, i]),
)
function decodeMappings(mappings) {
  const lines = []
  let src = 0
  let srcLine = 0
  let srcCol = 0
  let name = 0
  for (const line of mappings.split(';')) {
    const segs = []
    let genCol = 0
    for (const seg of line.split(',')) {
      if (!seg) {
        continue
      }
      const vals = []
      let shift = 0
      let value = 0
      for (const c of seg) {
        const d = B64[c]
        value += (d & 31) << shift
        if (d & 32) {
          shift += 5
        } else {
          vals.push(value & 1 ? -(value >>> 1) : value >>> 1)
          value = 0
          shift = 0
        }
      }
      genCol += vals[0]
      if (vals.length >= 4) {
        src += vals[1]
        srcLine += vals[2]
        srcCol += vals[3]
        if (vals.length === 5) {
          name += vals[4]
        }
        segs.push([genCol, src, srcLine])
      }
    }
    lines.push(segs)
  }
  return lines
}

const sourceMaps = new Map()
function mapFor(url) {
  if (!sourceMaps.has(url)) {
    let map = null
    const m = /\/assets\/[^?#]+\.js$/.exec(url)
    const file = m && path.join(dist, m[0].slice(1) + '.map')
    if (file && fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
      map = { sources: raw.sources, lines: decodeMappings(raw.mappings) }
    }
    sourceMaps.set(url, map)
  }
  return sourceMaps.get(url)
}

function locate(cf) {
  if (!cf.url) {
    return String(cf.functionName) || '(native)'
  }
  const fn = String(cf.functionName) || '(anon)'
  const segs = mapFor(cf.url)?.lines[cf.lineNumber]
  let hit
  for (const s of segs ?? []) {
    if (s[0] > cf.columnNumber) {
      break
    }
    hit = s
  }
  if (hit) {
    const map = mapFor(cf.url)
    const src = map.sources[hit[1]]
      .replace(/^.*?node_modules\/\.pnpm\/[^/]+\/node_modules\//, '')
      .replace(/^(\.\.\/)+/, '')
      .replace(`${repoRoot.slice(1)}/`, '')
    return `${fn} ${src}:${hit[2] + 1}`
  }
  return `${fn} ${path.basename(cf.url)}:${cf.lineNumber + 1}`
}

const ours = k => k.includes(' packages/')

function addTo(m, k, dt) {
  m.set(k, (m.get(k) ?? 0) + dt)
}

function byValueDescending(m) {
  return [...m.entries()].toSorted((a, b) => b[1] - a[1])
}

// self and inclusive (once per sample stack) time per function, plus the
// inclusive time of our functions inside runs of busy samples longer than
// 50ms, which are the tasks that drop frames
function summarizeProfile(profile) {
  const parent = new Map()
  for (const n of profile.nodes) {
    for (const c of n.children ?? []) {
      parent.set(c, n.id)
    }
  }
  const key = new Map(profile.nodes.map(n => [n.id, locate(n.callFrame)]))
  const self = new Map()
  const total = new Map()
  const inLong = new Map()
  let js = 0
  let program = 0
  let longTasks = 0
  let run = []
  const stackOf = id => {
    const seen = new Set()
    for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
      seen.addTo(key.get(cur))
    }
    return seen
  }
  const closeRun = () => {
    const ms = run.reduce((a, [, dt]) => a + dt, 0)
    if (ms > 50) {
      longTasks++
      for (const [id, dt] of run) {
        for (const k of stackOf(id)) {
          if (ours(k)) {
            addTo(inLong, k, dt)
          }
        }
      }
    }
    run = []
  }
  profile.samples.forEach((id, i) => {
    const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000
    const k = key.get(id)
    if (k === '(idle)') {
      closeRun()
      return
    }
    run.push([id, dt])
    if (k === '(program)') {
      program += dt
      return
    }
    js += dt
    addTo(self, k, dt)
    for (const ck of stackOf(id)) {
      addTo(total, ck, dt)
    }
  })
  closeRun()
  return {
    js,
    program,
    longTasks,
    self: byValueDescending(self).filter(([k]) => k !== '(root)'),
    total: byValueDescending(total).filter(([k]) => ours(k)),
    inLong: byValueDescending(inLong),
  }
}

const metricKeys = [
  'TaskDuration',
  'ScriptDuration',
  'LayoutDuration',
  'RecalcStyleDuration',
]

async function benchSize(browser, sizeName, rate) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })
  const cdp = await page.createCDPSession()
  await page.goto(`http://localhost:${PORT}/${sizes[sizeName]}`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  })
  const canvas = await page.waitForSelector('[data-testid="msa_canvas"]', {
    visible: true,
    timeout: 60000,
  })
  await delay(1500)
  const box = await canvas.boundingBox()
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + Math.min(box.height, 600) / 2)

  await page.evaluate(() => {
    window.benchFrames = []
    window.benchLongtasks = []
    window.benchRecording = false
    const loop = t => {
      if (window.benchRecording) {
        window.benchFrames.push(t)
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    new PerformanceObserver(list => {
      if (window.benchRecording) {
        for (const e of list.getEntries()) {
          window.benchLongtasks.push(e.duration)
        }
      }
    }).observe({ type: 'longtask' })
  })
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })

  const results = []
  const profiles = []
  for (const [name, gestures] of Object.entries(scenarios)) {
    await page.evaluate(() => {
      window.benchFrames = []
      window.benchLongtasks = []
      window.benchRecording = true
    })
    const before = Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map(m => [
        m.name,
        m.value,
      ]),
    )
    await cdp.send('Profiler.start')
    const t0 = performance.now()
    for (const g of gestures) {
      await runGesture(cdp, x, y, g)
      await delay(250)
    }
    const wall = performance.now() - t0
    const { profile } = await cdp.send('Profiler.stop')
    const after = Object.fromEntries(
      (await cdp.send('Performance.getMetrics')).metrics.map(m => [
        m.name,
        m.value,
      ]),
    )
    const { frames, longtasks, colWidth } = await page.evaluate(() => {
      window.benchRecording = false
      const f = window.benchFrames
      return {
        frames: f.slice(1).map((t, i) => t - f[i]),
        longtasks: window.benchLongtasks,
        colWidth: document.querySelector('[data-testid="msa_canvas"]')
          ?.offsetWidth,
      }
    })
    void colWidth
    const metrics = Object.fromEntries(
      metricKeys.map(k => [k, ((after[k] - before[k]) * 1000).toFixed(0)]),
    )
    results.push({
      scenario: name,
      wallMs: Math.round(wall),
      frames: frames.length,
      p50: pct(frames, 50).toFixed(1),
      p95: pct(frames, 95).toFixed(1),
      max: Math.max(0, ...frames).toFixed(1),
      over33: frames.filter(f => f > 33.4).length,
      over50: frames.filter(f => f > 50).length,
      longTasks: longtasks.length,
      longTaskMs: Math.round(longtasks.reduce((a, b) => a + b, 0)),
      ...metrics,
    })
    profiles.push(profile)
  }
  await page.close()
  return { results, profiles }
}

function mergeProfiles(summaries) {
  const merge = field => {
    const m = new Map()
    for (const s of summaries) {
      for (const [k, v] of s[field]) {
        m.set(k, (m.get(k) ?? 0) + v)
      }
    }
    return [...m.entries()].toSorted((a, b) => b[1] - a[1])
  }
  const sum = field => summaries.reduce((a, s) => a + s[field], 0)
  return {
    js: sum('js'),
    program: sum('program'),
    longTasks: sum('longTasks'),
    self: merge('self'),
    total: merge('total'),
    inLong: merge('inLong'),
  }
}

const server = await startStaticServer(PORT, dist)
const browser = await launch({
  executablePath: findChrome(),
  headless: true,
  args: [...BROWSER_ARGS, '--window-size=1400,900'],
})
const report = []
try {
  for (const rate of cpuRates) {
    for (const sizeName of sizeNames) {
      const { results, profiles } = await benchSize(browser, sizeName, rate)
      const prof = mergeProfiles(profiles.map(summarizeProfile))
      console.log(`\n### ${sizeName}, CPU ${rate}x`)
      console.table(results)
      const fmt = (rows, base) =>
        rows
          .slice(0, topN)
          .map(
            ([k, v]) =>
              `  ${v.toFixed(0).padStart(6)}ms ${((100 * v) / base).toFixed(1).padStart(5)}%  ${k}`,
          )
          .join('\n')
      console.log(
        `JS ${prof.js.toFixed(0)}ms, (program) ${prof.program.toFixed(0)}ms, ${prof.longTasks} busy runs >50ms`,
      )
      console.log('top self (% of JS):')
      console.log(fmt(prof.self, prof.js))
      console.log('our code, inclusive (% of JS):')
      console.log(fmt(prof.total, prof.js))
      const longMs = prof.inLong[0]?.[1] ?? 1
      console.log('our code inside busy runs >50ms (% of the outermost):')
      console.log(fmt(prof.inLong, longMs))
      report.push({
        size: sizeName,
        rate,
        results,
        js: prof.js,
        program: prof.program,
        self: prof.self.slice(0, 60),
        total: prof.total.slice(0, 60),
        inLong: prof.inLong.slice(0, 60),
      })
    }
  }
} finally {
  await browser.close()
  server.close()
}
if (outJson) {
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2))
}
