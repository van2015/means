import { createRecipeEntity, validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeResult } from './recipe'
import type { GoodStore } from './goodStore'
import { goodStore } from './goodStore'

export class RecipeStore {
  private recipes: Recipe[] = []
  private goodStore: GoodStore

  constructor(goodStore: GoodStore) {
    this.goodStore = goodStore
  }

  reset(): void {
    this.recipes = []
  }

  all(): Recipe[] {
    return this.recipes
  }

  count(): number {
    return this.recipes.length
  }

  findByName(name: string): Recipe | undefined {
    return this.recipes.find((r) => r.name === name)
  }

  create(draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = this.buildRecipe(generateId(), draft)
    this.recipes.push(recipe)
    return { ok: true, recipe }
  }

  update(id: string, draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const index = this.recipes.findIndex((recipe) => recipe.id === id)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = this.buildRecipe(id, draft)
    this.recipes[index] = recipe
    return { ok: true, recipe }
  }

  delete(id: string): void {
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id)
  }

  private buildRecipe(id: string, draft: RecipeDraft): Recipe {
    return createRecipeEntity(
      id,
      draft.name,
      draft.inputs.map((line) => ({
        goodId: this.goodStore.resolve(line.goodName).id,
        quantity: line.quantity,
      })),
      draft.outputs.map((line) => ({
        goodId: this.goodStore.resolve(line.goodName).id,
        quantity: line.quantity,
      })),
    )
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const recipeStore = new RecipeStore(goodStore)

export type { DraftLine, Good, Recipe, RecipeDraft, RecipeError, RecipeLine, RecipeResult } from './recipe'
