import { Agent, validateAgent } from './agent'
import type { AgentDraft, AgentResult } from './agent'
import { createRecipeEntity, validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeResult } from './recipe'
import type { GoodStore } from './goodStore'
import { goodStore } from './goodStore'

export class AgentStore {
  private agents: Agent[] = []
  private goodStore: GoodStore

  constructor(goodStore: GoodStore) {
    this.goodStore = goodStore
  }

  reset(): void {
    this.agents = []
  }

  count(): number {
    return this.agents.length
  }

  all(): Agent[] {
    return this.agents
  }

  findByName(name: string): Agent | undefined {
    return this.agents.find((a) => a.name === name)
  }

  findById(id: string): Agent | undefined {
    return this.agents.find((a) => a.id === id)
  }

  create(draft: AgentDraft): AgentResult {
    const errors = validateAgent(draft.name, draft.inventory)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agent = new Agent(
      generateId(),
      draft.name,
      draft.inventory.map((line) => ({
        goodId: this.goodStore.resolve(line.goodName).id,
        quantity: line.quantity,
      })),
      [],
    )
    this.agents.push(agent)
    return { ok: true, agent }
  }

  addRecipe(agentId: string, draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agent = this.findById(agentId)
    if (!agent) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = this.buildRecipe(generateId(), draft)
    const updatedRecipes = [...agent.recipes, recipe]
    this.replaceAgent(agent, updatedRecipes)
    return { ok: true, recipe }
  }

  updateRecipe(agentId: string, recipeId: string, draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agent = this.findById(agentId)
    if (!agent) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const index = agent.recipes.findIndex((recipe) => recipe.id === recipeId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = this.buildRecipe(recipeId, draft)
    const updatedRecipes = [...agent.recipes]
    updatedRecipes[index] = recipe
    this.replaceAgent(agent, updatedRecipes)
    return { ok: true, recipe }
  }

  deleteRecipe(agentId: string, recipeId: string): void {
    const agent = this.findById(agentId)
    if (!agent) return

    const updatedRecipes = agent.recipes.filter((recipe) => recipe.id !== recipeId)
    this.replaceAgent(agent, updatedRecipes)
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

  private replaceAgent(agent: Agent, recipes: Recipe[]): void {
    const index = this.agents.findIndex((a) => a.id === agent.id)
    if (index === -1) return

    this.agents[index] = new Agent(agent.id, agent.name, agent.inventory, recipes)
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const agentStore = new AgentStore(goodStore)

export type { Agent, AgentDraft, AgentError } from './agent'
