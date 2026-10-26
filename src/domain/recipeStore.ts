import { createRecipeEntity, validateRecipe } from './recipe'
import type { Good, Recipe, RecipeDraft, RecipeResult } from './recipe'

export class RecipeStore {
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

  recipeCount(): number {
    return this.recipes.length
  }

  hasGoodNamed(name: string): boolean {
    return this.goods.some((g) => g.name === name)
  }

  findGoodIdByName(name: string): string | undefined {
    return this.goods.find((g) => g.name === name)?.id
  }

  getGood(id: string): Good | undefined {
    return this.goods.find((g) => g.id === id)
  }

  findRecipeByName(name: string): Recipe | undefined {
    return this.recipes.find((r) => r.name === name)
  }

  createRecipe(draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = createRecipeEntity(
      generateId(),
      draft.name,
      draft.inputs.map((line) => ({
        goodId: this.findOrCreateGood(line.goodName).id,
        quantity: line.quantity,
      })),
      draft.outputs.map((line) => ({
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

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const recipeStore = new RecipeStore()

export type { DraftLine, Good, Recipe, RecipeDraft, RecipeError, RecipeLine, RecipeResult } from './recipe'
