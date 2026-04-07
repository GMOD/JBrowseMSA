import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import AccountTree from '@mui/icons-material/AccountTree'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const TreeSettingsMenu = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const {
    drawTree,
    showBranchLen,
    labelsAlignRight,
    drawNodeBubbles,
    drawLabels,
    rows,
  } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick={false}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={[
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
        ...(rows.length >= 2
          ? [
              {
                label: 'Advanced',
                type: 'subMenu' as const,
                subMenu: [
                  {
                    label: 'Calculate neighbor joining tree (BLOSUM62)',
                    onClick: () => {
                      try {
                        model.calculateNeighborJoiningTreeFromMSA()
                      } catch (e) {
                        console.error('Failed to calculate NJ tree:', e)
                        model.setError(e)
                      }
                    },
                  },
                ],
              },
            ]
          : []),
      ]}
    >
      <AccountTree />
    </CascadingMenuButton>
  )
})

export default TreeSettingsMenu
