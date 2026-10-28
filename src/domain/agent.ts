import type { DraftLine, Good, RecipeLine } from './recipe'

import type { Recipe } from './recipe'

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

export type RuleConditionOperator = 'AT_LEAST' | 'LESS_THAN'

export type RuleCondition = {
  goodName: string
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

export class Agent {
  readonly id: string
  readonly name: string
  readonly inventory: RecipeLine[]
  readonly recipes: Recipe[]
  readonly rules: Rule[]

  constructor(
    id: string,
    name: string,
    inventory: RecipeLine[],
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

export function validateRule(recipeId: string, condition: RuleCondition): RuleError[] {
  const errors: RuleError[] = []

  if (recipeId === '') {
    errors.push({ code: 'NO_RECIPE' })
  }

  if (condition.goodName.trim() === '') {
    errors.push({ code: 'NO_CONDITION_GOOD' })
  }

  if (condition.quantity <= 0) {
    errors.push({ code: 'INVALID_CONDITION_QUANTITY' })
  }

  return errors
}
