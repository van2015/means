import type { DraftLine, Good } from './recipe'

import type { Recipe } from './recipe'

export type InventoryLine = {
  goodId: string
  quantity: number
}

export type AgentError =
  | { code: 'EMPTY_NAME' }
  | { code: 'INVALID_QUANTITY'; goodName: string }
  | { code: 'UNKNOWN_GOOD'; goodName: string }
  | { code: 'AGENT_NAME_EXISTS' }

export type AgentDraft = {
  name: string
  inventory: DraftLine[]
}

export type AgentResult = { ok: true; agent: Agent } | { ok: false; errors: AgentError[] }

export type RuleConditionOperator = 'AT_LEAST' | 'LESS_THAN'

export type RuleCondition = {
  goodId: string
  quantity: number
  operator: RuleConditionOperator
}

export type RuleRecipeRef = {
  source: 'catalog' | 'agent'
  recipeId: string
}

export type Rule = {
  id: string
  recipeRef: RuleRecipeRef
  condition: RuleCondition
  priority: number
}

export type RuleError =
  | { code: 'NO_RECIPE' }
  | { code: 'NO_CONDITION_GOOD' }
  | { code: 'INVALID_CONDITION_QUANTITY' }
  | { code: 'AGENT_NOT_FOUND' }
  | { code: 'RULE_NOT_FOUND' }

export class Agent {
  readonly id: string
  readonly name: string
  readonly inventory: InventoryLine[]
  readonly recipes: Recipe[]
  readonly rules: Rule[]

  constructor(
    id: string,
    name: string,
    inventory: InventoryLine[],
    recipes: Recipe[] = [],
    rules: Rule[] = [],
  ) {
    this.id = id
    this.name = name
    this.inventory = inventory
    this.recipes = recipes
    this.rules = rules
  }

  has(good: Good, quantity: number): boolean {
    return this.inventory.some((line) => line.goodId === good.id && line.quantity === quantity)
  }

  quantityOf(goodId: string): number {
    return this.inventory
      .filter((line) => line.goodId === goodId)
      .reduce((total, line) => total + line.quantity, 0)
  }
}

export function validateAgent(name: string, inventory: DraftLine[]): AgentError[] {
  const errors: AgentError[] = []

  if (name.trim() === '') {
    errors.push({ code: 'EMPTY_NAME' })
  }

  for (const line of inventory) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors.push({ code: 'INVALID_QUANTITY', goodName: line.goodName })
    }
  }

  return errors
}

export function validateRule(recipeId: string, condition: RuleCondition): RuleError[] {
  const errors: RuleError[] = []

  if (recipeId === '') {
    errors.push({ code: 'NO_RECIPE' })
  }

  if (condition.goodId.trim() === '') {
    errors.push({ code: 'NO_CONDITION_GOOD' })
  }

  if (!Number.isFinite(condition.quantity) || condition.quantity <= 0) {
    errors.push({ code: 'INVALID_CONDITION_QUANTITY' })
  }

  return errors
}
