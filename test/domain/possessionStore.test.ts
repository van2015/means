import { beforeEach, describe, expect, it } from 'vitest'
import { AgentStore } from '@/domain/agentStore'
import { GoodStore } from '@/domain/goodStore'
import { PossessionStore } from '@/domain/possessionStore'
import { RecipeStore } from '@/domain/recipeStore'

describe('PossessionStore', () => {
  let agentStore: AgentStore
  let store: PossessionStore
  let panaderoId: string
  let obreroId: string

  beforeEach(() => {
    const goodStore = new GoodStore()
    agentStore = new AgentStore(goodStore, new RecipeStore(goodStore))
    store = new PossessionStore(agentStore)

    const panadero = agentStore.create({ name: 'Panadero', inventory: [] })
    const obrero = agentStore.create({ name: 'Obrero', inventory: [] })
    if (!panadero.ok || !obrero.ok) throw new Error('Agent creation failed')
    panaderoId = panadero.agent.id
    obreroId = obrero.agent.id
  })

  it('starts with no possessed agent', () => {
    expect(store.possessedAgentId()).toBeNull()
    expect(store.possessed()).toBeNull()
  })

  it('possesses an existing agent', () => {
    const result = store.possess(panaderoId)

    expect(result).toEqual({ ok: true })
    expect(store.possessedAgentId()).toBe(panaderoId)
    expect(store.possessed()?.name).toBe('Panadero')
  })

  it('rejects possessing a nonexistent agent without changing the state', () => {
    store.possess(panaderoId)

    const result = store.possess('no-such-agent')

    expect(result).toEqual({ ok: false, error: 'AGENT_NOT_FOUND' })
    expect(store.possessedAgentId()).toBe(panaderoId)
    expect(store.possessed()?.name).toBe('Panadero')
  })

  it('replaces the possessed agent when possessing another one', () => {
    store.possess(panaderoId)

    const result = store.possess(obreroId)

    expect(result).toEqual({ ok: true })
    expect(store.possessedAgentId()).toBe(obreroId)
    expect(store.possessed()?.name).toBe('Obrero')
  })

  it('release clears the possession', () => {
    store.possess(panaderoId)

    store.release()

    expect(store.possessedAgentId()).toBeNull()
    expect(store.possessed()).toBeNull()
  })

  it('reset clears the possession', () => {
    store.possess(panaderoId)

    store.reset()

    expect(store.possessedAgentId()).toBeNull()
  })

  it('returns a null possession when the possessed agent no longer exists', () => {
    store.possess(panaderoId)

    // remove the agent directly from the store (no deletion flow exists yet)
    const agents = agentStore.all()
    const index = agents.findIndex((agent) => agent.id === panaderoId)
    agents.splice(index, 1)

    expect(store.possessedAgentId()).toBe(panaderoId)
    expect(store.possessed()).toBeNull()
  })
})
