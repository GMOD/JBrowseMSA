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

// Every track the alignment can show, with its current state. Without this the
// "Close" item on a track's own dropdown is a one-way door -- there is nowhere
// else in the UI to turn a track back on.
function tracksSubMenu(model: MsaViewModel): MenuItem[] {
  const shown = new Set(model.turnedOnTracks.map(t => t.model.id))
  return model.tracks.map(({ model: { id, name } }) =>
    toggle(name, shown.has(id), () => {
      model.toggleTrack(id)
    }),
  )
}

export function msaSettingsMenuItems(model: MsaViewModel): MenuItem[] {
  const { drawMsaLetters, hideGaps, bgColor, showColumnStats } = model
  return [
    {
      label: 'Tracks',
      type: 'subMenu' as const,
      subMenu: tracksSubMenu(model),
    },
    { type: 'divider' as const },
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
    toggle('Draw bubbles on tree branches', drawNodeBubbles, arg => {
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
