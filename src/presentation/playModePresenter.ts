import type { Agent, AgentStore } from '@/domain/agentStore'
import type { RuleRecipeRef } from '@/domain/agentStore'
import type { Good, GoodStore } from '@/domain/goodStore'
import type { PossessionStore } from '@/domain/possessionStore'
import type { Recipe, RecipeStore } from '@/domain/recipeStore'
import type { ActivationStrategy, StrategyStore } from '@/domain/strategyStore'
import { errorMessage } from '@/i18n/errors'
import { goodName as findGoodName, recipeName as findRecipeName } from './catalogHelpers'
import { Presenter } from './presenter'

export class PlayModePresenter extends Presenter {
  private agentStore: AgentStore
  private goodStore: GoodStore
  private recipeStore: RecipeStore
  private possessionStore: PossessionStore
  private strategyStore: StrategyStore
  private errorValue: string | null = null
  private priorityDrafts = new Map<string, string>()

  constructor(stores: {
    agentStore: AgentStore
    goodStore: GoodStore
    recipeStore: RecipeStore
    possessionStore: PossessionStore
    strategyStore: StrategyStore
  }) {
    super()
    this.agentStore = stores.agentStore
    this.goodStore = stores.goodStore
    this.recipeStore = stores.recipeStore
    this.possessionStore = stores.possessionStore
    this.strategyStore = stores.strategyStore
  }

  get agents(): Agent[] {
    return this.agentStore.all()
  }

  get goods(): Good[] {
    return this.goodStore.all()
  }

  get catalogRecipes(): Recipe[] {
    return this.recipeStore.all()
  }

  get possessedAgentId(): string | null {
    return this.possessionStore.possessedAgentId()
  }

  get possessedAgent(): Agent | null {
    return this.possessionStore.possessed()
  }

  get error(): string | null {
    return this.errorValue
  }

  get strategy(): ActivationStrategy {
    return this.strategyStore.get()
  }

  setStrategy(strategy: ActivationStrategy): void {
    this.strategyStore.set(strategy)
    this.notify()
  }

  /** Display name for a good id, resolved from the store. */
  goodName(goodId: string): string {
    return findGoodName(this.goodStore.all(), goodId)
  }

  /**
   * Display name of a recipe referenced by a rule. A rule points either at the
   * catalog or at the possessed agent's own recipes, so resolving the source
   * is domain knowledge that must not live in the view.
   */
  recipeLabel(recipeRef: RuleRecipeRef): string {
    const agentRecipes = this.possessionStore.possessed()?.recipes ?? []
    return findRecipeName(recipeRef, this.recipeStore.all(), agentRecipes)
  }

  possess(agentId: string): void {
    const result = this.possessionStore.possess(agentId)
    this.errorValue = result.ok ? null : errorMessage({ code: result.error })
    this.notify()
  }

  release(): void {
    this.possessionStore.release()
    this.errorValue = null
    this.priorityDrafts.clear()
    this.notify()
  }

  priorityDraft(ruleId: string, currentPriority: number): string {
    return this.priorityDrafts.get(ruleId) ?? String(currentPriority)
  }

  setPriorityDraft(ruleId: string, value: string): void {
    this.priorityDrafts.set(ruleId, value)
    this.notify()
  }

  submitPriority(ruleId: string): void {
    const agent = this.possessionStore.possessed()
    if (!agent) return

    const draft = this.priorityDrafts.get(ruleId)
    if (draft === undefined) return

    // Number('') is 0, so empty drafts are rejected here before reaching the store
    const trimmed = draft.trim()
    const priority = trimmed === '' ? Number.NaN : Number(trimmed)
    const result = this.agentStore.updateRulePriority(agent.id, ruleId, priority)

    if (result.ok) {
      this.priorityDrafts.delete(ruleId)
      this.errorValue = null
    } else {
      this.errorValue = errorMessage(result.errors[0])
    }
    this.notify()
  }

  produce(recipeRef: RuleRecipeRef): void {
    const agent = this.possessionStore.possessed()
    if (!agent) return

    const result = this.agentStore.produce(agent.id, recipeRef)
    this.errorValue = result.ok ? null : errorMessage(result.errors[0])

    // action-driven economy: only a successful player action moves the others
    if (result.ok && this.strategy === 'POR_ACCIONES') {
      this.agentStore.runAutomaticRules(this.possessionStore.possessedAgentId())
    }
    this.notify()
  }

  tick(): number {
    const executed = this.agentStore.runAutomaticRules(this.possessionStore.possessedAgentId())

    // only re-render when the background economy actually changed something
    if (executed.length > 0) this.notify()
    return executed.length
  }

  /**
   * POR_ACCIONES without possession: nobody plays, so the player pushes the
   * economy by hand. Everything runs except a possessed agent, if any.
   */
  advance(): number {
    const executed = this.agentStore.runAutomaticRules(this.possessionStore.possessedAgentId())

    if (executed.length > 0) this.notify()
    return executed.length
  }
}
