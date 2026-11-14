import { AgentStore } from './agentStore'
import { GoodStore } from './goodStore'
import { PossessionStore } from './possessionStore'
import { RecipeStore } from './recipeStore'
import { StrategyStore } from './strategyStore'

export type Stores = {
  goodStore: GoodStore
  recipeStore: RecipeStore
  agentStore: AgentStore
  possessionStore: PossessionStore
  strategyStore: StrategyStore
}

/**
 * The three catalogs the world import/export touches. The session-only stores
 * (possession, strategy) are deliberately left out of that contract.
 */
export type WorldStores = Pick<Stores, 'goodStore' | 'recipeStore' | 'agentStore'>

export function createStores(): Stores {
  const goodStore = new GoodStore()
  const recipeStore = new RecipeStore(goodStore)
  const agentStore = new AgentStore(goodStore, recipeStore)
  const possessionStore = new PossessionStore(agentStore)
  const strategyStore = new StrategyStore()
  return { goodStore, recipeStore, agentStore, possessionStore, strategyStore }
}
