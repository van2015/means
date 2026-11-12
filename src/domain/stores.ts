import { AgentStore } from './agentStore'
import { GoodStore } from './goodStore'
import { PossessionStore } from './possessionStore'
import { RecipeStore } from './recipeStore'

export type Stores = {
  goodStore: GoodStore
  recipeStore: RecipeStore
  agentStore: AgentStore
  possessionStore: PossessionStore
}

export function createStores(): Stores {
  const goodStore = new GoodStore()
  const recipeStore = new RecipeStore(goodStore)
  const agentStore = new AgentStore(goodStore, recipeStore)
  const possessionStore = new PossessionStore(agentStore)
  return { goodStore, recipeStore, agentStore, possessionStore }
}
