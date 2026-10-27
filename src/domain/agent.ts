import type { DraftLine, Good, RecipeLine } from './recipe'

export type AgentError =
  | { code: 'EMPTY_NAME' }
  | { code: 'INVALID_QUANTITY'; goodName: string }

export type AgentDraft = {
  name: string
  inventory: DraftLine[]
}

export type AgentResult =
  | { ok: true; agent: Agent }
  | { ok: false; errors: AgentError[] }

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

export function validateAgent(name: string, inventory: DraftLine[]): AgentError[] {
  const errors: AgentError[] = []

  if (name.trim() === '') {
    errors.push({ code: 'EMPTY_NAME' })
  }

  for (const line of inventory) {
    if (line.quantity <= 0) {
      errors.push({ code: 'INVALID_QUANTITY', goodName: line.goodName })
    }
  }

  return errors
}
