import { when } from 'mobx'

import { mount } from './mount.tsx'

import type { MSAViewerProps } from './components/MSAViewer.tsx'
import type { MsaViewModel } from './model.ts'
import type { MountedViewer } from './mount.tsx'
import type {
  Cell,
  ColumnTrackSpec,
  Highlight,
  ResidueMapping,
  Viewport,
} from './types.ts'

type ElementData = Pick<
  MSAViewerProps,
  'msa' | 'tree' | 'gff' | 'highlights' | 'columnTracks' | 'residueMappings'
>

interface NightingaleManager extends HTMLElement {
  register: (element: HTMLElement) => void
  unregister: (element: HTMLElement) => void
}

const ownAttributes = [
  'msa-url',
  'tree-url',
  'gff-url',
  'color-scheme',
  'height',
  'hide-header',
  'theme',
  'reference-row',
  'tree-area-width',
] as const

// the attributes a <nightingale-manager> writes on the elements it holds
const nightingaleAttributes = ['display-start', 'display-end', 'highlight']

function location(uri: string | null) {
  return uri ? { uri, locationType: 'UriLocation' as const } : undefined
}

function numberAttribute(value: string | null | undefined) {
  const n = value ? Number(value) : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

// Nightingale writes a highlight as "start:end,start:end", 1-based inclusive
function parseHighlight(value: string | null, row?: string): Highlight[] {
  return (value ?? '').split(',').flatMap(span => {
    const [start, end] = span.split(':').map(numberAttribute)
    return start === undefined ? [] : [{ row, start, end: end ?? start }]
  })
}

function residueAtColumn(model: MsaViewModel, row: string, column: number) {
  const visible = model.globalColToVisibleCol(column - 1)
  return visible === undefined
    ? undefined
    : model.visibleColToSeqPosOneBased(row, visible)
}

// the first and last residues of `row` inside the viewport's columns
function residueRange(model: MsaViewModel, row: string, viewport: Viewport) {
  let start: number | undefined
  let end: number | undefined
  for (let c = viewport.startColumn; c <= viewport.endColumn && !start; c++) {
    start = residueAtColumn(model, row, c)
  }
  for (let c = viewport.endColumn; c >= viewport.startColumn && !end; c--) {
    end = residueAtColumn(model, row, c)
  }
  return start && end ? { start, end } : undefined
}

/**
 * Registers a custom element that renders MSAViewer, for pages with no React.
 * Attributes: msa-url, tree-url, gff-url, color-scheme, height, hide-header,
 * theme, tree-area-width and reference-row. Properties: msa, tree and gff text, highlights,
 * columnTracks and residueMappings. Events: cell-hover, cell-click and
 * viewport-change, each with the MSAViewer callback's value as detail.
 *
 * Inside a <nightingale-manager>, the element registers with it and speaks its
 * protocol: it follows the display-start, display-end and highlight attributes
 * the manager writes, and reports its own range and hovered residue as change
 * events. Positions are residues of reference-row, or columns without one.
 */
export function defineMsaElement(tagName = 'jbrowse-msa') {
  const existing = customElements.get(tagName)
  if (existing) {
    return existing
  }

  class MsaElement extends HTMLElement {
    static observedAttributes = [...ownAttributes, ...nightingaleAttributes]

    #viewer?: MountedViewer
    #model?: MsaViewModel
    #manager?: NightingaleManager
    #cancelRange?: () => void
    #rangePending = false
    #data: ElementData = {}

    get msa() {
      return this.#data.msa
    }
    set msa(value: string | undefined) {
      this.#setData({ msa: value })
    }
    get tree() {
      return this.#data.tree
    }
    set tree(value: string | undefined) {
      this.#setData({ tree: value })
    }
    get gff() {
      return this.#data.gff
    }
    set gff(value: string | undefined) {
      this.#setData({ gff: value })
    }
    get highlights() {
      return this.#data.highlights
    }
    set highlights(value: Highlight[] | undefined) {
      this.#setData({ highlights: value })
    }
    get columnTracks() {
      return this.#data.columnTracks
    }
    set columnTracks(value: ColumnTrackSpec[] | undefined) {
      this.#setData({ columnTracks: value })
    }
    get residueMappings() {
      return this.#data.residueMappings
    }
    set residueMappings(value: ResidueMapping[] | undefined) {
      this.#setData({ residueMappings: value })
    }

    get #referenceRow() {
      return this.getAttribute('reference-row') ?? undefined
    }

    #setData(data: ElementData) {
      this.#data = { ...this.#data, ...data }
      this.#viewer?.update(this.#props())
    }

    #props(): MSAViewerProps {
      const theme = this.getAttribute('theme')
      return {
        ...this.#data,
        msaFilehandle: location(this.getAttribute('msa-url')),
        treeFilehandle: location(this.getAttribute('tree-url')),
        gffFilehandle: location(this.getAttribute('gff-url')),
        colorScheme: this.getAttribute('color-scheme') ?? undefined,
        height: numberAttribute(this.getAttribute('height')),
        treeAreaWidth: numberAttribute(this.getAttribute('tree-area-width')),
        hideHeader: this.hasAttribute('hide-header'),
        theme: theme === 'dark' ? 'dark' : 'light',
        onCellHover: cell => {
          this.#emit('cell-hover', cell)
          this.#reportHover(cell)
        },
        onCellClick: cell => {
          this.#emit('cell-click', cell)
        },
        onViewportChange: viewport => {
          this.#emit('viewport-change', viewport)
          this.#reportRange(viewport)
        },
        onModel: model => {
          this.#model = model
          this.#followRange()
          this.#followHighlight()
        },
      }
    }

    #emit(type: string, detail: unknown) {
      this.dispatchEvent(new CustomEvent(type, { detail }))
    }

    #nightingaleChange(detail: Record<string, unknown>) {
      if (this.#manager) {
        this.dispatchEvent(
          new CustomEvent('change', {
            detail,
            bubbles: true,
            cancelable: true,
          }),
        )
      }
    }

    #reportHover(cell: Cell | undefined) {
      const model = this.#model
      const row = this.#referenceRow
      const position =
        cell && model && row
          ? residueAtColumn(model, row, cell.column)
          : cell?.column
      this.#nightingaleChange({
        type: 'highlight',
        value: position === undefined ? null : `${position}:${position}`,
      })
    }

    #reportRange(viewport: Viewport | undefined) {
      const model = this.#model
      const row = this.#referenceRow
      if (!viewport || !model) {
        return
      }
      const range = row
        ? residueRange(model, row, viewport)
        : { start: viewport.startColumn, end: viewport.endColumn }
      const shownStart = numberAttribute(this.getAttribute('display-start'))
      const shownEnd = numberAttribute(this.getAttribute('display-end'))
      // a range the manager just wrote comes back within a column of itself,
      // since the viewer shows whole columns
      const echo =
        range &&
        shownStart !== undefined &&
        shownEnd !== undefined &&
        Math.abs(range.start - shownStart) <= 1 &&
        Math.abs(range.end - shownEnd) <= 1
      if (range && !echo) {
        this.#nightingaleChange({
          'display-start': range.start,
          'display-end': range.end,
        })
      }
    }

    #followRange() {
      const model = this.#model
      const start = numberAttribute(this.getAttribute('display-start'))
      const end = numberAttribute(this.getAttribute('display-end'))
      this.#cancelRange?.()
      if (model && start !== undefined && end !== undefined) {
        const row = this.#referenceRow
        this.#cancelRange = when(
          () => model.viewInitialized && model.numColumns > 0,
          () => {
            model.zoomToRegion({ row, start, end })
          },
        )
      }
    }

    #followHighlight() {
      const spans = parseHighlight(
        this.getAttribute('highlight'),
        this.#referenceRow,
      )
      if (spans.length) {
        this.#model?.applyHighlight('nightingale', spans)
      } else {
        this.#model?.clearHighlight('nightingale')
      }
    }

    connectedCallback() {
      if (!this.style.display) {
        this.style.display = 'block'
      }
      this.#viewer = mount(this, this.#props())
      const manager = this.closest<NightingaleManager>('nightingale-manager')
      if (manager) {
        void customElements.whenDefined('nightingale-manager').then(() => {
          if (this.isConnected) {
            this.#manager = manager
            manager.register(this)
          }
        })
      }
    }

    disconnectedCallback() {
      this.#manager?.unregister(this)
      this.#manager = undefined
      this.#cancelRange?.()
      this.#viewer?.destroy()
      this.#viewer = undefined
      this.#model = undefined
    }

    attributeChangedCallback(name: string) {
      if (name === 'display-start' || name === 'display-end') {
        // the manager writes the two attributes one after the other, and a
        // zoom between them reports a range that overwrites the second
        if (!this.#rangePending) {
          this.#rangePending = true
          queueMicrotask(() => {
            this.#rangePending = false
            this.#followRange()
          })
        }
      } else if (name === 'highlight') {
        this.#followHighlight()
      } else {
        this.#viewer?.update(this.#props())
      }
    }
  }

  customElements.define(tagName, MsaElement)
  return MsaElement
}
