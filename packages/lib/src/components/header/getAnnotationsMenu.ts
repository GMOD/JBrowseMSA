import { lazy } from 'react'

import FilterAlt from '@mui/icons-material/FilterAlt'
import FolderOpen from '@mui/icons-material/FolderOpen'
import MenuBook from '@mui/icons-material/MenuBook'
import Sort from '@mui/icons-material/Sort'
import Visibility from '@mui/icons-material/Visibility'

import type { MsaViewModel } from '../../model.ts'

const FeatureFilterDialog = lazy(() => import('../dialogs/FeatureDialog.tsx'))
const InterProScanFileDialog = lazy(
  () => import('../dialogs/InterProScanFileDialog.tsx'),
)

const domainsTutorial = 'https://gmod.org/JBrowseMSA/tutorials/protein_family'

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
    // The viewer used to submit the whole alignment to the EBI iprscan5 queue
    // and poll it for about fifteen minutes, capped at 140 rows and under a
    // hardcoded email address. `react-msaview-cli interpro` answers the same
    // question from InterPro's precomputed matches in seconds, and
    // `interproscan` covers rows InterPro has not seen. Neither belongs in a
    // browser tab, so this points at the page that walks through them.
    {
      label: 'How to get a domain file...',
      icon: MenuBook,
      onClick: () => {
        window.open(domainsTutorial, '_blank', 'noopener,noreferrer')
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
