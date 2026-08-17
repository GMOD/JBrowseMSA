import type { MsaViewModel } from '../../model.ts'
import type { MenuItem } from '@jbrowse/core/ui/Menu'

function toggle(label: string, checked: boolean, set: (arg: boolean) => void) {
  return {
    label,
    type: 'checkbox' as const,
    checked,
    onClick: () => {
      set(!checked)
    },
  }
}

export function msaSettingsMenuItems(model: MsaViewModel): MenuItem[] {
  const { drawMsaLetters, hideGaps, bgColor, showColumnStats } = model
  return [
    toggle('Show column statistics on hover', showColumnStats, arg => {
      model.setShowColumnStats(arg)
    }),
    toggle('Draw letters', drawMsaLetters, arg => {
      model.setDrawMsaLetters(arg)
    }),
    // the checkbox reads as the inverse of the property it sets: bgColor draws
    // the tile, and turning it off is what leaves the letter itself colored
    toggle('Color letters instead of background of tiles', !bgColor, arg => {
      model.setBgColor(!arg)
    }),
    toggle('Enable hiding gappy columns?', hideGaps, arg => {
      model.setHideGaps(arg)
    }),
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
    toggle('Show branch length', showBranchLen, arg => {
      model.setShowBranchLen(arg)
    }),
    toggle('Show tree', drawTree, arg => {
      model.setDrawTree(arg)
    }),
    toggle('Draw clickable bubbles on tree branches', drawNodeBubbles, arg => {
      model.setDrawNodeBubbles(arg)
    }),
    toggle('Tree labels align right', labelsAlignRight, arg => {
      model.setLabelsAlignRight(arg)
    }),
    toggle('Draw labels', drawLabels, arg => {
      model.setDrawLabels(arg)
    }),
  ]
}
