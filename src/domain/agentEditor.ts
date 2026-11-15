import { generateId } from './id'
import type { Agent, Rule } from './agent'
import { validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import { buildRecipeFromDraft, unknownGoodLineErrors } from './draftLines'
import type { GoodStore } from './goodStore'

/**
 * How the editor reads and rewrites the agent it works on. The recipes and
 * rules live inside the agent, so every change is written back through the
 * host instead of the editor holding the agents itself.
 */
export type AgentHost = {
  /** The agent to edit, or null when it does not exist. */
  agentOrNull(agentId: string): Agent | null
  /** Stores a copy of the agent carrying the given recipes and rules. */
  replaceAgent(agent: Agent, recipes: Recipe[], rules: Rule[]): void
}

/** The recipes an agent owns: created, edited and deleted through the host. */
export class AgentEditor {
  private host: AgentHost
  private goodStore: GoodStore

  constructor(host: AgentHost, goodStore: GoodStore) {
    this.host = host
    this.goodStore = goodStore
  }

  addRecipe(agentId: string, draft: RecipeDraft): RecipeResult {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }

    const errors = this.validateDraft(draft, agent)
    if (errors.length > 0) return { ok: false, errors }

    const recipe = buildRecipeFromDraft(this.goodStore, generateId(), draft)
    this.host.replaceAgent(agent, [...agent.recipes, recipe], agent.rules)
    return { ok: true, recipe }
  }

  updateRecipe(agentId: string, recipeId: string, draft: RecipeDraft): RecipeResult {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }

    const index = agent.recipes.findIndex((recipe) => recipe.id === recipeId)
    if (index === -1) return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }

    const errors = this.validateDraft(draft, agent, recipeId)
    if (errors.length > 0) return { ok: false, errors }

    const recipes = [...agent.recipes]
    recipes[index] = buildRecipeFromDraft(this.goodStore, recipeId, draft)
    this.host.replaceAgent(agent, recipes, agent.rules)
    return { ok: true, recipe: recipes[index] }
  }

  deleteRecipe(agentId: string, recipeId: string): void {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return

    const recipes = agent.recipes.filter((recipe) => recipe.id !== recipeId)
    this.host.replaceAgent(agent, recipes, agent.rules)
  }

  /** Shape, known goods and duplicate name of an agent-owned recipe. */
  private validateDraft(draft: RecipeDraft, agent: Agent, excludeRecipeId?: string): RecipeError[] {
    const errors: RecipeError[] = [
      ...validateRecipe(draft.name, draft.inputs, draft.outputs),
      ...unknownGoodLineErrors(this.goodStore, [...draft.inputs, ...draft.outputs]),
    ]
    const taken = agent.recipes.some(
      (recipe) => recipe.name === draft.name && recipe.id !== excludeRecipeId,
    )
    if (taken) errors.push({ code: 'RECIPE_NAME_EXISTS' })
    return errors
  }
}
