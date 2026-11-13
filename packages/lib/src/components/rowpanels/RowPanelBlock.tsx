import React from 'react'

import BaseTooltip from '@jbrowse/core/ui/BaseTooltip'
import { observer } from 'mobx-react'

import { useCanvasTheme } from '../../darkReader.ts'
import { featureField, featureName } from '../../featureFields.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import SpanTint from '../msa/SpanTint.tsx'
import { useHoverAnchor } from '../useHoverAnchor.ts'
import { featurePanelSource } from './renderFeaturePanel.ts'
import { renderRowPanel } from './renderRowPanel.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { MsaViewModel } from '../../model.ts'
import type {
  ResolvedFeaturePanel,
  ResolvedRowPanel,
  RowPanelSpan,
} from '../../types.ts'

// what the cell, mark or span under the pointer reads: the field a strip
// colors by; the field a bar, point or text panel draws and the one it colors
// by; and a span's name, its coordinates and its encoded field. A cell or mark
// whose color value a legend click hid reads nothing.
function hoverLines({
  model,
  panel,
  name,
  x,
}: {
  model: MsaViewModel
  panel: ResolvedRowPanel
  name: string
  x: number
}) {
  const row = model.rowDataOf(name)
  const value = (field: string) => row?.[field]
  const hidden =
    panel.kind === 'strip'
      ? rowValueHidden(model, panel.field, value(panel.field))
      : panel.kind !== 'features' && panel.hiddenRows.has(name)
  return panel.kind === 'features'
    ? spanLines(panel, spanAt(panel, name, x))
    : hidden
      ? []
      : [
          `${panel.header}: ${value(panel.field) ?? '(none)'}`,
          ...(panel.kind !== 'strip' &&
          panel.colorField !== undefined &&
          panel.colorField !== panel.field
            ? [`${panel.colorField}: ${value(panel.colorField) ?? '(none)'}`]
            : []),
        ]
}

function rowValueHidden(
  model: MsaViewModel,
  field: string,
  value: string | undefined,
) {
  return (
    value !== undefined &&
    !!model.activeHiddenCategories.get('rows')?.get(field)?.has(value)
  )
}

function spanAt(panel: ResolvedFeaturePanel, name: string, x: number) {
  return panel.spans.get(name)?.findLast(s => x >= s.xStart && x <= s.xEnd)
}

function spanLines(panel: ResolvedFeaturePanel, span?: RowPanelSpan) {
  if (!span) {
    return []
  }
  const { annotation } = span
  const strand =
    annotation.strand === undefined
      ? ''
      : annotation.strand < 0
        ? ' (-)'
        : ' (+)'
  const value = panel.field ? featureField(annotation, panel.field) : undefined
  return [
    featureName(annotation) ?? annotation.accession,
    `${annotation.start}-${annotation.end}${strand}`,
    ...(value === undefined ? [] : [`${panel.field}: ${value}`]),
  ]
}

const RowPanelBlock = observer(function ({
  model,
  panel,
  offsetY,
}: {
  model: MsaViewModel
  panel: ResolvedRowPanel
  offsetY: number
}) {
  const { anchor, hoverAt, clearAnchor } = useHoverAnchor<{
    name: string
    lines: string[]
    leaf: HierarchyNode
    span?: RowPanelSpan
  }>()
  const theme = useCanvasTheme()
  const { blockSize, highResScaleFactor, rowHeight } = model
  const width = panel.width
  const height = blockSize
  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor

  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      renderRowPanel({ ctx, model, theme, panel, offsetY })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, theme, panel, offsetY],
  })

  return (
    <>
      <canvas
        ref={ref}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: offsetY, left: 0, width, height }}
        onMouseMove={event => {
          // the blocks are laid out in row space and scrolled by a transform
          // on their container, so the pointer's row comes off the canvas box
          const { left, top } = event.currentTarget.getBoundingClientRect()
          const row = Math.floor((event.clientY - top + offsetY) / rowHeight)
          const leaf = model.leaves[row]
          const name = leaf?.data.name
          const x = event.clientX - left
          const lines =
            name === undefined ? [] : hoverLines({ model, panel, name, x })
          hoverAt(
            event,
            leaf === undefined || name === undefined || lines.length === 0
              ? undefined
              : {
                  name,
                  lines,
                  leaf,
                  span:
                    panel.kind === 'features'
                      ? spanAt(panel, name, x)
                      : undefined,
                },
          )
          model.setMousePos(undefined, name === undefined ? undefined : row)
        }}
        onMouseLeave={() => {
          clearAnchor()
          model.setMousePos(undefined, undefined)
        }}
      />
      {anchor?.value.span && panel.kind === 'features' ? (
        <SpanTint
          source={featurePanelSource(model, panel, [anchor.value.leaf])}
          annotations={[anchor.value.span.annotation]}
          width={width}
          height={height}
          top={offsetY}
          transform={`translate(0 ${rowHeight / 2 - offsetY})`}
        />
      ) : null}
      {anchor ? (
        <BaseTooltip clientPoint={anchor.clientPoint}>
          <div>{anchor.value.name}</div>
          {anchor.value.lines.map(line => (
            <div key={line}>{line}</div>
          ))}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default RowPanelBlock
