import { beforeEach, describe, expect, it } from 'vitest'
import { AgentStore } from '@/domain/agentStore'
import { GoodStore } from '@/domain/goodStore'

describe('AgentStore', () => {
  let goodStore: GoodStore
  let store: AgentStore

  beforeEach(() => {
    goodStore = new GoodStore()
    store = new AgentStore(goodStore)
  })

  it('saves a valid agent with name and initial inventory', () => {
    const result = store.create({
      name: 'Panadero',
      inventory: [
        { goodName: 'Harina', quantity: 10 },
        { goodName: 'Pan', quantity: 5 },
      ],
    })

    expect(result.ok).toBe(true)
    expect(store.count()).toBe(1)

    const agent = store.findByName('Panadero')
    expect(agent).toBeDefined()

    const flourId = goodStore.findIdByName('Harina')
    const breadId = goodStore.findIdByName('Pan')
    expect(flourId).toBeDefined()
    expect(breadId).toBeDefined()

    if (agent && flourId && breadId) {
      const flour = goodStore.get(flourId)
      const bread = goodStore.get(breadId)
      expect(flour).toBeDefined()
      expect(bread).toBeDefined()

      if (flour && bread) {
        expect(agent.has(flour, 10)).toBe(true)
        expect(agent.has(bread, 5)).toBe(true)
      }
    }
  })

  it('rejects an agent with an empty name and leaves catalog unchanged', () => {
    const result = store.create({
      name: '',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'EMPTY_NAME' }])
    }

    expect(store.count()).toBe(0)
  })

  it('rejects non-positive quantities and leaves catalog unchanged', () => {
    const result = store.create({
      name: 'Panadero',
      inventory: [
        { goodName: 'Harina', quantity: 0 },
        { goodName: 'Pan', quantity: -1 },
      ],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: 'INVALID_QUANTITY', goodName: 'Harina' },
        { code: 'INVALID_QUANTITY', goodName: 'Pan' },
      ])
    }

    expect(store.count()).toBe(0)
  })
})
