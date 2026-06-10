import React from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import AccountTree from '@mui/icons-material/AccountTree'
import { observer } from 'mobx-react'

import { treeSettingsMenuItems } from './settingsMenuItems.ts'

import type { MsaViewModel } from '../../model.ts'

const TreeSettingsMenu = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { rows } = model
  return (
    <CascadingMenuButton
      data-testid="tree_settings_menu"
      closeAfterItemClick={false}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      menuItems={[
        ...treeSettingsMenuItems(model),
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
