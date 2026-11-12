import { generateId } from './id'
import { Agent, validateAgent, validateRule } from './agent'
import type {
  AgentDraft,
  AgentError,
  AgentResult,
  InventoryLine,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleError,
} from './agent'
import { createRecipeEntity, validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
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
      draft.inventory.map((line) => ({
        goodId: this.goodIdFor(line.goodName),
        quantity: line.quantity,
      })),
      [],
      [],
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

    const recipe = this.buildRecipe(generateId(), draft)
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
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const errors = this.validateRuleDraft(agentResult.agent, recipeRef, condition)
    if (errors.length > 0) {
      return { ok: false, errors }
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

  updateRule(
    agentId: string,
    ruleId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const index = agentResult.agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RULE_NOT_FOUND' }] }
    }

    const errors = this.validateRuleDraft(agentResult.agent, recipeRef, condition)
    if (errors.length > 0) {
      return { ok: false, errors }
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

  updateRulePriority(agentId: string, ruleId: string, priority: number): RuleResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const index = agentResult.agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RULE_NOT_FOUND' }] }
    }

    if (!Number.isFinite(priority)) {
      return { ok: false, errors: [{ code: 'INVALID_PRIORITY' }] }
    }

    const previous = agentResult.agent.rules[index]
    const rule: Rule = {
      id: previous.id,
      recipeRef: previous.recipeRef,
      condition: previous.condition,
      priority,
    }
    const updatedRules = [...agentResult.agent.rules]
    updatedRules[index] = rule
    updatedRules.sort((a, b) => a.priority - b.priority)
    this.replaceAgent(agentResult.agent, agentResult.agent.recipes, updatedRules)
    return { ok: true, rule }
  }

  deleteRule(agentId: string, ruleId: string): RuleResult {
    const agentResult = this.findById(agentId)
    if (!agentResult.ok) {
      return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }
    }

    const index = agentResult.agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) {
      return { ok: false, errors: [{ code: 'RULE_NOT_FOUND' }] }
    }

    const updatedRules = agentResult.agent.rules.filter((rule) => rule.id !== ruleId)
    this.replaceAgent(agentResult.agent, agentResult.agent.recipes, updatedRules)
    return { ok: true, rule: agentResult.agent.rules[index] }
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

    // validate every input before touching the inventory
    for (const line of recipe.inputs) {
      const available = agent.quantityOf(line.goodId)
      if (available < line.quantity) {
        const good = this.goodStore.get(line.goodId)
        return {
          ok: false,
          errors: [
            {
              code: 'INSUFFICIENT_GOOD',
              goodName: good.ok ? good.good.name : '',
              required: line.quantity,
              available,
            },
          ],
        }
      }
    }

    const quantities = new Map<string, number>()
    for (const line of agent.inventory) {
      quantities.set(line.goodId, (quantities.get(line.goodId) ?? 0) + line.quantity)
    }
    for (const line of recipe.inputs) {
      quantities.set(line.goodId, (quantities.get(line.goodId) ?? 0) - line.quantity)
    }
    for (const line of recipe.outputs) {
      quantities.set(line.goodId, (quantities.get(line.goodId) ?? 0) + line.quantity)
    }

    // keep the first-appearance order of existing goods, then append new ones
    const order: string[] = []
    for (const line of agent.inventory) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }
    for (const line of recipe.outputs) {
      if (!order.includes(line.goodId)) order.push(line.goodId)
    }

    const inventory: InventoryLine[] = order
      .map((goodId) => ({ goodId, quantity: quantities.get(goodId) ?? 0 }))
      .filter((line) => line.quantity > 0)

    const updated = new Agent(agent.id, agent.name, inventory, agent.recipes, agent.rules)
    const index = this.agents.findIndex((a) => a.id === agent.id)
    if (index !== -1) this.agents[index] = updated
    return { ok: true, agent: updated }
  }

  runAutomaticRules(excludeAgentId: string | null): AutomaticProduction[] {
    const executed: AutomaticProduction[] = []

    // iterate over a copy: produce() replaces elements of this.agents
    for (const agent of [...this.agents]) {
      if (agent.id === excludeAgentId) continue

      for (const rule of applicableRules(agent)) {
        const result = this.produce(agent.id, rule.recipeRef)
        if (result.ok) {
          // one action per agent per tick; priority already ordered by the store
          executed.push({ agentId: agent.id, ruleId: rule.id })
          break
        }
        // insufficient material or a deleted recipe: silently try the next rule
      }
    }

    return executed
  }

  private resolveRecipe(agent: Agent, recipeRef: Rule['recipeRef']): Recipe | null {
    if (recipeRef.source === 'agent') {
      return agent.recipes.find((recipe) => recipe.id === recipeRef.recipeId) ?? null
    }
    return this.recipeStore.all().find((recipe) => recipe.id === recipeRef.recipeId) ?? null
  }

  private validateRuleDraft(
    agent: Agent,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
  ): RuleError[] {
    const errors = validateRule(recipeRef.recipeId, condition)

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
    const errors = validateAgent(draft.name, draft.inventory)
    for (const line of draft.inventory) {
      const result = this.goodStore.require(line.goodName)
      if (!result.ok) {
        errors.push({ code: 'UNKNOWN_GOOD', goodName: line.goodName })
      }
    }
    return errors
  }

  private nameIsTaken(name: string, excludeId?: string): boolean {
    return this.agents.some((agent) => agent.name === name && agent.id !== excludeId)
  }

  private validateRecipeDraft(
    draft: RecipeDraft,
    agent: Agent,
    excludeRecipeId?: string,
  ): RecipeError[] {
    const errors = validateRecipe(draft.name, draft.inputs, draft.outputs)
    for (const line of [...draft.inputs, ...draft.outputs]) {
      const result = this.goodStore.require(line.goodName)
      if (!result.ok) {
        errors.push({ code: 'UNKNOWN_GOOD', goodName: line.goodName })
      }
    }
    if (
      agent.recipes.some((recipe) => recipe.name === draft.name && recipe.id !== excludeRecipeId)
    ) {
      errors.push({ code: 'RECIPE_NAME_EXISTS' })
    }
    return errors
  }

  private goodIdFor(name: string): string {
    const result = this.goodStore.require(name)
    if (!result.ok) {
      throw new Error(`Unexpected missing good: ${name}`)
    }
    return result.good.id
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
  InventoryLine,
  ProductionError,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleError,
  RuleRecipeRef,
} from './agent'
