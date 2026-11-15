import { generateId } from './id'
import { Agent, recipesPerActionOf, validateAgent } from './agent'
import type {
  AgentDraft,
  AgentError,
  AgentResult,
  ProductionResult,
  Rule,
  RuleCondition,
  RuleResult,
} from './agent'
import type { Recipe, RecipeDraft, RecipeResult } from './recipe'
import { resolveDraftLines, unknownGoodLineErrors } from './draftLines'
import { ProductionEngine } from './production'
import { applicableRules } from './ruleEngine'
import { runAutomaticRules as runAgentRules, type AutomaticProduction } from './automaticRules'
import { AgentEditor } from './agentEditor'
import type { GoodStore } from './goodStore'
import type { RecipeStore } from './recipeStore'

export type FindAgentResult = { ok: true; agent: Agent } | { ok: false; error: 'AGENT_NOT_FOUND' }

export type { RuleResult }
export type { AutomaticProduction } from './automaticRules'

export class AgentStore {
  private agents: Agent[] = []
  private goodStore: GoodStore
  private production: ProductionEngine
  private editor: AgentEditor

  constructor(goodStore: GoodStore, recipeStore: RecipeStore) {
    this.goodStore = goodStore
    this.production = new ProductionEngine(goodStore, recipeStore)
    this.editor = new AgentEditor(this, goodStore, recipeStore)
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
    return this.editor.addRecipe(agentId, draft)
  }

  updateRecipe(agentId: string, recipeId: string, draft: RecipeDraft): RecipeResult {
    return this.editor.updateRecipe(agentId, recipeId, draft)
  }

  deleteRecipe(agentId: string, recipeId: string): void {
    this.editor.deleteRecipe(agentId, recipeId)
  }

  addRule(
    agentId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    return this.editor.addRule(agentId, recipeRef, condition, priority)
  }

  updateRule(
    agentId: string,
    ruleId: string,
    recipeRef: Rule['recipeRef'],
    condition: RuleCondition,
    priority: number,
  ): RuleResult {
    return this.editor.updateRule(agentId, ruleId, recipeRef, condition, priority)
  }

  updateRulePriority(agentId: string, ruleId: string, priority: number): RuleResult {
    return this.editor.updateRulePriority(agentId, ruleId, priority)
  }

  deleteRule(agentId: string, ruleId: string): RuleResult {
    return this.editor.deleteRule(agentId, ruleId)
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

  /** Every stored agent but the excluded one, snapshotted for this pass. */
  runnableAgents(excludeAgentId: string | null): Agent[] {
    return this.agents.filter((agent) => agent.id !== excludeAgentId)
  }

  /** Executes the agent's highest-priority applicable rule; null when none runs. */
  runNextRule(agentId: string): Rule | null {
    const found = this.findById(agentId)
    if (!found.ok) return null

    for (const rule of applicableRules(found.agent)) {
      // produce() swaps the stored agent, so each attempt re-reads it
      const result = this.produce(agentId, rule.recipeRef)
      if (result.ok) return rule
      // insufficient material or a deleted recipe: silently try the next rule
    }
    return null
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

  /** The agent the editor works on, or null when it does not exist. */
  agentOrNull(agentId: string): Agent | null {
    const found = this.findById(agentId)
    return found.ok ? found.agent : null
  }

  /** Swaps the stored agent for a copy carrying the given recipes and rules. */
  replaceAgent(agent: Agent, recipes: Recipe[], rules: Rule[]): void {
    this.swapAgent(
      agent.id,
      new Agent(agent.id, agent.name, agent.inventory, recipes, rules, agent.recipesPerAction),
    )
  }

  /** Swaps the stored agent for an updated copy, keeping its position. */
  private swapAgent(agentId: string, updated: Agent): void {
    const index = this.agents.findIndex((a) => a.id === agentId)
    if (index === -1) return
    this.agents[index] = updated
  }
}
