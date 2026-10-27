import { recipeStore } from '@/domain/recipeStore'
import type { Good, Recipe, RecipeError } from '@/domain/recipeStore'

export type LineDraft = {
  goodName: string
  quantity: string
}

export class DesignModePresenter {
  private nameValue = ''
  private inputsValue: LineDraft[] = []
  private outputsValue: LineDraft[] = []
  private recipesValue = recipeStore.getRecipes()
  private errorsValue: RecipeError[] = []
  private editingIdValue: string | null = null
  private goodNameValue = ''
  private goodsValue = recipeStore.getGoods()
  private goodErrorValue: string | null = null
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
    recipeStore.deleteRecipe(id)
    this.recipesValue = recipeStore.getRecipes()
    this.notify()
  }

  startEdit(recipe: Recipe): void {
    this.editingIdValue = recipe.id
    this.nameValue = recipe.name
    this.inputsValue = recipe.inputs.map((line) => ({
      goodName: recipeStore.getGood(line.goodId)?.name ?? '',
      quantity: String(line.quantity),
    }))
    this.outputsValue = recipe.outputs.map((line) => ({
      goodName: recipeStore.getGood(line.goodId)?.name ?? '',
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
      ? recipeStore.updateRecipe(this.editingIdValue, draft)
      : recipeStore.createRecipe(draft)

    if (result.ok) {
      this.recipesValue = recipeStore.getRecipes()
      this.goodsValue = recipeStore.getGoods()
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
    const result = recipeStore.createGood(this.goodNameValue)
    if (result.ok) {
      this.goodsValue = recipeStore.getGoods()
      this.goodNameValue = ''
      this.goodErrorValue = null
    } else {
      this.goodErrorValue = 'El nombre no puede estar vacío'
    }
    this.notify()
  }
}
