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
    goodStore.create('Harina')
    goodStore.create('Pan')

    const result = store.create({
      name: 'Panadero',
      inventory: [
        { goodName: 'Harina', quantity: 10 },
        { goodName: 'Pan', quantity: 5 },
      ],
    })

    expect(result.ok).toBe(true)
    expect(store.count()).toBe(1)

    const agentResult = store.findByName('Panadero')
    expect(agentResult.ok).toBe(true)
    if (!agentResult.ok) return

    const agent = agentResult.agent

    const flourResult = goodStore.findIdByName('Harina')
    const breadResult = goodStore.findIdByName('Pan')
    expect(flourResult.ok).toBe(true)
    expect(breadResult.ok).toBe(true)

    if (!flourResult.ok || !breadResult.ok) return

    const flourResult2 = goodStore.get(flourResult.id)
    const breadResult2 = goodStore.get(breadResult.id)
    expect(flourResult2.ok).toBe(true)
    expect(breadResult2.ok).toBe(true)

    if (!flourResult2.ok || !breadResult2.ok) return

    expect(agent.has(flourResult2.good, 10)).toBe(true)
    expect(agent.has(breadResult2.good, 5)).toBe(true)
  })

  it('rejects an agent with an empty name and leaves catalog unchanged', () => {
    goodStore.create('Harina')

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
    goodStore.create('Harina')
    goodStore.create('Pan')

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

  it('rejects unknown goods in inventory', () => {
    const result = store.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'UNKNOWN_GOOD', goodName: 'Harina' }])
    }
    expect(store.count()).toBe(0)
  })

  it('rejects duplicate agent names', () => {
    goodStore.create('Harina')

    const first = store.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    expect(first.ok).toBe(true)

    const second = store.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 5 }],
    })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.errors).toContainEqual({ code: 'AGENT_NAME_EXISTS' })
    }
    expect(store.count()).toBe(1)
  })
})
