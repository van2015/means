import type { Good, GoodStore } from '@/domain/goodStore'
import { Presenter } from './presenter'

export class GoodPresenter extends Presenter {
  private goodStore: GoodStore
  private goodNameValue = ''
  private goodErrorValue: string | null = null

  constructor(stores: { goodStore: GoodStore }) {
    super()
    this.goodStore = stores.goodStore
  }

  get goodName(): string {
    return this.goodNameValue
  }

  get goods(): Good[] {
    return this.goodStore.all()
  }

  get goodError(): string | null {
    return this.goodErrorValue
  }

  setGoodName(name: string): void {
    this.goodNameValue = name
    this.notify()
  }

  registerGood(): void {
    const result = this.goodStore.create(this.goodNameValue)
    if (result.ok) {
      this.goodNameValue = ''
      this.goodErrorValue = null
    } else {
      this.goodErrorValue = 'El nombre no puede estar vacío'
    }
    this.notify()
  }
}
