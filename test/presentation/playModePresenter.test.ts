import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { PlayModePresenter } from '@/presentation/playModePresenter'

describe('PlayModePresenter', () => {
  let stores: Stores
  let presenter: PlayModePresenter
  let panaderoId: string

  beforeEach(() => {
    stores = createStores()
    presenter = new PlayModePresenter(stores)

    const panadero = stores.agentStore.create({ name: 'Panadero', inventory: [] })
    const obrero = stores.agentStore.create({ name: 'Obrero', inventory: [] })
    if (!panadero.ok || !obrero.ok) throw new Error('Agent creation failed')
    panaderoId = panadero.agent.id
  })

  it('exposes the agents from the store', () => {
    expect(presenter.agents.map((agent) => agent.name)).toEqual(['Panadero', 'Obrero'])
    expect(presenter.possessedAgentId).toBeNull()
    expect(presenter.possessedAgent).toBeNull()
    expect(presenter.error).toBeNull()
  })

  it('possesses an agent and reflects the change', () => {
    presenter.possess(panaderoId)

    expect(presenter.possessedAgentId).toBe(panaderoId)
    expect(presenter.possessedAgent?.name).toBe('Panadero')
    expect(presenter.error).toBeNull()
  })

  it('notifies subscribers when possession changes', () => {
    let calls = 0
    presenter.subscribe(() => {
      calls++
    })

    presenter.possess(panaderoId)

    expect(calls).toBeGreaterThan(0)
  })

  it('surfaces an error when possessing a nonexistent agent', () => {
    presenter.possess('no-such-agent')

    expect(presenter.error).toBe('Agente no encontrado')
    expect(presenter.possessedAgentId).toBeNull()
  })

  it('clears the error on a successful possession', () => {
    presenter.possess('no-such-agent')
    expect(presenter.error).toBe('Agente no encontrado')

    presenter.possess(panaderoId)

    expect(presenter.error).toBeNull()
    expect(presenter.possessedAgentId).toBe(panaderoId)
  })

  it('releases the possessed agent', () => {
    presenter.possess(panaderoId)

    presenter.release()

    expect(presenter.possessedAgentId).toBeNull()
    expect(presenter.possessedAgent).toBeNull()
    expect(presenter.error).toBeNull()
  })
})
