import { beforeEach, describe, expect, it } from 'vitest'
import { Agent } from '@/domain/agent'
import { evaluateRule, applicableRules } from '@/domain/ruleEngine'
import { createStores, type Stores } from '@/domain/stores'

describe('rule engine', () => {
  let stores: Stores
  let agent: Agent
  let goodId: string

  beforeEach(() => {
    stores = createStores()
    const good = stores.goodStore.resolve('Harina')
    goodId = good.id
    agent = new Agent('1', 'Panadero', [{ goodId, quantity: 5 }])
  })

  it('returns true when inventory is at least the threshold', () => {
    const rule = {
      id: 'r1',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-1' },
      condition: { goodId, quantity: 5, operator: 'AT_LEAST' as const },
      priority: 1,
    }

    expect(evaluateRule(agent, rule)).toBe(true)
  })

  it('returns false when inventory is below the at-least threshold', () => {
    const rule = {
      id: 'r1',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-1' },
      condition: { goodId, quantity: 6, operator: 'AT_LEAST' as const },
      priority: 1,
    }

    expect(evaluateRule(agent, rule)).toBe(false)
  })

  it('returns true when inventory is less than the threshold', () => {
    const rule = {
      id: 'r1',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-1' },
      condition: { goodId, quantity: 6, operator: 'LESS_THAN' as const },
      priority: 1,
    }

    expect(evaluateRule(agent, rule)).toBe(true)
  })

  it('sums quantities across multiple inventory lines', () => {
    agent = new Agent('1', 'Panadero', [
      { goodId, quantity: 2 },
      { goodId, quantity: 3 },
    ])
    const rule = {
      id: 'r1',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-1' },
      condition: { goodId, quantity: 5, operator: 'AT_LEAST' as const },
      priority: 1,
    }

    expect(evaluateRule(agent, rule)).toBe(true)
  })

  it('returns only rules whose conditions are met', () => {
    const met = {
      id: 'met',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-1' },
      condition: { goodId, quantity: 3, operator: 'AT_LEAST' as const },
      priority: 1,
    }
    const unmet = {
      id: 'unmet',
      recipeRef: { source: 'catalog' as const, recipeId: 'recipe-2' },
      condition: { goodId, quantity: 10, operator: 'AT_LEAST' as const },
      priority: 2,
    }
    agent = new Agent('1', 'Panadero', [{ goodId, quantity: 5 }], [], [met, unmet])

    const rules = applicableRules(agent)

    expect(rules).toHaveLength(1)
    expect(rules[0].id).toBe('met')
  })
})
