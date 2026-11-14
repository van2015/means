import { generateId } from './id'
import { validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import { buildRecipeFromDraft, unknownGoodLineErrors } from './draftLines'
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
    if (this.nameIsTaken(draft.name)) {
      errors.push({ code: 'RECIPE_NAME_EXISTS' })
    }

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = buildRecipeFromDraft(this.goodStore, generateId(), draft)
    this.recipes.push(recipe)
    return { ok: true, recipe }
  }

  update(id: string, draft: RecipeDraft): RecipeResult {
    const errors = this.validateDraft(draft)
    if (this.nameIsTaken(draft.name, id)) {
      errors.push({ code: 'RECIPE_NAME_EXISTS' })
    }

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const index = this.recipes.findIndex((recipe) => recipe.id === id)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = buildRecipeFromDraft(this.goodStore, id, draft)
    this.recipes[index] = recipe
    return { ok: true, recipe }
  }

  delete(id: string): void {
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id)
  }

  private validateDraft(draft: RecipeDraft): RecipeError[] {
    const errors = validateRecipe(draft.name, draft.inputs, draft.outputs)
    errors.push(...unknownGoodLineErrors(this.goodStore, [...draft.inputs, ...draft.outputs]))
    return errors
  }

  private nameIsTaken(name: string, excludeId?: string): boolean {
    return this.recipes.some((recipe) => recipe.name === name && recipe.id !== excludeId)
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
