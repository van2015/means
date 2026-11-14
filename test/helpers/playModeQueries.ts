import { fireEvent, screen } from '@testing-library/react'

export type PlayTab = 'Inventario' | 'Recetas' | 'Reglas' | 'Producir'

/**
 * The possessed agent panel shows one tab at a time, so every query looking
 * for its blocks must reveal the tab first. Tabs that are not rendered (no
 * possessed agent) are simply skipped.
 */
export function openPlayTab(label: PlayTab): void {
  const button = screen.queryByRole('tab', { name: new RegExp(`^${label}$`, 'i') })
  if (button === null || button.getAttribute('aria-selected') === 'true') return
  fireEvent.click(button)
}
