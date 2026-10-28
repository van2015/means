import { generateId } from './id'
import { createRecipeEntity, validateRecipe } from './recipe'
import type { DraftLine, Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import type { GoodStore } from './goodStore'

export type FindRecipeResult =
  { ok: true; recipe: Recipe } | { ok: false; error: 'RECIPE_NOT_FOUND' }

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

  findByName(name: string): FindRecipeResult {
    const recipe = this.recipes.find((r) => r.name === name)
    if (recipe === undefined) {
      return { ok: false, error: 'RECIPE_NOT_FOUND' }
    }
    return { ok: true, recipe }
  }

  create(draft: RecipeDraft): RecipeResult {
    const errors = this.validateDraft(draft)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = this.buildRecipe(generateId(), draft)
    this.recipes.push(recipe)
    return { ok: true, recipe }
  }

  update(id: string, draft: RecipeDraft): RecipeResult {
    const errors = this.validateDraft(draft)

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

  private validateDraft(draft: RecipeDraft): RecipeError[] {
    const errors = validateRecipe(draft.inputs, draft.outputs)
    errors.push(...this.validateGoodsExist(draft.inputs))
    errors.push(...this.validateGoodsExist(draft.outputs))
    return errors
  }

  private validateGoodsExist(lines: DraftLine[]): RecipeError[] {
    const errors: RecipeError[] = []
    for (const line of lines) {
      const result = this.goodStore.require(line.goodName)
      if (!result.ok) {
        errors.push({ code: 'UNKNOWN_GOOD', goodName: line.goodName })
      }
    }
    return errors
  }

  private buildRecipe(id: string, draft: RecipeDraft): Recipe {
    return createRecipeEntity(
      id,
      draft.name,
      draft.inputs.map((line) => ({
        goodId: this.goodIdFor(line.goodName),
        quantity: line.quantity,
      })),
      draft.outputs.map((line) => ({
        goodId: this.goodIdFor(line.goodName),
        quantity: line.quantity,
      })),
    )
  }

  private goodIdFor(name: string): string {
    const result = this.goodStore.require(name)
    if (!result.ok) {
      throw new Error(`Unexpected missing good: ${name}`)
    }
    return result.good.id
  }
}

export type {
  DraftLine,
  Good,
  Recipe,
  RecipeDraft,
  RecipeError,
  RecipeLine,
  RecipeResult,
} from './recipe'
