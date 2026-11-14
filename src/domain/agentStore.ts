import { generateId } from './id'
import { Agent, recipesPerActionOf, validateAgent, validateRule } from './agent'
import type {
  AgentDraft,
  AgentError,
  AgentResult,
  InventoryLine,
  ProductionError,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleError,
} from './agent'
import { validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import { buildRecipeFromDraft, resolveDraftLines, unknownGoodLineErrors } from './draftLines'
import { applicableRules } from './ruleEngine'
import type { GoodStore } from './goodStore'
import type { RecipeStore } from './recipeStore'

export type FindAgentResult = { ok: true; agent: Agent } | { ok: false; error: 'AGENT_NOT_FOUND' }

export type RuleResult = { ok: true; rule: Rule } | { ok: false; errors: RuleError[] }

export type AutomaticProduction = { agentId: string; ruleId: string }

export class AgentStore {
  private agents: Agent[] = []
  private goodStore: GoodStore
  private recipeStore: RecipeStore

  constructor(goodStore: GoodStore, recipeStore: RecipeStore) {
    this.goodStore = goodStore
    this.recipeStore = recipeStore
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
    const agent = agentResult.agent

    const recipe = this.resolveRecipe(agent, recipeRef)
    if (!recipe) {
      return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }
    }

    const insufficient = this.insufficientInput(agent, recipe)
    if (insufficient) return { ok: false, errors: [insufficient] }

    const updated = new Agent(
      agent.id,
      agent.name,
      this.composeInventory(agent, recipe),
      agent.recipes,
      agent.rules,
      agent.recipesPerAction,
    )
    const index = this.agents.findIndex((a) => a.id === agent.id)
    if (index !== -1) this.agents[index] = updated
    return { ok: true, agent: updated }
  }

  /** Checks every input before the inventory is touched. */
  private insufficientInput(agent: Agent, recipe: Recipe): ProductionError | null {
    for (const line of recipe.inputs) {
      const available = agent.quantityOf(line.goodId)
      if (available < line.quantity) {
        const good = this.goodStore.get(line.goodId)
        return {
          code: 'INSUFFICIENT_GOOD',
          goodName: good.ok ? good.good.name : '',
          required: line.quantity,
          available,
        }
      }
    }
    return null
  }

  /** Applies the recipe: consumes inputs, adds outputs, drops emptied goods. */
  private composeInventory(agent: Agent, recipe: Recipe): InventoryLine[] {
    const quantities = new Map<string, number>()
    const bump = (goodId: string, delta: number) =>
      quantities.set(goodId, (quantities.get(goodId) ?? 0) + delta)

    for (const line of agent.inventory) bump(line.goodId, line.quantity)
    for (const line of recipe.inputs) bump(line.goodId, -line.quantity)
    for (const line of recipe.outputs) bump(line.goodId, line.quantity)

    // keep the first-appearance order of existing goods, then append new ones
    const order: string[] = []
    for (const line of agent.inventory) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }
    for (const line of recipe.outputs) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }

    return order
      .map((goodId) => ({ goodId, quantity: quantities.get(goodId) ?? 0 }))
      .filter((line) => line.quantity > 0)
  }

  /**
   * Runs each agent's automatic rules up to its own `recipesPerAction` limit.
   * `excludeAgentId` skips the possessed agent (null ⇒ nobody is skipped).
   * Before every recipe the condition is re-evaluated against the fresh
   * inventory, so a rule that no longer applies yields to the next priority
   * and an agent with nothing executable stops early instead of looping.
   */
  runAutomaticRules(excludeAgentId: string | null): AutomaticProduction[] {
    const executed: AutomaticProduction[] = []

    // iterate over a copy: produce() replaces elements of this.agents
    for (const agent of [...this.agents]) {
      if (agent.id === excludeAgentId) continue

      let done = 0
      while (done < agent.recipesPerAction) {
        // produce() swaps the agent object: re-read it on every round
        const current = this.findById(agent.id)
        if (!current.ok) break

        const rule = this.runNextRule(current.agent)
        if (rule === null) break // no material, condition unmet or recipe deleted

        executed.push({ agentId: agent.id, ruleId: rule.id })
        done++
      }
    }

    return executed
  }

  /** Executes the highest-priority applicable rule; null when none can run. */
  private runNextRule(agent: Agent): Rule | null {
    for (const rule of applicableRules(agent)) {
      const result = this.produce(agent.id, rule.recipeRef)
      if (result.ok) return rule
      // insufficient material or a deleted recipe: silently try the next rule
    }
    return null
  }

  private resolveRecipe(agent: Agent, recipeRef: Rule['recipeRef']): Recipe | null {
    if (recipeRef.source === 'agent') {
      return agent.recipes.find((recipe) => recipe.id === recipeRef.recipeId) ?? null
    }
    const result = this.recipeStore.findById(recipeRef.recipeId)
    return result.ok ? result.recipe : null
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
    return this.resolveRecipe(agent, recipeRef) !== null
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

  private replaceAgent(agent: Agent, recipes: Recipe[], rules: Rule[]): void {
    const index = this.agents.findIndex((a) => a.id === agent.id)
    if (index === -1) return

    this.agents[index] = new Agent(
      agent.id,
      agent.name,
      agent.inventory,
      recipes,
      rules,
      agent.recipesPerAction,
    )
  }
}

export type {
  Agent,
  AgentDraft,
  AgentError,
  InventoryLine,
  ProductionError,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleError,
  RuleRecipeRef,
} from './agent'
