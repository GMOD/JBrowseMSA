import type { MsaViewModel } from '../../model.ts'
import type { MenuItem } from '@jbrowse/core/ui/Menu'

export function msaSettingsMenuItems(model: MsaViewModel): MenuItem[] {
  const { drawMsaLetters, hideGaps, bgColor } = model
  return [
    {
      label: 'Draw letters',
      type: 'checkbox',
      checked: drawMsaLetters,
      onClick: () => { model.setDrawMsaLetters(!drawMsaLetters) },
    },
    {
      label: 'Color letters instead of background of tiles',
      type: 'checkbox',
      checked: !bgColor,
      onClick: () => { model.setBgColor(!bgColor) },
    },
    {
      label: 'Enable hiding gappy columns?',
      type: 'checkbox',
      checked: hideGaps,
      onClick: () => { model.setHideGaps(!hideGaps) },
    },
  ]
}

export function treeSettingsMenuItems(model: MsaViewModel): MenuItem[] {
  const {
    drawTree,
    showBranchLen,
    labelsAlignRight,
    drawNodeBubbles,
    drawLabels,
  } = model
  return [
    {
      label: 'Show branch length',
      type: 'checkbox',
      checked: showBranchLen,
      onClick: () => { model.setShowBranchLen(!showBranchLen) },
    },
    {
      label: 'Show tree',
      type: 'checkbox',
      checked: drawTree,
      onClick: () => { model.setDrawTree(!drawTree) },
    },
    {
      label: 'Draw clickable bubbles on tree branches',
      type: 'checkbox',
      checked: drawNodeBubbles,
      onClick: () => { model.setDrawNodeBubbles(!drawNodeBubbles) },
    },
    {
      label: 'Tree labels align right',
      type: 'checkbox',
      checked: labelsAlignRight,
      onClick: () => { model.setLabelsAlignRight(!labelsAlignRight) },
    },
    {
      label: 'Draw labels',
      type: 'checkbox',
      checked: drawLabels,
      onClick: () => { model.setDrawLabels(!drawLabels) },
    },
  ]
}
