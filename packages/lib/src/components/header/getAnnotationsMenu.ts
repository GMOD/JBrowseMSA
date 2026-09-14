import { lazy } from 'react'

import FilterAlt from '@mui/icons-material/FilterAlt'
import FolderOpen from '@mui/icons-material/FolderOpen'
import MenuBook from '@mui/icons-material/MenuBook'
import Sort from '@mui/icons-material/Sort'
import Visibility from '@mui/icons-material/Visibility'

import type { MsaViewModel } from '../../model.ts'

const FeatureFilterDialog = lazy(() => import('../dialogs/FeatureDialog.tsx'))
const AnnotationFileDialog = lazy(
  () => import('../dialogs/AnnotationFileDialog.tsx'),
)

const domainsTutorial = 'https://gmod.org/JBrowseMSA/tutorials/protein_family'

export function getAnnotationsMenu({ model }: { model: MsaViewModel }) {
  const { showDomains, actuallyShowDomains, subFeatureRows, noDomains } = model
  const noneLoaded = noDomains ? ' (none loaded)' : ''
  return [
    {
      label: 'Open annotation file...',
      icon: FolderOpen,
      onClick: () => {
        model.queueDialog(handleClose => [
          AnnotationFileDialog,
          {
            handleClose,
            model,
          },
        ])
      },
    },
    // `react-msaview-cli interpro` reads InterPro's precomputed matches in
    // seconds, and `interproscan` covers rows InterPro has not seen; this links
    // the tutorial for both
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
