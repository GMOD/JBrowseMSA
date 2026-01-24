import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import AccountTree from '@mui/icons-material/AccountTree'
import Palette from '@mui/icons-material/Palette'
import Settings from '@mui/icons-material/Settings'
import { observer } from 'mobx-react'

import colorSchemes from '../../colorSchemes.ts'

import type { MsaViewModel } from '../../model.ts'

const SettingsMenu = observer(function ({ model }: { model: MsaViewModel }) {
  const {
    colorSchemeName,
    drawMsaLetters,
    contrastLettering,
    hideGaps,
    bgColor,
    drawTree,
    showBranchLen,
    labelsAlignRight,
    drawNodeBubbles,
    drawLabels,
    treeWidthMatchesArea,
    noTree,
  } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick={false}
      menuItems={[
        {
          label: 'Color scheme',
          icon: Palette,
          type: 'subMenu',
          subMenu: Object.keys(colorSchemes).map(
            option =>
              ({
                label: option,
                type: 'radio',
                checked: colorSchemeName === option,
                onClick: () => {
                  model.setColorSchemeName(option)
                },
              }) as const,
          ),
        },
        {
          label: 'MSA settings',
          type: 'subMenu',
          subMenu: [
            {
              label: 'Draw letters',
              type: 'checkbox',
              checked: drawMsaLetters,
              onClick: () => {
                model.setDrawMsaLetters(!drawMsaLetters)
              },
            },
            {
              label: 'Color letters instead of background of tiles',
              type: 'checkbox',
              checked: !bgColor,
              onClick: () => {
                model.setBgColor(!bgColor)
              },
            },
            {
              label: 'Use contrast lettering',
              type: 'checkbox',
              checked: contrastLettering,
              onClick: () => {
                model.setContrastLettering(!contrastLettering)
              },
            },
            {
              label: 'Enable hiding gappy columns?',
              type: 'checkbox',
              checked: hideGaps,
              onClick: () => {
                model.setHideGaps(!hideGaps)
              },
            },
          ],
        },
        {
          label: 'Tree settings',
          type: 'subMenu',
          icon: AccountTree,
          subMenu: [
            {
              label: 'Show branch length',
              type: 'checkbox',
              checked: showBranchLen,
              onClick: () => {
                model.setShowBranchLen(!showBranchLen)
              },
            },
            {
              label: 'Show tree',
              type: 'checkbox',
              checked: drawTree,
              onClick: () => {
                model.setDrawTree(!drawTree)
              },
            },
            {
              label: 'Draw clickable bubbles on tree branches',
              type: 'checkbox',
              checked: drawNodeBubbles,
              onClick: () => {
                model.setDrawNodeBubbles(!drawNodeBubbles)
              },
            },
            {
              label: 'Tree labels align right',
              type: 'checkbox',
              checked: labelsAlignRight,
              onClick: () => {
                model.setLabelsAlignRight(!labelsAlignRight)
              },
            },
            {
              label: 'Draw labels',
              type: 'checkbox',
              checked: drawLabels,
              onClick: () => {
                model.setDrawLabels(!drawLabels)
              },
            },
            ...(noTree
              ? []
              : [
                  {
                    label: 'Make tree width fit to tree area',
                    type: 'checkbox' as const,
                    checked: treeWidthMatchesArea,
                    onClick: () => {
                      model.setTreeWidthMatchesArea(!treeWidthMatchesArea)
                    },
                  },
                ]),
          ],
        },
      ]}
    >
      <Settings />
    </CascadingMenuButton>
  )
})

export default SettingsMenu
