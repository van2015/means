import type { Stores } from '@/domain/stores'
import { buildExport, importWorld, serializeExport } from '@/domain/worldTransfer'

export const WORLD_STORAGE_KEY = 'means.world'

/**
 * Serialize the whole world and persist it. Best-effort: storage may be
 * unavailable (private mode) or full, and persistence must never break the app.
 * Writes are skipped when the stored payload is already up to date, so
 * frequent presenter notifications (form keystrokes) stay cheap.
 */
export function saveWorld(stores: Stores): void {
  try {
    const json = serializeExport(
      buildExport(stores, {
        goodIds: stores.goodStore.all().map((good) => good.id),
        recipeIds: stores.recipeStore.all().map((recipe) => recipe.id),
        agentIds: stores.agentStore.all().map((agent) => agent.id),
      }),
    )
    if (localStorage.getItem(WORLD_STORAGE_KEY) !== json) {
      localStorage.setItem(WORLD_STORAGE_KEY, json)
    }
  } catch {
    // ignore: losing persistence is better than breaking the session
  }
}

/**
 * Restore a previously saved world into the given (preferably empty) stores.
 * Returns true when a valid world was loaded. Corrupt or unsupported payloads
 * leave the stores untouched.
 */
export function loadWorld(stores: Stores): boolean {
  try {
    const json = localStorage.getItem(WORLD_STORAGE_KEY)
    if (json === null) return false
    return importWorld(stores, json).ok
  } catch {
    return false
  }
}
