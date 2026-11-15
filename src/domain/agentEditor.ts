import { generateId } from './id'
import { validateRule } from './agent'
import type { Agent, Rule, RuleCondition, RuleError, RuleResult } from './agent'
import { validateRecipe } from './recipe'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from './recipe'
import { buildRecipeFromDraft, unknownGoodLineErrors } from './draftLines'
import { resolveRecipe } from './recipeRef'
import type { GoodStore } from './goodStore'
import type { RecipeStore } from './recipeStore'

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

/**
 * The recipes and rules an agent owns: created, edited and deleted through
 * the host. `AgentStore` is the host and keeps these operations in its own
 * public API.
 */
export class AgentEditor {
  private host: AgentHost
  private goodStore: GoodStore
  private recipeStore: RecipeStore

  constructor(host: AgentHost, goodStore: GoodStore, recipeStore: RecipeStore) {
    this.host = host
    this.goodStore = goodStore
    this.recipeStore = recipeStore
  }

  addRecipe(agentId: string, draft: RecipeDraft): RecipeResult {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return { ok: false, errors: [{ code: 'RECIPE_NOT_FOUND' }] }

    const errors = this.validateRecipeDraft(draft, agent)
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

    const errors = this.validateRecipeDraft(draft, agent, recipeId)
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

  addRule(
    agentId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return { ok: false, errors: [{ code: 'AGENT_NOT_FOUND' }] }

    const errors = this.validateRuleDraft(agent, recipeRef, condition, priority)
    if (errors.length > 0) return { ok: false, errors }

    const rule: Rule = { id: generateId(), recipeRef, condition, priority }
    this.replaceRules(agent, [...agent.rules, rule])
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
    if (errors.length > 0) return { ok: false, errors }

    const rules = [...found.agent.rules]
    rules[found.index] = { id: ruleId, recipeRef, condition, priority }
    this.replaceRules(found.agent, rules)
    return { ok: true, rule: rules[found.index] }
  }

  updateRulePriority(agentId: string, ruleId: string, priority: number): RuleResult {
    const found = this.requireRule(agentId, ruleId)
    if (!found.ok) return { ok: false, errors: [found.error] }
    if (!Number.isFinite(priority)) {
      return { ok: false, errors: [{ code: 'INVALID_PRIORITY' }] }
    }

    const rules = [...found.agent.rules]
    rules[found.index] = { ...found.rule, priority }
    this.replaceRules(found.agent, rules)
    return { ok: true, rule: rules[found.index] }
  }

  deleteRule(agentId: string, ruleId: string): RuleResult {
    const found = this.requireRule(agentId, ruleId)
    if (!found.ok) return { ok: false, errors: [found.error] }

    const rules = found.agent.rules.filter((rule) => rule.id !== ruleId)
    this.host.replaceAgent(found.agent, found.agent.recipes, rules)
    return { ok: true, rule: found.rule }
  }

  /** Resolves an agent and one of its rules, or the reason why they are missing. */
  private requireRule(
    agentId: string,
    ruleId: string,
  ): { ok: true; agent: Agent; index: number; rule: Rule } | { ok: false; error: RuleError } {
    const agent = this.host.agentOrNull(agentId)
    if (agent === null) return { ok: false, error: { code: 'AGENT_NOT_FOUND' } }

    const index = agent.rules.findIndex((rule) => rule.id === ruleId)
    if (index === -1) return { ok: false, error: { code: 'RULE_NOT_FOUND' } }

    return { ok: true, agent, index, rule: agent.rules[index] }
  }

  /** Stores the given rules keeping them ordered by priority. */
  private replaceRules(agent: Agent, rules: Rule[]): void {
    const sorted = [...rules].sort((a, b) => a.priority - b.priority)
    this.host.replaceAgent(agent, agent.recipes, sorted)
  }

  /** Shape, known goods and duplicate name of an agent-owned recipe. */
  private validateRecipeDraft(
    draft: RecipeDraft,
    agent: Agent,
    excludeRecipeId?: string,
  ): RecipeError[] {
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

  /** Shape of the rule, then that its recipe and condition good exist. */
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
}
