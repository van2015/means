import { createRecipeEntity, validateRecipe } from './recipe'
import type { Good, Recipe, RecipeDraft, RecipeResult } from './recipe'
import { Agent } from './agent'
import type { DraftLine } from './recipe'

type CreateGoodResult =
  | { ok: true; good: Good }
  | { ok: false; error: 'EMPTY_NAME' }

type AgentError =
  | { code: 'EMPTY_NAME' }
  | { code: 'INVALID_QUANTITY'; goodName: string }

type AgentResult =
  | { ok: true; agent: Agent }
  | { ok: false; errors: AgentError[] }

type AgentDraft = {
  name: string
  inventory: DraftLine[]
}

export class RecipeStore {
  private goods: Good[] = []
  private recipes: Recipe[] = []
  private agents: Agent[] = []

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

  createGood(name: string): CreateGoodResult {
    if (name.trim() === '') {
      return { ok: false, error: 'EMPTY_NAME' }
    }

    const good = this.findOrCreateGood(name)
    return { ok: true, good }
  }

  findRecipeByName(name: string): Recipe | undefined {
    return this.recipes.find((r) => r.name === name)
  }

  createRecipe(draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = this.buildRecipe(generateId(), draft)
    this.recipes.push(recipe)
    return { ok: true, recipe }
  }

  updateRecipe(id: string, draft: RecipeDraft): RecipeResult {
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

  deleteRecipe(id: string): void {
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id)
  }

  agentCount(): number {
    return this.agents.length
  }

  findAgentByName(name: string): Agent | undefined {
    return this.agents.find((a) => a.name === name)
  }

  createAgent(draft: AgentDraft): AgentResult {
    const agent = new Agent(
      generateId(),
      draft.name,
      draft.inventory.map((line) => ({
        goodId: this.findOrCreateGood(line.goodName).id,
        quantity: line.quantity,
      })),
    )
    this.agents.push(agent)
    return { ok: true, agent }
  }

  private buildRecipe(id: string, draft: RecipeDraft): Recipe {
    return createRecipeEntity(
      id,
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
