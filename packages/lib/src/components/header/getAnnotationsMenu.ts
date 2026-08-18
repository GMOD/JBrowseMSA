import { lazy } from 'react'

import FilterAlt from '@mui/icons-material/FilterAlt'
import FolderOpen from '@mui/icons-material/FolderOpen'
import Search from '@mui/icons-material/Search'
import Sort from '@mui/icons-material/Sort'
import Visibility from '@mui/icons-material/Visibility'

import type { MsaViewModel } from '../../model.ts'

const FeatureFilterDialog = lazy(() => import('../dialogs/FeatureDialog.tsx'))
const InterProScanFileDialog = lazy(
  () => import('../dialogs/InterProScanFileDialog.tsx'),
)
const InterProScanDialog = lazy(
  () => import('../dialogs/InterProScanDialog.tsx'),
)

export function getAnnotationsMenu({ model }: { model: MsaViewModel }) {
  const { showDomains, actuallyShowDomains, subFeatureRows, noDomains } = model
  const noneLoaded = noDomains ? ' (none loaded)' : ''
  return [
    {
      label: 'Open InterProScan results...',
      icon: FolderOpen,
      onClick: () => {
        model.queueDialog(handleClose => [
          InterProScanFileDialog,
          {
            handleClose,
            model,
          },
        ])
      },
    },
    {
      label: 'Query InterProScan...',
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
      label: `Show annotations${noneLoaded}`,
      disabled: noDomains,
      icon: Visibility,
      checked: actuallyShowDomains,
      type: 'checkbox' as const,
      onClick: () => {
        model.setShowDomains(!showDomains)
      },
    },
    {
      label: `Use sub-row layout${noneLoaded}`,
      disabled: noDomains,
      checked: actuallyShowDomains ? subFeatureRows : false,
      icon: Sort,
      type: 'checkbox' as const,
      onClick: () => {
        model.setSubFeatureRows(!subFeatureRows)
      },
    },
    {
      label: `Filter annotations${noneLoaded}`,
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
