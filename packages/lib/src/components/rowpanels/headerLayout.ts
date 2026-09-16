import { rowPanelHeaderHeight } from '../../constants.ts'

export function headerRunsAcross(panelWidth: number) {
  return panelWidth > rowPanelHeaderHeight
}
