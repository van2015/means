import type { Good, GoodStore } from '@/domain/goodStore'
import type { Recipe, RecipeDraft, RecipeError, RecipeResult } from '@/domain/recipeStore'
import { RecipeStore } from '@/domain/recipeStore'
import { Presenter } from './presenter'
import { removeLineAt, type LineDraft } from './lineDraft'

export class RecipePresenter extends Presenter {
  private recipeStore: RecipeStore
  private goodStore: GoodStore
  private nameValue = ''
  private inputsValue: LineDraft[] = []
  private outputsValue: LineDraft[] = []
  private errorsValue: RecipeError[] = []
  private editingIdValue: string | null = null

  constructor(stores: { recipeStore: RecipeStore; goodStore: GoodStore }) {
    super()
    this.recipeStore = stores.recipeStore
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

  get recipes(): Recipe[] {
    return this.recipeStore.all()
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
    this.inputsValue = [...this.inputsValue, { goodName: '', quantity: '' }]
    this.notify()
  }

  updateInput(index: number, field: keyof LineDraft, value: string): void {
    const next = [...this.inputsValue]
    next[index][field] = value
    this.inputsValue = next
    this.notify()
  }

  removeInput(index: number): void {
    this.inputsValue = removeLineAt(this.inputsValue, index)
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

  removeOutput(index: number): void {
    this.outputsValue = removeLineAt(this.outputsValue, index)
    this.notify()
  }

  deleteRecipe(id: string): void {
    this.recipeStore.delete(id)
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
    const draft = this.buildDraft()
    const result: RecipeResult = this.editingIdValue
      ? this.recipeStore.update(this.editingIdValue, draft)
      : this.recipeStore.create(draft)

    if (result.ok) {
      this.resetForm()
    } else {
      this.errorsValue = result.errors
    }

    this.notify()
  }

  private buildDraft(): RecipeDraft {
    return {
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
  }

  private toLineDraft(line: { goodId: string; quantity: number }): LineDraft {
    const result = this.goodStore.get(line.goodId)
    return {
      goodName: result.ok ? result.good.name : '',
      quantity: String(line.quantity),
    }
  }

  private resetForm(): void {
    this.nameValue = ''
    this.inputsValue = []
    this.outputsValue = []
    this.editingIdValue = null
    this.errorsValue = []
  }
}
