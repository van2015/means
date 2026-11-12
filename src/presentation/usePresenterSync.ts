import { useEffect } from 'react'
import type { Stores } from '@/domain/stores'
import { saveWorld } from '@/persistence'
import type { Presenter } from './presenter'

/**
 * Single choke point that keeps the UI and localStorage in sync: every store
 * mutation flows through a presenter notification, so subscribing once here is
 * enough for both design and play mode. The `presenters` array must be stable
 * across renders (build it with useMemo/useState) or the effect re-subscribes.
 */
export function usePresenterSync(
  presenters: Presenter[],
  stores: Stores,
  onChange: () => void,
): void {
  useEffect(() => {
    const unsubscribes = presenters.map((presenter) =>
      presenter.subscribe(() => {
        onChange()
        saveWorld(stores)
      }),
    )
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [presenters, stores, onChange])
}
