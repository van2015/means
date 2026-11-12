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

  it('exposes the goods from the store', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    expect(presenter.goods.map((good) => good.name)).toEqual(['Harina', 'Pan'])
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

  describe('priority drafts', () => {
    let ruleId: string

    beforeEach(() => {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return
      const good = stores.goodStore.findIdByName('Harina')
      expect(good.ok).toBe(true)
      if (!good.ok) return

      const rule = stores.agentStore.addRule(
        panaderoId,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: good.id, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
      if (!rule.ok) return
      ruleId = rule.rule.id

      presenter.possess(panaderoId)
    })

    it('falls back to the current priority when there is no draft', () => {
      expect(presenter.priorityDraft(ruleId, 1)).toBe('1')
    })

    it('keeps a draft per rule', () => {
      presenter.setPriorityDraft(ruleId, '5')

      expect(presenter.priorityDraft(ruleId, 1)).toBe('5')
      expect(presenter.error).toBeNull()
    })

    it('notifies subscribers when a draft changes', () => {
      let calls = 0
      presenter.subscribe(() => {
        calls++
      })

      presenter.setPriorityDraft(ruleId, '5')

      expect(calls).toBeGreaterThan(0)
    })

    it('applies a valid draft and clears it', () => {
      presenter.setPriorityDraft(ruleId, '0')

      presenter.submitPriority(ruleId)

      const agent = stores.agentStore.findById(panaderoId)
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      expect(agent.agent.rules[0].priority).toBe(0)
      expect(presenter.error).toBeNull()
      // draft cleared: falls back to the stored priority
      expect(presenter.priorityDraft(ruleId, 0)).toBe('0')
    })

    it('rejects an empty draft without touching the store', () => {
      presenter.setPriorityDraft(ruleId, '')

      presenter.submitPriority(ruleId)

      expect(presenter.error).toBe('La prioridad debe ser un número válido')
      const agent = stores.agentStore.findById(panaderoId)
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      expect(agent.agent.rules[0].priority).toBe(1)
    })

    it('rejects a non-numeric draft without touching the store', () => {
      presenter.setPriorityDraft(ruleId, 'abc')

      presenter.submitPriority(ruleId)

      expect(presenter.error).toBe('La prioridad debe ser un número válido')
      const agent = stores.agentStore.findById(panaderoId)
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      expect(agent.agent.rules[0].priority).toBe(1)
    })

    it('clears drafts when releasing the agent', () => {
      presenter.setPriorityDraft(ruleId, '5')

      presenter.release()

      expect(presenter.priorityDraft(ruleId, 1)).toBe('1')
    })
  })

  it('exposes catalog recipes for resolving rule recipe names', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')
    stores.recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    expect(presenter.catalogRecipes.map((recipe) => recipe.name)).toEqual(['Pan de harina'])
  })
})
