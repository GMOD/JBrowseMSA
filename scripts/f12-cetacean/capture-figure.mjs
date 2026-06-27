// Re-render the F12 combined figure with red boxes drawn on the *native*
// highlights using exact geometry read from the live model/DOM (not hardcoded).
//
// The red boxes are positioned from real coordinates so they can't drift:
//   - MSA gap column: #mouseover canvas rect + model colWidth/scrollX
//   - cetacean rows:  the first N rows in tree order (model.rows)
//   - LGV deletion:   the native HighlightBand div's bounding rect
//
// Requires a running jbrowse-web dev server on localhost:3000 built from the
// webgl-poc branch (with the LaunchView-LinearGenomeView id-forwarding change),
// and puppeteer. Run from a dir that resolves puppeteer, e.g.:
//   cd ~/src/jbrowse-components/products/jbrowse-web && node <this>   # SETTLE=ms
// Output: /tmp/f12-new.png  ->  copy to docs/media/f12-combined-view.png
import puppeteer from 'puppeteer'

const COMBINED =
  'http://localhost:3000/?config=https%3A%2F%2Fgmod.org%2FJBrowseMSA%2Fdemo%2Fdata%2Fjbrowse-msa-combined-config.json&session=spec-%7B%22views%22%3A%5B%7B%22type%22%3A%22LinearGenomeView%22%2C%22assembly%22%3A%22hg38%22%2C%22loc%22%3A%22chr5%3A177%2C405%2C935-177%2C406%2C012%22%2C%22highlight%22%3A%5B%22chr5%3A177%2C405%2C970-177%2C405%2C973%22%5D%2C%22tracks%22%3A%5B%22hg38-ncbiRefSeq%22%2C%7B%22trackId%22%3A%22hg38-multiz470way%22%2C%22displaySnapshot%22%3A%7B%22type%22%3A%22LinearMafDisplay%22%2C%22rowHeight%22%3A22%7D%7D%5D%7D%2C%7B%22type%22%3A%22MsaView%22%2C%22msaFileLocation%22%3A%7B%22uri%22%3A%22https%3A%2F%2Fgmod.org%2FJBrowseMSA%2Fdemo%2Fdata%2Ff12-cetacean-region.stock%22%7D%2C%22colorSchemeName%22%3A%22percent_identity_dynamic%22%2C%22treeAreaWidth%22%3A200%2C%22colWidth%22%3A15%2C%22rowHeight%22%3A16%2C%22labelsAlignRight%22%3Atrue%7D%5D%7D'

const GAP_COL = 40
const N_CETACEANS = 4

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--enable-unsafe-swiftshader',
  ],
  defaultViewport: { width: 1600, height: 1135, deviceScaleFactor: 2 },
})
const page = await browser.newPage()
page.on('pageerror', e => console.log('  [pageerror]', e.message))
await page.goto(COMBINED, { waitUntil: 'networkidle2', timeout: 120000 })

for (let i = 0; i < 20; i++) {
  const c = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x =>
      /trust/i.test(x.textContent || ''),
    )
    if (b) {
      b.click()
      return true
    }
    return false
  })
  if (c) {
    console.log('clicked trust')
    break
  }
  await new Promise(r => setTimeout(r, 1000))
}

// settle the MAF (slow remote) + set the MSA highlight
const SETTLE = +(process.env.SETTLE ?? 75000)
console.log(`settling ${SETTLE}ms...`)
await new Promise(r => setTimeout(r, SETTLE))

