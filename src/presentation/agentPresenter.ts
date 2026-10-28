import type { Agent, AgentError, AgentResult } from '@/domain/agent'
import type { AgentStore } from '@/domain/agentStore'
import { Presenter } from './presenter'
import { removeLineAt, type LineDraft } from './lineDraft'

export class AgentPresenter extends Presenter {
  private agentStore: AgentStore
  private nameValue = ''
  private inventoryValue: LineDraft[] = []
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

  setName(name: string): void {
    this.nameValue = name
    this.notify()
  }

  addInventoryLine(): void {
    this.inventoryValue = [...this.inventoryValue, { goodName: '', quantity: '' }]
    this.notify()
  }

  updateInventoryLine(index: number, field: keyof LineDraft, value: string): void {
    const next = [...this.inventoryValue]
    next[index][field] = value
    this.inventoryValue = next
    this.notify()
  }

  removeInventoryLine(index: number): void {
    this.inventoryValue = removeLineAt(this.inventoryValue, index)
    this.notify()
  }

  submit(): void {
    const result: AgentResult = this.agentStore.create({
      name: this.nameValue,
      inventory: this.inventoryValue.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
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
    this.errorsValue = []
  }
}
