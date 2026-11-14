import { Agent } from './agent'
import type { InventoryLine, ProductionError, ProductionResult, RuleRecipeRef } from './agent'
import type { Recipe } from './recipe'
import type { GoodStore } from './goodStore'
import type { RecipeStore } from './recipeStore'
import { resolveRecipe } from './recipeRef'

/**
 * Runs a recipe on an agent: resolves it, checks every input and returns the
 * agent as it would be afterwards. Committing the result is the store's job.
 */
export class ProductionEngine {
  private goodStore: GoodStore
  private recipeStore: RecipeStore

  constructor(goodStore: GoodStore, recipeStore: RecipeStore) {
    this.goodStore = goodStore
    this.recipeStore = recipeStore
  }

  run(agent: Agent, recipeRef: RuleRecipeRef): ProductionResult {
    const recipe = resolveRecipe(agent, recipeRef, this.recipeStore)
    if (!recipe) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const insufficient = this.insufficientInput(agent, recipe)
    if (insufficient) return { ok: false, errors: [insufficient] }

    const updated = new Agent(
      agent.id,
      agent.name,
      this.composeInventory(agent, recipe),
      agent.recipes,
      agent.rules,
      agent.recipesPerAction,
    )
    return { ok: true, agent: updated }
  }

  /** Checks every input before the inventory is touched. */
  private insufficientInput(agent: Agent, recipe: Recipe): ProductionError | null {
    for (const line of recipe.inputs) {
      const available = agent.quantityOf(line.goodId)
      if (available < line.quantity) {
        const good = this.goodStore.get(line.goodId)
        return {
          code: 'INSUFFICIENT_GOOD',
          goodName: good.ok ? good.good.name : '',
          required: line.quantity,
          available,
        }
      }
    }
    return null
  }

  /** Applies the recipe: consumes inputs, adds outputs, drops emptied goods. */
  private composeInventory(agent: Agent, recipe: Recipe): InventoryLine[] {
    const quantities = new Map<string, number>()
    const bump = (goodId: string, delta: number) =>
      quantities.set(goodId, (quantities.get(goodId) ?? 0) + delta)

    for (const line of agent.inventory) bump(line.goodId, line.quantity)
    for (const line of recipe.inputs) bump(line.goodId, -line.quantity)
    for (const line of recipe.outputs) bump(line.goodId, line.quantity)

    // keep the first-appearance order of existing goods, then append new ones
    const order: string[] = []
    for (const line of agent.inventory) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }
    for (const line of recipe.outputs) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }

    return order
      .map((goodId) => ({ goodId, quantity: quantities.get(goodId) ?? 0 }))
      .filter((line) => line.quantity > 0)
  }
}
