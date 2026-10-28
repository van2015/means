import { generateId } from './id'
import { Agent, validateAgent, validateRule } from './agent'
import type { AgentDraft, AgentResult, Rule, RuleCondition, RuleError } from './agent'
import { createRecipeEntity, validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeResult } from './recipe'
import type { GoodStore } from './goodStore'

export type FindAgentResult =
  | { ok: true; agent: Agent }
  | { ok: false; error: 'AGENT_NOT_FOUND' }

export type RuleResult =
  | { ok: true; rule: Rule }
  | { ok: false; errors: RuleError[] }

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

  findByName(name: string): FindAgentResult {
    const agent = this.agents.find((a) => a.name === name)
    if (agent === undefined) {
      return { ok: false, error: 'AGENT_NOT_FOUND' }
    }
    return { ok: true, agent }
  }

  findById(id: string): FindAgentResult {
    const agent = this.agents.find((a) => a.id === id)
    if (agent === undefined) {
      return { ok: false, error: 'AGENT_NOT_FOUND' }
    }
    return { ok: true, agent }
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

    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = this.buildRecipe(generateId(), draft)
    const updatedRecipes = [...agentResult.agent.recipes, recipe]
    this.replaceAgent(agentResult.agent, updatedRecipes, agentResult.agent.rules)
    return { ok: true, recipe }
  }

  updateRecipe(agentId: string, recipeId: string, draft: RecipeDraft): RecipeResult {
    const errors = validateRecipe(draft.inputs, draft.outputs)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const index = agentResult.agent.recipes.findIndex((recipe) => recipe.id === recipeId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const recipe = this.buildRecipe(recipeId, draft)
    const updatedRecipes = [...agentResult.agent.recipes]
    updatedRecipes[index] = recipe
    this.replaceAgent(agentResult.agent, updatedRecipes, agentResult.agent.rules)
    return { ok: true, recipe }
  }

  deleteRecipe(agentId: string, recipeId: string): void {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) return

    const updatedRecipes = agentResult.agent.recipes.filter((recipe) => recipe.id !== recipeId)
    this.replaceAgent(agentResult.agent, updatedRecipes, agentResult.agent.rules)
  }

  addRule(
    agentId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    const errors = validateRule(recipeRef.recipeId, condition)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'NO_RECIPE' }] }
    }

    const rule: Rule = {
      id: generateId(),
      recipeRef,
      condition,
      priority,
    }
    const updatedRules = [...agentResult.agent.rules, rule].sort((a, b) => a.priority - b.priority)
    this.replaceAgent(agentResult.agent, agentResult.agent.recipes, updatedRules)
    return { ok: true, rule }
  }

  updateRule(agentId: string, ruleId: string, recipeRef: Rule['recipeRef'], condition: RuleCondition, priority: number): RuleResult {
    const errors = validateRule(recipeRef.recipeId, condition)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'NO_RECIPE' }] }
    }

    const index = agentResult.agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'NO_RECIPE' }] }
    }

    const rule: Rule = {
      id: ruleId,
      recipeRef,
      condition,
      priority,
    }
    const updatedRules = [...agentResult.agent.rules]
    updatedRules[index] = rule
    updatedRules.sort((a, b) => a.priority - b.priority)
    this.replaceAgent(agentResult.agent, agentResult.agent.recipes, updatedRules)
    return { ok: true, rule }
  }

  deleteRule(agentId: string, ruleId: string): void {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) return

    const updatedRules = agentResult.agent.rules.filter((rule) => rule.id !== ruleId)
    this.replaceAgent(agentResult.agent, agentResult.agent.recipes, updatedRules)
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

  private replaceAgent(agent: Agent, recipes: Recipe[], rules: Rule[]): void {
    const index = this.agents.findIndex((a) => a.id === agent.id)
    if (index === -1) return

    this.agents[index] = new Agent(agent.id, agent.name, agent.inventory, recipes, rules)
  }
}

export type {
  Agent,
  AgentDraft,
  AgentError,
  Rule,
  RuleCondition,
  RuleError,
  RuleRecipeRef,
} from './agent'
