import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { AgentRulePresenter } from '@/presentation/agentRulePresenter'

describe('AgentRulePresenter', () => {
  let stores: Stores
  let presenter: AgentRulePresenter
  let agentId: string
  let recipeId: string
  let goodId: string

  beforeEach(() => {
    stores = createStores()
    presenter = new AgentRulePresenter(stores)

    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    const recipe = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    if (!recipe.ok) throw new Error('Recipe creation failed')
    recipeId = recipe.recipe.id

    const goodResult = stores.goodStore.findIdByName('Harina')
    if (!goodResult.ok) throw new Error('Good not found')
    goodId = goodResult.id

    const agent = stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    if (!agent.ok) throw new Error('Agent creation failed')
    agentId = agent.agent.id

    presenter.setAgentId(agentId)
  })

  it('creates a rule with a good id condition', () => {
    presenter.setRecipeRef({ source: 'catalog', recipeId })
    presenter.setConditionGoodId(goodId)
    presenter.setConditionQuantity('2')
    presenter.setConditionOperator('AT_LEAST')
    presenter.setPriority('1')

    presenter.submit()

    const agent = stores.agentStore.findById(agentId)
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    expect(agent.agent.rules).toHaveLength(1)
    expect(agent.agent.rules[0].condition.goodId).toBe(goodId)
    expect(agent.agent.rules[0].condition.quantity).toBe(2)
    expect(presenter.conditionGoodId).toBe('')
  })

  it('shows validation errors for incomplete rules', () => {
    presenter.submit()

    expect(presenter.errors).toContainEqual({ code: 'NO_RECIPE' })
    expect(presenter.errors).toContainEqual({ code: 'NO_CONDITION_GOOD' })
    expect(presenter.errors).toContainEqual({ code: 'INVALID_CONDITION_QUANTITY' })
  })

  it('sorts rules by priority', () => {
    presenter.setRecipeRef({ source: 'catalog', recipeId })
    presenter.setConditionGoodId(goodId)
    presenter.setConditionQuantity('2')
    presenter.setConditionOperator('AT_LEAST')
    presenter.setPriority('2')
    presenter.submit()

    presenter.setRecipeRef({ source: 'catalog', recipeId })
    presenter.setConditionGoodId(goodId)
    presenter.setConditionQuantity('1')
    presenter.setConditionOperator('AT_LEAST')
    presenter.setPriority('1')
    presenter.submit()

    const agent = stores.agentStore.findById(agentId)
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    expect(agent.agent.rules[0].priority).toBe(1)
    expect(agent.agent.rules[1].priority).toBe(2)
  })
})
