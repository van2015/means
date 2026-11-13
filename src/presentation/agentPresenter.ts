import type { Agent, AgentError, AgentResult } from '@/domain/agent'
import type { AgentStore } from '@/domain/agentStore'
import type { Recipe } from '@/domain/recipe'
import { Presenter } from './presenter'
import { createLineDraft, removeLineAt, type LineDraft, type LineDraftField } from './lineDraft'

export class AgentPresenter extends Presenter {
  private agentStore: AgentStore
  private nameValue = ''
  private inventoryValue: LineDraft[] = []
  private recipesPerActionValue = '1'
  private errorsValue: AgentError[] = []
  private selectedAgentIdValue: string | null = null
  private selectedAgentViewValue: 'recipes' | 'rules' | null = null

  constructor(stores: { agentStore: AgentStore }) {
    super()
    this.agentStore = stores.agentStore
  }

  get name(): string {
    return this.nameValue
  }

  get inventory(): LineDraft[] {
    return this.inventoryValue
  }

  /** Raw draft of "Recetas por acción" (kept as text like the other drafts). */
  get recipesPerAction(): string {
    return this.recipesPerActionValue
  }

  get errors(): AgentError[] {
    return this.errorsValue
  }

  get agents(): Agent[] {
    return this.agentStore.all()
  }

  get selectedAgentId(): string | null {
    return this.selectedAgentIdValue
  }

  get selectedAgentView(): 'recipes' | 'rules' | null {
    return this.selectedAgentViewValue
  }

  /**
   * Own recipes of the selected agent: callers (the rule recipe picker) ask
   * for them instead of searching the agent list themselves.
   */
  get selectedAgentRecipes(): Recipe[] {
    if (this.selectedAgentIdValue === null) return []
    const result = this.agentStore.findById(this.selectedAgentIdValue)
    return result.ok ? result.agent.recipes : []
  }

  setName(name: string): void {
    this.nameValue = name
    this.notify()
  }

  setRecipesPerAction(value: string): void {
    this.recipesPerActionValue = value
    this.notify()
  }

  addInventoryLine(): void {
    this.inventoryValue = [...this.inventoryValue, createLineDraft()]
    this.notify()
  }

  updateInventoryLine(index: number, field: LineDraftField, value: string): void {
    const next = [...this.inventoryValue]
    next[index][field] = value
    this.inventoryValue = next
    this.notify()
  }

  removeInventoryLine(index: number): void {
    this.inventoryValue = removeLineAt(this.inventoryValue, index)
    this.errorsValue = []
    this.notify()
  }

  submit(): void {
    const result: AgentResult = this.agentStore.create({
      name: this.nameValue,
      inventory: this.inventoryValue.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
      // '' and non-numeric drafts become 0/NaN, which validation rejects
      recipesPerAction: Number(this.recipesPerActionValue),
    })

    if (result.ok) {
      this.resetForm()
    } else {
      this.errorsValue = result.errors
    }

    this.notify()
  }

  selectAgent(agentId: string): void {
    this.selectedAgentIdValue = agentId
    this.selectedAgentViewValue = 'recipes'
    this.notify()
  }

  selectAgentRules(agentId: string): void {
    this.selectedAgentIdValue = agentId
    this.selectedAgentViewValue = 'rules'
    this.notify()
  }

  private resetForm(): void {
    this.nameValue = ''
    this.inventoryValue = []
    this.recipesPerActionValue = '1'
    this.errorsValue = []
  }
}
