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

  describe('produce', () => {
    let recipeId: string
    let flourId: string
    let panId: string

    beforeEach(() => {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')

      const flour = stores.goodStore.findIdByName('Harina')
      const pan = stores.goodStore.findIdByName('Pan')
      expect(flour.ok && pan.ok).toBe(true)
      if (!flour.ok || !pan.ok) return
      flourId = flour.id
      panId = pan.id

      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return
      recipeId = recipe.recipe.id

      const agent = stores.agentStore.create({
        name: 'Productor',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      presenter.possess(agent.agent.id)
    })

    it('produces and clears the error', () => {
      presenter.produce({ source: 'catalog', recipeId })

      expect(presenter.error).toBeNull()
      expect(presenter.possessedAgent?.quantityOf(flourId)).toBe(8)
      expect(presenter.possessedAgent?.quantityOf(panId)).toBe(1)
    })

    it('notifies subscribers after producing', () => {
      let calls = 0
      presenter.subscribe(() => {
        calls++
      })

      presenter.produce({ source: 'catalog', recipeId })

      expect(calls).toBeGreaterThan(0)
    })

    it('propagates the insufficient-material message without changing the inventory', () => {
      // drain the flour with four productions
      presenter.produce({ source: 'catalog', recipeId })
      presenter.produce({ source: 'catalog', recipeId })
      presenter.produce({ source: 'catalog', recipeId })
      presenter.produce({ source: 'catalog', recipeId })
      expect(presenter.possessedAgent?.quantityOf(flourId)).toBe(2)

      presenter.produce({ source: 'catalog', recipeId })
      expect(presenter.possessedAgent?.quantityOf(flourId)).toBe(0)

      presenter.produce({ source: 'catalog', recipeId })

      expect(presenter.error).toBe('Falta Harina: necesitas 2, tienes 0')
      expect(presenter.possessedAgent?.quantityOf(flourId)).toBe(0)
      expect(presenter.possessedAgent?.quantityOf(panId)).toBe(5)
    })

    it('does nothing when no agent is possessed', () => {
      presenter.release()

      presenter.produce({ source: 'catalog', recipeId })

      expect(presenter.error).toBeNull()
      const agent = stores.agentStore.findByName('Productor')
      expect(agent.ok).toBe(true)
      if (agent.ok) expect(agent.agent.quantityOf(flourId)).toBe(10)
    })

    it('surfaces RECIPE_NOT_FOUND for an unknown recipe', () => {
      presenter.produce({ source: 'catalog', recipeId: 'no-such-recipe' })

      expect(presenter.error).toBe('Receta no encontrada')
    })
  })

  describe('tick', () => {
    let bakerId: string
    let flourId: string
    let panId: string
    let ruleId: string

    beforeEach(() => {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')

      const flour = stores.goodStore.findIdByName('Harina')
      const pan = stores.goodStore.findIdByName('Pan')
      expect(flour.ok && pan.ok).toBe(true)
      if (!flour.ok || !pan.ok) return
      flourId = flour.id
      panId = pan.id

      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = stores.agentStore.create({
        name: 'Horneador',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      bakerId = baker.agent.id

      const rule = stores.agentStore.addRule(
        bakerId,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: flourId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
      if (!rule.ok) return
      ruleId = rule.rule.id
    })

    it('produces for non-possessed agents and returns the count', () => {
      const count = presenter.tick()

      expect(count).toBe(1)
      const baker = stores.agentStore.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      expect(baker.agent.quantityOf(flourId)).toBe(8)
      expect(baker.agent.quantityOf(panId)).toBe(1)
    })

    it('does not run rules for the possessed agent', () => {
      presenter.possess(bakerId)

      const count = presenter.tick()

      expect(count).toBe(0)
      const baker = stores.agentStore.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      expect(baker.agent.quantityOf(flourId)).toBe(10)
    })

    it('notifies subscribers only when something was produced', () => {
      presenter.possess(bakerId)

      let calls = 0
      presenter.subscribe(() => {
        calls++
      })

      // possessed: the tick must not re-render
      presenter.tick()
      expect(calls).toBe(0)

      presenter.release()
      calls = 0
      presenter.tick()
      expect(calls).toBeGreaterThan(0)
    })

    it('never sets an error', () => {
      presenter.tick()
      presenter.possess(bakerId)
      presenter.tick()

      expect(presenter.error).toBeNull()
    })

    it('a second tick keeps producing while the condition holds', () => {
      presenter.tick()
      const count = presenter.tick()

      expect(count).toBe(1)
      const baker = stores.agentStore.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      // condition needs at least 5 flour: 10 → 8 → 6 still holds, then it stops
      expect(baker.agent.quantityOf(flourId)).toBe(6)
      expect(baker.agent.quantityOf(panId)).toBe(2)

      presenter.tick()
      presenter.tick()
      const afterCondition = presenter.tick()
      expect(afterCondition).toBe(0)
      const final = stores.agentStore.findById(bakerId)
      expect(final.ok).toBe(true)
      if (!final.ok) return
      expect(final.agent.quantityOf(flourId)).toBeLessThan(5)
      expect(ruleId).toBeTruthy()
    })
  })

  describe('activation strategy', () => {
    let recipeId: string
    let flourId: string
    let panId: string
    let playerId: string
    let backgroundId: string

    beforeEach(() => {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')

      const flour = stores.goodStore.findIdByName('Harina')
      const pan = stores.goodStore.findIdByName('Pan')
      expect(flour.ok && pan.ok).toBe(true)
      if (!flour.ok || !pan.ok) return
      flourId = flour.id
      panId = pan.id

      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return
      recipeId = recipe.recipe.id

      const player = stores.agentStore.create({
        name: 'Jugador',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      const background = stores.agentStore.create({
        name: 'Fondo',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
        recipesPerAction: 2,
      })
      expect(player.ok && background.ok).toBe(true)
      if (!player.ok || !background.ok) return
      playerId = player.agent.id
      backgroundId = background.agent.id

      const rule = stores.agentStore.addRule(
        backgroundId,
        { source: 'catalog', recipeId },
        { goodId: flourId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      presenter.possess(playerId)
      presenter.setStrategy('POR_ACCIONES')
    })

    it('defaults to the temporal strategy and switches', () => {
      const fresh = new PlayModePresenter(createStores())
      expect(fresh.strategy).toBe('TEMPORAL')

      expect(presenter.strategy).toBe('POR_ACCIONES')
    })

    it('notifies subscribers when the strategy changes', () => {
      let calls = 0
      presenter.subscribe(() => {
        calls++
      })

      presenter.setStrategy('TEMPORAL')

      expect(calls).toBeGreaterThan(0)
      expect(presenter.strategy).toBe('TEMPORAL')
    })

    it('drives the background agents after a successful manual action', () => {
      presenter.produce({ source: 'catalog', recipeId })

      const background = stores.agentStore.findById(backgroundId)
      expect(background.ok).toBe(true)
      if (!background.ok) return
      // recipesPerAction = 2: both rounds re-check the condition
      expect(background.agent.quantityOf(flourId)).toBe(6)
      expect(background.agent.quantityOf(panId)).toBe(2)

      // the possessed agent only did its manual action
      const player = stores.agentStore.findById(playerId)
      expect(player.ok).toBe(true)
      if (!player.ok) return
      expect(player.agent.quantityOf(flourId)).toBe(8)
      expect(player.agent.quantityOf(panId)).toBe(1)
    })

    it('does not drive the background agents when the manual action fails', () => {
      const poor = stores.agentStore.create({ name: 'Pobre', inventory: [] })
      expect(poor.ok).toBe(true)
      if (!poor.ok) return
      presenter.possess(poor.agent.id)

      presenter.produce({ source: 'catalog', recipeId })

      expect(presenter.error).toBe('Falta Harina: necesitas 2, tienes 0')
      const background = stores.agentStore.findById(backgroundId)
      expect(background.ok).toBe(true)
      if (!background.ok) return
      expect(background.agent.quantityOf(flourId)).toBe(10)
    })

    it('keeps the manual action alone under the temporal strategy', () => {
      presenter.setStrategy('TEMPORAL')

      presenter.produce({ source: 'catalog', recipeId })

      const background = stores.agentStore.findById(backgroundId)
      expect(background.ok).toBe(true)
      if (!background.ok) return
      expect(background.agent.quantityOf(flourId)).toBe(10)
      expect(background.agent.quantityOf(panId)).toBe(0)
    })

    it('advance runs every agent when nobody is possessed and returns the count', () => {
      presenter.release()

      const count = presenter.advance()

      expect(count).toBe(2)
      const background = stores.agentStore.findById(backgroundId)
      expect(background.ok).toBe(true)
      if (!background.ok) return
      expect(background.agent.quantityOf(flourId)).toBe(6)
      expect(background.agent.quantityOf(panId)).toBe(2)
    })

    it('advance never runs the rules of the possessed agent', () => {
      const rule = stores.agentStore.addRule(
        playerId,
        { source: 'catalog', recipeId },
        { goodId: flourId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      const count = presenter.advance()

      // only the background agent ran its two rounds
      expect(count).toBe(2)
      const player = stores.agentStore.findById(playerId)
      expect(player.ok).toBe(true)
      if (!player.ok) return
      expect(player.agent.quantityOf(flourId)).toBe(10)
    })

    it('advance notifies subscribers only when something was produced', () => {
      presenter.release()
      // drain the background agent so its rule stops applying
      const drained = stores.agentStore.addRecipe(backgroundId, {
        name: 'Drenar',
        inputs: [{ goodName: 'Harina', quantity: 10 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(drained.ok).toBe(true)
      if (!drained.ok) return
      const drainedResult = stores.agentStore.produce(backgroundId, {
        source: 'agent',
        recipeId: drained.recipe.id,
      })
      expect(drainedResult.ok).toBe(true)

      let calls = 0
      presenter.subscribe(() => {
        calls++
      })

      expect(presenter.advance()).toBe(0)
      expect(calls).toBe(0)
    })

    it('never sets an error when the economy moves on its own', () => {
      presenter.release()
      presenter.advance()

      expect(presenter.error).toBeNull()
    })
  })
})
