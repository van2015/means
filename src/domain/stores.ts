import { AgentStore } from './agentStore'
import { GoodStore } from './goodStore'
import { RecipeStore } from './recipeStore'

export type Stores = {
  goodStore: GoodStore
  recipeStore: RecipeStore
  agentStore: AgentStore
}

export function createStores(): Stores {
  const goodStore = new GoodStore()
  const recipeStore = new RecipeStore(goodStore)
  const agentStore = new AgentStore(goodStore)
  return { goodStore, recipeStore, agentStore }
}
