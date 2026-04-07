import React, { lazy } from 'react'

import CascadingMenuButton from '@jbrowse/core/ui/CascadingMenuButton'
import FilterAlt from '@mui/icons-material/FilterAlt'
import FolderOpen from '@mui/icons-material/FolderOpen'
import Search from '@mui/icons-material/Search'
import Sort from '@mui/icons-material/Sort'
import Visibility from '@mui/icons-material/Visibility'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const FeatureFilterDialog = lazy(() => import('../dialogs/FeatureDialog.tsx'))
const UserProvidedDomainsDialog = lazy(
  () => import('../dialogs/UserProvidedDomainsDialog.tsx'),
)
const InterProScanDialog = lazy(
  () => import('../dialogs/InterProScanDialog.tsx'),
)

const DomainsMenu = observer(({ model }: { model: MsaViewModel }) => {
  const { showDomains, actuallyShowDomains, subFeatureRows, noDomains } = model
  return (
    <CascadingMenuButton
      closeAfterItemClick={false}
      menuItems={[
        {
          label: 'Open domains...',
          icon: FolderOpen,
          onClick: () => {
            model.queueDialog(handleClose => [
              UserProvidedDomainsDialog,
              { handleClose, model },
            ])
          },
        },
        {
          label: 'Query InterProScan for domains...',
          icon: Search,
          onClick: () => {
            model.queueDialog(handleClose => [
              InterProScanDialog,
              { handleClose, model },
            ])
          },
        },
        {
          label: `Show domains${noDomains ? ' (no domains loaded)' : ''}`,
          disabled: noDomains,
          icon: Visibility,
          checked: actuallyShowDomains ? showDomains : false,
          type: 'checkbox',
          onClick: () => {
            model.setShowDomains(!showDomains)
          },
        },
        {
          label: `Use sub-row layout${noDomains ? ' (no domains loaded)' : ''}`,
          disabled: noDomains,
          checked: actuallyShowDomains ? subFeatureRows : false,
          icon: Sort,
          type: 'checkbox',
          onClick: () => {
            model.setSubFeatureRows(!subFeatureRows)
          },
        },
        {
          label: `Filter domains${noDomains ? ' (no domains loaded)' : ''}`,
          icon: FilterAlt,
          disabled: noDomains,
          onClick: () => {
            model.queueDialog(onClose => [
              FeatureFilterDialog,
              { onClose, model },
            ])
          },
        },
      ]}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Visibility />
    </CascadingMenuButton>
  )
})

export default DomainsMenu
