import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { AgentRecipePresenter } from '@/presentation/agentRecipePresenter'

describe('AgentRecipePresenter', () => {
  let stores: Stores
  let presenter: AgentRecipePresenter
  let agentId: string

  beforeEach(() => {
    stores = createStores()
    presenter = new AgentRecipePresenter(stores)
    stores.goodStore.create('Harina')
    const created = stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    if (!created.ok) throw new Error('Agent creation failed')
    agentId = created.agent.id
    presenter.setAgentId(agentId)
  })

  it('creates an agent-specific recipe', () => {
    stores.goodStore.create('Pan')

    presenter.setName('Pan artesanal')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina')
    presenter.updateInput(0, 'quantity', '2')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')

    presenter.submit()

    const agent = stores.agentStore.findById(agentId)
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    expect(agent.agent.recipes).toHaveLength(1)
    expect(agent.agent.recipes[0].name).toBe('Pan artesanal')
    expect(presenter.name).toBe('')
  })

  it('shows validation errors for invalid recipes', () => {
    presenter.submit()

    expect(presenter.errors).toContainEqual({ code: 'NO_INPUTS' })
    expect(presenter.errors).toContainEqual({ code: 'NO_OUTPUTS' })
  })

  it('does not submit when no agent is selected', () => {
    presenter.setAgentId(null)
    stores.goodStore.create('Pan')
    presenter.setName('Receta huérfana')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina')
    presenter.updateInput(0, 'quantity', '1')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')

    presenter.submit()

    const agent = stores.agentStore.findById(agentId)
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    expect(agent.agent.recipes).toHaveLength(0)
  })

  it('rejects unknown goods', () => {
    presenter.setName('Pan artesanal')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina desconocida')
    presenter.updateInput(0, 'quantity', '1')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')

    presenter.submit()

    expect(presenter.errors).toContainEqual({
      code: 'UNKNOWN_GOOD',
      goodName: 'Harina desconocida',
    })
  })

  it('removes an input line and clears validation errors', () => {
    presenter.setName('Pan artesanal')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina')
    presenter.updateInput(0, 'quantity', '1')
    presenter.addInput()
    presenter.updateInput(1, 'goodName', 'Desconocido')
    presenter.updateInput(1, 'quantity', '1')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')

    presenter.submit()
    expect(presenter.errors).toContainEqual({ code: 'UNKNOWN_GOOD', goodName: 'Desconocido' })

    presenter.removeInput(1)

    expect(presenter.inputs).toHaveLength(1)
    expect(presenter.inputs[0].goodName).toBe('Harina')
    expect(presenter.errors).toEqual([])
  })

  it('removes an output line and clears validation errors', () => {
    presenter.setName('Pan artesanal')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina')
    presenter.updateInput(0, 'quantity', '1')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')
    presenter.addOutput()
    presenter.updateOutput(1, 'goodName', 'Desconocido')
    presenter.updateOutput(1, 'quantity', '1')

    presenter.submit()
    expect(presenter.errors).toContainEqual({ code: 'UNKNOWN_GOOD', goodName: 'Desconocido' })

    presenter.removeOutput(1)

    expect(presenter.outputs).toHaveLength(1)
    expect(presenter.outputs[0].goodName).toBe('Pan')
    expect(presenter.errors).toEqual([])
  })

  it('rejects a duplicate recipe name within the same agent', () => {
    stores.goodStore.create('Pan')

    const submitRecipe = (name: string, quantity: string) => {
      presenter.setName(name)
      presenter.addInput()
      presenter.updateInput(0, 'goodName', 'Harina')
      presenter.updateInput(0, 'quantity', quantity)
      presenter.addOutput()
      presenter.updateOutput(0, 'goodName', 'Pan')
      presenter.updateOutput(0, 'quantity', '1')
      presenter.submit()
    }

    submitRecipe('Horneado', '1')
    submitRecipe('Horneado', '2')

    expect(presenter.errors).toContainEqual({ code: 'RECIPE_NAME_EXISTS' })

    const agent = stores.agentStore.findById(agentId)
    expect(agent.ok).toBe(true)
    if (agent.ok) expect(agent.agent.recipes).toHaveLength(1)
  })
})
