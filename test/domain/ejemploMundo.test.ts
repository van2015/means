import { describe, expect, it } from 'vitest'
import { createStores } from '@/domain/stores'
import { importWorld } from '@/domain/worldTransfer'
// the sample world ships as documentation: this test guarantees it always
// passes the real import validation as the format evolves
import exampleJson from '../../docs/ejemplo-mundo.json?raw'

describe('docs/ejemplo-mundo.json', () => {
  it('is valid JSON with the export version', () => {
    const parsed = JSON.parse(exampleJson)
    expect(parsed).toMatchObject({ version: 1 })
    expect(Array.isArray(parsed.goods)).toBe(true)
    expect(Array.isArray(parsed.recipes)).toBe(true)
    expect(Array.isArray(parsed.agents)).toBe(true)
  })

  it('imports into an empty world with the expected summary', () => {
    const stores = createStores()

    const result = importWorld(stores, exampleJson)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.goods).toEqual({ added: 11, skipped: 0 })
    // 7 catalog recipes + 3 agent-specific recipes
    expect(result.summary.recipes).toEqual({ added: 10, skipped: 0 })
    expect(result.summary.agents).toEqual({ added: 3, skipped: 0 })
    expect(result.summary.rules).toEqual({ added: 6, skipped: 0 })
  })

  it('recreates agents with inventory, own recipes and rules', () => {
    const stores = createStores()
    expect(importWorld(stores, exampleJson).ok).toBe(true)

    const herrero = stores.agentStore.findByName('Herrero')
    expect(herrero.ok).toBe(true)
    if (!herrero.ok) return

    const hierro = stores.goodStore.findIdByName('Hierro')
    expect(hierro.ok).toBe(true)
    if (!hierro.ok) return
    expect(herrero.agent.quantityOf(hierro.id)).toBe(15)

    expect(herrero.agent.recipes.map((recipe) => recipe.name)).toEqual(['Hacha ligera'])
    expect(herrero.agent.rules).toHaveLength(2)
    expect(herrero.agent.rules.map((rule) => rule.priority)).toEqual([1, 2])
    expect(herrero.agent.rules[0].recipeRef.source).toBe('catalog')
    expect(herrero.agent.rules[1].recipeRef.source).toBe('agent')
    expect(herrero.agent.rules[1].condition.operator).toBe('AT_LEAST')
  })

  it('is idempotent: a second import skips everything', () => {
    const stores = createStores()
    expect(importWorld(stores, exampleJson).ok).toBe(true)

    const second = importWorld(stores, exampleJson)

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.summary.goods.added).toBe(0)
    expect(second.summary.agents.added).toBe(0)
    expect(second.summary.rules.added).toBe(0)
    expect(stores.agentStore.count()).toBe(3)
  })
})
