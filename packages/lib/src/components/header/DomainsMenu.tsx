import { lazy } from 'react'

import FilterAlt from '@mui/icons-material/FilterAlt'
import FolderOpen from '@mui/icons-material/FolderOpen'
import Search from '@mui/icons-material/Search'
import Sort from '@mui/icons-material/Sort'
import Visibility from '@mui/icons-material/Visibility'

import type { MsaViewModel } from '../../model.ts'

const FeatureFilterDialog = lazy(() => import('../dialogs/FeatureDialog.tsx'))
const UserProvidedDomainsDialog = lazy(
  () => import('../dialogs/UserProvidedDomainsDialog.tsx'),
)
const InterProScanDialog = lazy(
  () => import('../dialogs/InterProScanDialog.tsx'),
)

export function getDomainMenu({ model }: { model: MsaViewModel }) {
  const { showDomains, actuallyShowDomains, subFeatureRows, noDomains } = model
  return [
    {
      label: 'Open domains...',
      icon: FolderOpen,
      onClick: () => {
        model.queueDialog(handleClose => [
          UserProvidedDomainsDialog,
          {
            handleClose,
            model,
          },
        ])
      },
    },
    {
      label: 'Query InterProScan for domains...',
      icon: Search,
      onClick: () => {
        model.queueDialog(handleClose => [
          InterProScanDialog,
          {
            handleClose,
            model,
          },
        ])
      },
    },
    {
      label: `Show domains${noDomains ? ' (no domains loaded)' : ''}`,
      disabled: noDomains,
      icon: Visibility,
      checked: actuallyShowDomains ? showDomains : false,
      type: 'checkbox' as const,
      onClick: () => {
        model.setShowDomains(!showDomains)
      },
    },
    {
      label: `Use sub-row layout${noDomains ? ' (no domains loaded)' : ''}`,
      disabled: noDomains,
      checked: actuallyShowDomains ? subFeatureRows : false,
      icon: Sort,
      type: 'checkbox' as const,
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
          {
            onClose,
            model,
          },
        ])
      },
    },
  ]
}
