import type { Agent, AgentStore } from '@/domain/agentStore'
import type { RuleRecipeRef } from '@/domain/agentStore'
import type { Good, GoodStore } from '@/domain/goodStore'
import type { PossessionStore } from '@/domain/possessionStore'
import type { Recipe, RecipeStore } from '@/domain/recipeStore'
import { errorMessage } from '@/i18n/errors'
import { Presenter } from './presenter'

export class PlayModePresenter extends Presenter {
  private agentStore: AgentStore
  private goodStore: GoodStore
  private recipeStore: RecipeStore
  private possessionStore: PossessionStore
  private errorValue: string | null = null
  private priorityDrafts = new Map<string, string>()

  constructor(stores: {
    agentStore: AgentStore
    goodStore: GoodStore
    recipeStore: RecipeStore
    possessionStore: PossessionStore
  }) {
    super()
    this.agentStore = stores.agentStore
    this.goodStore = stores.goodStore
    this.recipeStore = stores.recipeStore
    this.possessionStore = stores.possessionStore
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

  possess(agentId: string): void {
    const result = this.possessionStore.possess(agentId)
    this.errorValue = result.ok ? null : 'Agente no encontrado'
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
    this.notify()
  }

  tick(): number {
    const executed = this.agentStore.runAutomaticRules(this.possessionStore.possessedAgentId())

    // only re-render when the background economy actually changed something
    if (executed.length > 0) this.notify()
    return executed.length
  }
}
