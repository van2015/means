import { agentStore } from '@/domain/agentStore'
import type { Agent, AgentError } from '@/domain/agentStore'
import { goodStore } from '@/domain/goodStore'
import type { Good } from '@/domain/goodStore'
import { recipeStore } from '@/domain/recipeStore'
import type { Recipe, RecipeError } from '@/domain/recipeStore'

export type LineDraft = {
  goodName: string
  quantity: string
}

export class DesignModePresenter {
  private nameValue = ''
  private inputsValue: LineDraft[] = []
  private outputsValue: LineDraft[] = []
  private recipesValue = recipeStore.all()
  private errorsValue: RecipeError[] = []
  private editingIdValue: string | null = null
  private goodNameValue = ''
  private goodsValue = goodStore.all()
  private goodErrorValue: string | null = null
  private agentNameValue = ''
  private agentInventoryValue: LineDraft[] = []
  private agentErrorsValue: AgentError[] = []
  private agentsValue = agentStore.all()
  private listeners = new Set<() => void>()

  get name(): string {
    return this.nameValue
  }

  get inputs(): LineDraft[] {
    return this.inputsValue
  }

  get outputs(): LineDraft[] {
    return this.outputsValue
  }

  get recipes(): Recipe[] {
    return this.recipesValue
  }

  get errors(): RecipeError[] {
    return this.errorsValue
  }

  get editingId(): string | null {
    return this.editingIdValue
  }

  get goodName(): string {
    return this.goodNameValue
  }

  get goods(): Good[] {
    return this.goodsValue
  }

  get goodError(): string | null {
    return this.goodErrorValue
  }

  get agentName(): string {
    return this.agentNameValue
  }

  get agentInventory(): LineDraft[] {
    return this.agentInventoryValue
  }

  get agentErrors(): AgentError[] {
    return this.agentErrorsValue
  }

  get agents(): Agent[] {
    return this.agentsValue
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  setName(name: string): void {
    this.nameValue = name
    this.notify()
  }

  addInput(): void {
    this.inputsValue = [...this.inputsValue, { goodName: '', quantity: '' }]
    this.notify()
  }

  updateInput(index: number, field: keyof LineDraft, value: string): void {
    const next = [...this.inputsValue]
    next[index][field] = value
    this.inputsValue = next
    this.notify()
  }

  addOutput(): void {
    this.outputsValue = [...this.outputsValue, { goodName: '', quantity: '' }]
    this.notify()
  }

  updateOutput(index: number, field: keyof LineDraft, value: string): void {
    const next = [...this.outputsValue]
    next[index][field] = value
    this.outputsValue = next
    this.notify()
  }

  deleteRecipe(id: string): void {
    recipeStore.delete(id)
    this.recipesValue = recipeStore.all()
    this.notify()
  }

  startEdit(recipe: Recipe): void {
    this.editingIdValue = recipe.id
    this.nameValue = recipe.name
    this.inputsValue = recipe.inputs.map((line) => ({
      goodName: goodStore.get(line.goodId)?.name ?? '',
      quantity: String(line.quantity),
    }))
    this.outputsValue = recipe.outputs.map((line) => ({
      goodName: goodStore.get(line.goodId)?.name ?? '',
      quantity: String(line.quantity),
    }))
    this.notify()
  }

  submit(): void {
    const draft = {
      name: this.nameValue,
      inputs: this.inputsValue.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
      outputs: this.outputsValue.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
    }

    const result = this.editingIdValue
      ? recipeStore.update(this.editingIdValue, draft)
      : recipeStore.create(draft)

    if (result.ok) {
      this.recipesValue = recipeStore.all()
      this.goodsValue = goodStore.all()
      this.nameValue = ''
      this.inputsValue = []
      this.outputsValue = []
      this.editingIdValue = null
      this.errorsValue = []
    } else {
      this.errorsValue = result.errors
    }

    this.notify()
  }

  setGoodName(name: string): void {
    this.goodNameValue = name
    this.notify()
  }

  registerGood(): void {
    const result = goodStore.create(this.goodNameValue)
    if (result.ok) {
      this.goodsValue = goodStore.all()
      this.goodNameValue = ''
      this.goodErrorValue = null
    } else {
      this.goodErrorValue = 'El nombre no puede estar vacío'
    }
    this.notify()
  }

  setAgentName(name: string): void {
    this.agentNameValue = name
    this.notify()
  }

  addAgentInventoryLine(): void {
    this.agentInventoryValue = [...this.agentInventoryValue, { goodName: '', quantity: '' }]
    this.notify()
  }

  updateAgentInventoryLine(index: number, field: keyof LineDraft, value: string): void {
    const next = [...this.agentInventoryValue]
    next[index][field] = value
    this.agentInventoryValue = next
    this.notify()
  }

  submitAgent(): void {
    const result = agentStore.create({
      name: this.agentNameValue,
      inventory: this.agentInventoryValue.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
    })

    if (result.ok) {
      this.agentsValue = agentStore.all()
      this.goodsValue = goodStore.all()
      this.agentNameValue = ''
      this.agentInventoryValue = []
      this.agentErrorsValue = []
    } else {
      this.agentErrorsValue = result.errors
    }

    this.notify()
  }
}
