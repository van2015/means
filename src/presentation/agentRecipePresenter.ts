import type { AgentStore } from '@/domain/agentStore'
import type { Good, GoodStore } from '@/domain/goodStore'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from '@/domain/recipeStore'
import { Presenter } from './presenter'
import { createLineDraft, type LineDraft, type LineDraftField } from './lineDraft'

export class AgentRecipePresenter extends Presenter {
  private agentStore: AgentStore
  private goodStore: GoodStore
  private nameValue = ''
  private inputsValue: LineDraft[] = []
  private outputsValue: LineDraft[] = []
  private errorsValue: RecipeError[] = []
  private editingIdValue: string | null = null
  private agentIdValue: string | null = null

  constructor(stores: { agentStore: AgentStore; goodStore: GoodStore }) {
    super()
    this.agentStore = stores.agentStore
    this.goodStore = stores.goodStore
  }

  get name(): string {
    return this.nameValue
  }

  get inputs(): LineDraft[] {
    return this.inputsValue
  }

  get outputs(): LineDraft[] {
    return this.outputsValue
  }

  get errors(): RecipeError[] {
    return this.errorsValue
  }

  get editingId(): string | null {
    return this.editingIdValue
  }

  get goods(): Good[] {
    return this.goodStore.all()
  }

  setName(name: string): void {
    this.nameValue = name
    this.notify()
  }

  addInput(): void {
    this.inputsValue = [...this.inputsValue, createLineDraft()]
    this.notify()
  }

  updateInput(index: number, field: LineDraftField, value: string): void {
    const next = [...this.inputsValue]
    next[index][field] = value
    this.inputsValue = next
    this.notify()
  }

  addOutput(): void {
    this.outputsValue = [...this.outputsValue, createLineDraft()]
    this.notify()
  }

  updateOutput(index: number, field: LineDraftField, value: string): void {
    const next = [...this.outputsValue]
    next[index][field] = value
    this.outputsValue = next
    this.notify()
  }

  setAgentId(agentId: string | null): void {
    this.agentIdValue = agentId
    if (agentId === null) {
      this.resetForm()
    }
    this.notify()
  }

  startEdit(recipe: Recipe): void {
    this.editingIdValue = recipe.id
    this.nameValue = recipe.name
    this.inputsValue = recipe.inputs.map((line) => this.toLineDraft(line))
    this.outputsValue = recipe.outputs.map((line) => this.toLineDraft(line))
    this.errorsValue = []
    this.notify()
  }

  submit(): void {
    if (!this.agentIdValue) return

    const draft: RecipeDraft = {
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

    const result: RecipeResult = this.editingIdValue
      ? this.agentStore.updateRecipe(this.agentIdValue, this.editingIdValue, draft)
      : this.agentStore.addRecipe(this.agentIdValue, draft)

    if (result.ok) {
      this.resetForm()
    } else {
      this.errorsValue = result.errors
    }

    this.notify()
  }

  deleteRecipe(recipeId: string): void {
    if (!this.agentIdValue) return
    this.agentStore.deleteRecipe(this.agentIdValue, recipeId)
    this.notify()
  }

  private toLineDraft(line: { goodId: string; quantity: number }): LineDraft {
    const result = this.goodStore.get(line.goodId)
    return createLineDraft(result.ok ? result.good.name : '', String(line.quantity))
  }

  private resetForm(): void {
    this.nameValue = ''
    this.inputsValue = []
    this.outputsValue = []
    this.editingIdValue = null
    this.errorsValue = []
  }
}
