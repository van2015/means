import { createRecipeEntity, validateRecipe } from './recipe'
import type { DraftLine, Good, Recipe, RecipeResult } from './recipe'

class RecipeStore {
  private goods: Good[] = []
  private recipes: Recipe[] = []

  reset(): void {
    this.goods = []
    this.recipes = []
  }

  getGoods(): Good[] {
    return this.goods
  }

  getRecipes(): Recipe[] {
    return this.recipes
  }

  hasGoodNamed(name: string): boolean {
    return this.goods.some((g) => g.name === name)
  }

  findGoodIdByName(name: string): string | undefined {
    return this.goods.find((g) => g.name === name)?.id
  }

  createRecipe(
    name: string,
    inputs: DraftLine[],
    outputs: DraftLine[],
  ): RecipeResult {
    const errors = validateRecipe(inputs, outputs)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = createRecipeEntity(
      generateId(),
      name,
      inputs.map((line) => ({
        goodId: this.findOrCreateGood(line.goodName).id,
        quantity: line.quantity,
      })),
      outputs.map((line) => ({
        goodId: this.findOrCreateGood(line.goodName).id,
        quantity: line.quantity,
      })),
    )

    this.recipes.push(recipe)
    return { ok: true, recipe }
  }

  private findOrCreateGood(name: string): Good {
    const existing = this.goods.find((g) => g.name === name)
    if (existing) return existing
    const created: Good = { id: generateId(), name }
    this.goods.push(created)
    return created
  }
}

const store = new RecipeStore()

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export function resetStore(): void {
  store.reset()
}

export function getGoods(): Good[] {
  return store.getGoods()
}

export function getRecipes(): Recipe[] {
  return store.getRecipes()
}

export function hasGoodNamed(name: string): boolean {
  return store.hasGoodNamed(name)
}

export function findGoodIdByName(name: string): string | undefined {
  return store.findGoodIdByName(name)
}

export function createRecipe(
  name: string,
  inputs: DraftLine[],
  outputs: DraftLine[],
): RecipeResult {
  return store.createRecipe(name, inputs, outputs)
}

export type { DraftLine, Good, Recipe, RecipeError, RecipeLine, RecipeResult } from './recipe'
