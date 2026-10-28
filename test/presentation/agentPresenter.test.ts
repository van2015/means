import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { AgentPresenter } from '@/presentation/agentPresenter'

describe('AgentPresenter', () => {
  let stores: Stores
  let presenter: AgentPresenter

  beforeEach(() => {
    stores = createStores()
    presenter = new AgentPresenter(stores)
  })

  it('creates an agent with inventory', () => {
    presenter.setName('Panadero')
    presenter.addInventoryLine()
    presenter.updateInventoryLine(0, 'goodName', 'Harina')
    presenter.updateInventoryLine(0, 'quantity', '10')

    presenter.submit()

    expect(presenter.agents).toHaveLength(1)
    expect(presenter.agents[0].name).toBe('Panadero')
    expect(presenter.name).toBe('')
    expect(presenter.errors).toEqual([])
  })

  it('shows validation errors and does not create the agent', () => {
    presenter.addInventoryLine()
    presenter.updateInventoryLine(0, 'goodName', 'Harina')
    presenter.updateInventoryLine(0, 'quantity', '0')

    presenter.submit()

    expect(presenter.errors).toEqual([
      { code: 'EMPTY_NAME' },
      { code: 'INVALID_QUANTITY', goodName: 'Harina' },
    ])
    expect(presenter.agents).toHaveLength(0)
  })

  it('selects an agent and switches to recipe view by default', () => {
    const created = stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    presenter.selectAgent(created.agent.id)

    expect(presenter.selectedAgentId).toBe(created.agent.id)
    expect(presenter.selectedAgentView).toBe('recipes')
  })

  it('switches to rules view', () => {
    const created = stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    presenter.selectAgentRules(created.agent.id)

    expect(presenter.selectedAgentId).toBe(created.agent.id)
    expect(presenter.selectedAgentView).toBe('rules')
  })
})
