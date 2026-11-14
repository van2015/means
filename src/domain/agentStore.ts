import { generateId } from './id'
import { Agent, recipesPerActionOf, validateAgent, validateRule } from './agent'
import type {
  AgentDraft,
  AgentError,
  AgentResult,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleError,
} from './agent'
import { validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import { buildRecipeFromDraft, resolveDraftLines, unknownGoodLineErrors } from './draftLines'
import { ProductionEngine } from './production'
import { resolveRecipe } from './recipeRef'
import { runAutomaticRules as runAgentRules, type AutomaticProduction } from './automaticRules'
import type { GoodStore } from './goodStore'
import type { RecipeStore } from './recipeStore'

export type FindAgentResult = { ok: true; agent: Agent } | { ok: false; error: 'AGENT_NOT_FOUND' }

export type RuleResult = { ok: true; rule: Rule } | { ok: false; errors: RuleError[] }

export type { AutomaticProduction } from './automaticRules'

export class AgentStore {
  private agents: Agent[] = []
  private goodStore: GoodStore
  private recipeStore: RecipeStore
  private production: ProductionEngine

  constructor(goodStore: GoodStore, recipeStore: RecipeStore) {
    this.goodStore = goodStore
    this.recipeStore = recipeStore
    this.production = new ProductionEngine(goodStore, recipeStore)
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
    const errors = this.validateDraft(draft)
    if (this.nameIsTaken(draft.name)) {
      errors.push({ code: 'AGENT_NAME_EXISTS' })
    }

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agent = new Agent(
      generateId(),
      draft.name,
      resolveDraftLines(this.goodStore, draft.inventory),
      [],
      [],
      recipesPerActionOf(draft),
    )
    this.agents.push(agent)
    return { ok: true, agent }
  }

  addRecipe(agentId: string, draft: RecipeDraft): RecipeResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const errors = this.validateRecipeDraft(draft, agentResult.agent)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = buildRecipeFromDraft(this.goodStore, generateId(), draft)
    const updatedRecipes = [...agentResult.agent.recipes, recipe]
    this.replaceAgent(agentResult.agent, updatedRecipes, agentResult.agent.rules)
    return { ok: true, recipe }
  }

  updateRecipe(agentId: string, recipeId: string, draft: RecipeDraft): RecipeResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const index = agentResult.agent.recipes.findIndex((recipe) => recipe.id === recipeId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const errors = this.validateRecipeDraft(draft, agentResult.agent, recipeId)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const recipe = buildRecipeFromDraft(this.goodStore, recipeId, draft)
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
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const errors = this.validateRuleDraft(agentResult.agent, recipeRef, condition, priority)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const rule: Rule = { id: generateId(), recipeRef, condition, priority }
    this.replaceRules(agentResult.agent, [...agentResult.agent.rules, rule])
    return { ok: true, rule }
  }

  updateRule(
    agentId: string,
    ruleId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    const found = this.requireRule(agentId, ruleId)
    if (!found.ok) return { ok: false, errors: [found.error] }

    const errors = this.validateRuleDraft(found.agent, recipeRef, condition, priority)
    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const rule: Rule = { id: ruleId, recipeRef, condition, priority }
    const updatedRules = [...found.agent.rules]
    updatedRules[found.index] = rule
    this.replaceRules(found.agent, updatedRules)
    return { ok: true, rule }
  }

  updateRulePriority(agentId: string, ruleId: string, priority: number): RuleResult {
    const found = this.requireRule(agentId, ruleId)
    if (!found.ok) return { ok: false, errors: [found.error] }
    if (!Number.isFinite(priority)) {
      return { ok: false, errors: [{ code: 'INVALID_PRIORITY' }] }
    }

    const rule: Rule = { ...found.rule, priority }
    const updatedRules = [...found.agent.rules]
    updatedRules[found.index] = rule
    this.replaceRules(found.agent, updatedRules)
    return { ok: true, rule }
  }

  deleteRule(agentId: string, ruleId: string): RuleResult {
    const found = this.requireRule(agentId, ruleId)
    if (!found.ok) return { ok: false, errors: [found.error] }

    const updatedRules = found.agent.rules.filter((rule) => rule.id !== ruleId)
    this.replaceAgent(found.agent, found.agent.recipes, updatedRules)
    return { ok: true, rule: found.rule }
  }

  /** Resolves an agent and one of its rules, or the reason why they are missing. */
  private requireRule(
    agentId: string,
    ruleId: string,
  ): { ok: true; agent: Agent; index: number; rule: Rule } | { ok: false; error: RuleError } {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) return { ok: false, error: { code: 'AGENT_NOT_FOUND' } }

    const index = agentResult.agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) return { ok: false, error: { code: 'RULE_NOT_FOUND' } }

    return { ok: true, agent: agentResult.agent, index, rule: agentResult.agent.rules[index] }
  }

  /** Stores the given rules keeping them ordered by priority. */
  private replaceRules(agent: Agent, rules: Rule[]): void {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)
    this.replaceAgent(agent, agent.recipes, sorted)
  }

  produce(agentId: string, recipeRef: Rule['recipeRef']): ProductionResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const result = this.production.run(agentResult.agent, recipeRef)
    if (result.ok) this.swapAgent(agentResult.agent.id, result.agent)
    return result
  }

  /**
   * Runs each agent's automatic rules up to its own `recipesPerAction` limit,
   * skipping the possessed agent when there is one.
   */
  runAutomaticRules(excludeAgentId: string | null): AutomaticProduction[] {
    return runAgentRules(this, excludeAgentId)
  }

  private validateRuleDraft(
    agent: Agent,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleError[] {
    const errors = validateRule(recipeRef.recipeId, condition, priority)

    if (recipeRef.recipeId !== '' && !this.ruleRecipeExists(agent, recipeRef)) {
      errors.push({ code: 'RECIPE_NOT_FOUND' })
    }
    if (condition.goodId !== '' && !this.goodStore.get(condition.goodId).ok) {
      errors.push({ code: 'UNKNOWN_CONDITION_GOOD' })
    }
    return errors
  }

  private ruleRecipeExists(agent: Agent, recipeRef: Rule['recipeRef']): boolean {
    return resolveRecipe(agent, recipeRef, this.recipeStore) !== null
  }

  private validateDraft(draft: AgentDraft): AgentError[] {
    return [
      ...validateAgent(draft.name, draft.inventory, recipesPerActionOf(draft)),
      ...unknownGoodLineErrors(this.goodStore, draft.inventory),
    ]
  }

  private nameIsTaken(name: string, excludeId?: string): boolean {
    return this.agents.some((agent) => agent.name === name && agent.id !== excludeId)
  }

  private validateRecipeDraft(
    draft: RecipeDraft,
    agent: Agent,
    excludeRecipeId?: string,
  ): RecipeError[] {
    const errors: RecipeError[] = [
      ...validateRecipe(draft.name, draft.inputs, draft.outputs),
      ...unknownGoodLineErrors(this.goodStore, [...draft.inputs, ...draft.outputs]),
    ]
    if (
      agent.recipes.some((recipe) => recipe.name === draft.name && recipe.id !== excludeRecipeId)
    ) {
      errors.push({ code: 'RECIPE_NAME_EXISTS' })
    }
    return errors
  }

  /** Swaps the stored agent for an updated copy, keeping its position. */
  private swapAgent(agentId: string, updated: Agent): void {
    const index = this.agents.findIndex((a) => a.id === agentId)
    if (index === -1) return
    this.agents[index] = updated
  }

  private replaceAgent(agent: Agent, recipes: Recipe[], rules: Rule[]): void {
    this.swapAgent(
      agent.id,
      new Agent(agent.id, agent.name, agent.inventory, recipes, rules, agent.recipesPerAction),
    )
  }
}
