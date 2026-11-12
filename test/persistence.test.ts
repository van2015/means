import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { loadWorld, saveWorld, WORLD_STORAGE_KEY } from '@/persistence'

describe('persistence', () => {
  let stores: Stores

  beforeEach(() => {
    localStorage.clear()
    stores = createStores()
  })

  function setupWorld(target: Stores) {
    target.goodStore.create('Harina')
    target.goodStore.create('Pan')
    const recipe = target.recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    const agent = target.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    const harina = target.goodStore.findIdByName('Harina')
    expect(harina.ok).toBe(true)
    if (!harina.ok || !recipe.ok) return
    target.agentStore.addRule(
      agent.agent.id,
      { source: 'catalog', recipeId: recipe.recipe.id },
      { goodId: harina.id, quantity: 5, operator: 'AT_LEAST' },
      1,
    )
  }

  it('saveWorld serializes the whole world as version-1 JSON', () => {
    setupWorld(stores)

    saveWorld(stores)

    const raw = localStorage.getItem(WORLD_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '{}')
    expect(parsed.version).toBe(1)
    expect(parsed.goods.map((g: { name: string }) => g.name).sort()).toEqual(['Harina', 'Pan'])
    expect(parsed.recipes.map((r: { name: string }) => r.name)).toEqual(['Pan de harina'])
    expect(parsed.agents.map((a: { name: string }) => a.name)).toEqual(['Panadero'])
    expect(parsed.agents[0].rules).toHaveLength(1)
  })

  it('saveWorld on an empty world persists an empty world', () => {
    saveWorld(stores)

    const parsed = JSON.parse(localStorage.getItem(WORLD_STORAGE_KEY) ?? 'null')
    expect(parsed).toMatchObject({ version: 1, goods: [], recipes: [], agents: [] })
  })

  it('loadWorld restores a saved world into empty stores', () => {
    setupWorld(stores)
    saveWorld(stores)

    const fresh = createStores()
    const loaded = loadWorld(fresh)

    expect(loaded).toBe(true)
    expect(
      fresh.goodStore
        .all()
        .map((g) => g.name)
        .sort(),
    ).toEqual(['Harina', 'Pan'])
    expect(fresh.recipeStore.count()).toBe(1)
    expect(fresh.agentStore.count()).toBe(1)
    const agent = fresh.agentStore.findByName('Panadero')
    expect(agent.ok).toBe(true)
    if (agent.ok) {
      expect(agent.agent.inventory).toHaveLength(1)
      expect(agent.agent.rules).toHaveLength(1)
      expect(agent.agent.rules[0].priority).toBe(1)
    }
  })

  it('loadWorld returns false when nothing was saved and leaves stores empty', () => {
    const loaded = loadWorld(stores)

    expect(loaded).toBe(false)
    expect(stores.goodStore.all()).toHaveLength(0)
    expect(stores.recipeStore.count()).toBe(0)
    expect(stores.agentStore.count()).toBe(0)
  })

  it('loadWorld ignores corrupt JSON without touching the stores', () => {
    localStorage.setItem(WORLD_STORAGE_KEY, '{not json')

    const loaded = loadWorld(stores)

    expect(loaded).toBe(false)
    expect(stores.goodStore.all()).toHaveLength(0)
  })

  it('loadWorld rejects an unsupported version without touching the stores', () => {
    localStorage.setItem(
      WORLD_STORAGE_KEY,
      JSON.stringify({ version: 99, goods: [{ name: 'Trigo' }], recipes: [], agents: [] }),
    )

    const loaded = loadWorld(stores)

    expect(loaded).toBe(false)
    expect(stores.goodStore.all()).toHaveLength(0)
  })

  it('saveWorld never throws when localStorage rejects writes', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => saveWorld(stores)).not.toThrow()

    setItem.mockRestore()
  })

  it('saveWorld skips the write when the stored payload is unchanged', () => {
    setupWorld(stores)
    saveWorld(stores)

    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    saveWorld(stores)

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('save then load roundtrips a world through a reload simulation', () => {
    setupWorld(stores)
    saveWorld(stores)

    // simulate the browser session ending: new stores from scratch
    const reloaded = createStores()
    expect(loadWorld(reloaded)).toBe(true)

    // and saving the reloaded world produces an equivalent payload
    const before = localStorage.getItem(WORLD_STORAGE_KEY)
    saveWorld(reloaded)
    expect(localStorage.getItem(WORLD_STORAGE_KEY)).toBe(before)
  })
})