const geom = await page.evaluate(
  ({ GAP_COL, N_CETACEANS }) => {
    const root = window.JBrowseRootModel
    const msa = root.session.views.find(v => v.type === 'MsaView')
    const canvas = document.querySelector('#mouseover')
    const cRect = canvas.getBoundingClientRect()
    const { colWidth, rowHeight, scrollX, scrollY } = msa
    // MSA gap column at the cetacean rows (rows 0..N-1, tree order top->bottom)
    const colLeft = cRect.left + GAP_COL * colWidth + scrollX
    const rowsTop = cRect.top + 0 * rowHeight + scrollY
    const msaBox = {
      left: colLeft,
      top: rowsTop,
      width: colWidth,
      height: N_CETACEANS * rowHeight,
    }
    // column marker spanning exactly the alignment rows (not the empty area)
    const colFull = {
      left: colLeft,
      top: cRect.top + scrollY,
      width: colWidth,
      height: msa.rows.length * rowHeight,
    }

    // LGV native highlight band: absolute div with inline translateX transform
    // and a colored background (HighlightBand.tsx)
    const cands = [...document.querySelectorAll('div')]
      .filter(
        d =>
          d.style.transform &&
          d.style.transform.includes('translateX') &&
          d.style.background &&
          d.offsetWidth > 4 &&
          d.offsetWidth < 400,
      )
      .map(d => {
        const r = d.getBoundingClientRect()
        return {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          bg: d.style.background,
          transform: d.style.transform,
        }
      })
    // tallest band that spans the gene/MAF tracks (skip the overview cytoband)
    cands.sort((a, b) => b.height - a.height)
    const lgvBox = cands[0]

    return {
      cRect: {
        left: cRect.left,
        top: cRect.top,
        width: cRect.width,
        height: cRect.height,
      },
      model: { colWidth, rowHeight, scrollX, scrollY },
      rows: msa.rows.slice(0, N_CETACEANS).map(r => r[0]),
      msaBox,
      colFull,
      lgvBox,
      lgvCandidates: cands.slice(0, 5),
    }
  },
  { GAP_COL, N_CETACEANS },
)

console.log('GEOMETRY:', JSON.stringify(geom, null, 2))

// draw the annotation overlay using the computed geometry
await page.evaluate(g => {
  const { msaBox, colFull, lgvBox, cRect, model } = g
  const RED = '#d32f2f'
  const add = (style, html = '') => {
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;z-index:99999;pointer-events:none;' + style
    el.innerHTML = html
    document.body.appendChild(el)
    return el
  }

  // "Screenshot" banner, top-left
  add(
    `left:0;top:0;background:${RED};color:#fff;font:700 18px/1 Helvetica,Arial,sans-serif;` +
      `padding:8px 14px;border-bottom-right-radius:6px;letter-spacing:.5px;`,
    'Screenshot',
  )

  // cetacean-rows box (which rows to read) — across the alignment
  const alignW = Math.min(cRect.width, 78 * model.colWidth)
  add(
    `left:${cRect.left}px;top:${msaBox.top}px;width:${alignW}px;height:${msaBox.height}px;` +
      `border:2px dashed ${RED};box-sizing:border-box;`,
  )
  // cetacean-rows label
  add(
    `left:${cRect.left + alignW + 8}px;top:${msaBox.top + msaBox.height / 2 - 11}px;` +
      `color:${RED};font:700 15px Helvetica,Arial,sans-serif;white-space:nowrap;`,
    '← 4 cetaceans',
  )

  // the shared gap column, full alignment height
  add(
    `left:${colFull.left}px;top:${colFull.top}px;width:${colFull.width}px;height:${colFull.height}px;` +
      `border:3px solid ${RED};box-sizing:border-box;`,
  )

  // LGV native highlight box (the deletion site) + connector to the MSA column
  if (lgvBox) {
    add(
      `left:${lgvBox.left}px;top:${lgvBox.top}px;width:${lgvBox.width}px;height:${lgvBox.height}px;` +
        `border:3px solid ${RED};box-sizing:border-box;`,
    )
    // connector from LGV box bottom-center to MSA column top-center
    const x1 = lgvBox.left + lgvBox.width / 2
    const y1 = lgvBox.top + lgvBox.height
    const x2 = colFull.left + colFull.width / 2
    const y2 = colFull.top
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI
    add(
      `left:${x1}px;top:${y1}px;width:${len}px;height:0;border-top:2px dashed ${RED};` +
        `transform-origin:0 0;transform:rotate(${ang}deg);`,
    )
    // label near the connector midpoint
    add(
      `left:${(x1 + x2) / 2 + 12}px;top:${(y1 + y2) / 2 - 28}px;background:#fff;` +
        `border:1px solid ${RED};border-radius:4px;padding:4px 8px;` +
        `color:${RED};font:700 14px/1.3 Helvetica,Arial,sans-serif;white-space:nowrap;`,
      'shared cetacean frameshift<br><span style="font-weight:400">1-bp deletion · chr5:177,405,971</span>',
    )
  }
}, geom)

await new Promise(r => setTimeout(r, 500))
await page.screenshot({ path: '/tmp/f12-new.png' })
console.log(
  'screenshot -> /tmp/f12-new.png  (lgvBox found:',
  !!geom.lgvBox,
  ')',
)

await browser.close()
