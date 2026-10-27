import type { Good, RecipeLine } from './recipe'

export class Agent {
  readonly id: string
  readonly name: string
  readonly inventory: RecipeLine[]

  constructor(id: string, name: string, inventory: RecipeLine[]) {
    this.id = id
    this.name = name
    this.inventory = inventory
  }

  has(good: Good, quantity: number): boolean {
    return this.inventory.some(
      (line) => line.goodId === good.id && line.quantity === quantity,
    )
  }
}
