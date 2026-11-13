import { beforeEach, describe, expect, it } from 'vitest'
import { AgentStore } from '@/domain/agentStore'
import { GoodStore } from '@/domain/goodStore'
import { RecipeStore } from '@/domain/recipeStore'

describe('AgentStore', () => {
  let goodStore: GoodStore
  let recipeStore: RecipeStore
  let store: AgentStore

  beforeEach(() => {
    goodStore = new GoodStore()
    recipeStore = new RecipeStore(goodStore)
    store = new AgentStore(goodStore, recipeStore)
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

  it('rejects a recipesPerAction that is not an integer of at least 1', () => {
    goodStore.create('Harina')

    for (const invalid of [0, -1, 2.5, Number.NaN]) {
      const result = store.create({
        name: `Agente ${String(invalid)}`,
        inventory: [{ goodName: 'Harina', quantity: 1 }],
        recipesPerAction: invalid,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContainEqual({ code: 'INVALID_RECIPES_PER_ACTION' })
      }
    }
    expect(store.count()).toBe(0)
  })

  it('stores recipesPerAction and defaults to 1 when the draft omits it', () => {
    goodStore.create('Harina')

    const custom = store.create({ name: 'Rapido', inventory: [], recipesPerAction: 4 })
    const legacy = store.create({ name: 'Tradicional', inventory: [] })
    expect(custom.ok && legacy.ok).toBe(true)

    const fast = store.findByName('Rapido')
    const slow = store.findByName('Tradicional')
    expect(fast.ok && slow.ok).toBe(true)
    if (!fast.ok || !slow.ok) return

    expect(fast.agent.recipesPerAction).toBe(4)
    expect(slow.agent.recipesPerAction).toBe(1)
  })

  it('rejects an agent-specific recipe with an empty name', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const result = store.addRecipe(agent.agent.id, {
      name: '',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'EMPTY_NAME' }])
    }
    const after = store.findById(agent.agent.id)
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.agent.recipes).toHaveLength(0)
  })

  it('rejects duplicate names among the recipes of the same agent', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const first = store.addRecipe(agent.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(first.ok).toBe(true)

    const second = store.addRecipe(agent.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 2 }],
    })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.errors).toContainEqual({ code: 'RECIPE_NAME_EXISTS' })
    }
  })

  it('allows the same recipe name for a different agent', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const first = store.create({ name: 'Panadero', inventory: [] })
    const second = store.create({ name: 'Obrero', inventory: [] })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    const recipeA = store.addRecipe(first.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    const recipeB = store.addRecipe(second.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 2 }],
    })
    expect(recipeA.ok).toBe(true)
    expect(recipeB.ok).toBe(true)
  })

  it('rejects a rule that references a nonexistent catalog recipe', () => {
    goodStore.create('Harina')

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const good = goodStore.findIdByName('Harina')
    expect(good.ok).toBe(true)
    if (!good.ok) return

    const result = store.addRule(
      agent.agent.id,
      { source: 'catalog', recipeId: 'no-such-recipe' },
      { goodId: good.id, quantity: 1, operator: 'AT_LEAST' },
      1,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'RECIPE_NOT_FOUND' }])
    }
    const after = store.findById(agent.agent.id)
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.agent.rules).toHaveLength(0)
  })

  it('rejects a rule that references a nonexistent agent-specific recipe', () => {
    goodStore.create('Harina')

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const good = goodStore.findIdByName('Harina')
    expect(good.ok).toBe(true)
    if (!good.ok) return

    const result = store.addRule(
      agent.agent.id,
      { source: 'agent', recipeId: 'no-such-recipe' },
      { goodId: good.id, quantity: 1, operator: 'AT_LEAST' },
      1,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'RECIPE_NOT_FOUND' }])
    }
  })

  it('rejects a rule whose condition good does not exist', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const recipe = recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const result = store.addRule(
      agent.agent.id,
      { source: 'catalog', recipeId: recipe.recipe.id },
      { goodId: 'no-such-good', quantity: 1, operator: 'AT_LEAST' },
      1,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'UNKNOWN_CONDITION_GOOD' }])
    }
    const after = store.findById(agent.agent.id)
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.agent.rules).toHaveLength(0)
  })

  it('accepts a rule referencing an agent-specific recipe of that same agent', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const agent = store.create({ name: 'Panadero', inventory: [] })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return

    const recipe = store.addRecipe(agent.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const good = goodStore.findIdByName('Harina')
    expect(good.ok).toBe(true)
    if (!good.ok) return

    const result = store.addRule(
      agent.agent.id,
      { source: 'agent', recipeId: recipe.recipe.id },
      { goodId: good.id, quantity: 5, operator: 'LESS_THAN' },
      1,
    )

    expect(result.ok).toBe(true)
  })

  it('rejects a rule referencing an agent-specific recipe that belongs to another agent', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const owner = store.create({ name: 'Panadero', inventory: [] })
    const other = store.create({ name: 'Obrero', inventory: [] })
    expect(owner.ok && other.ok).toBe(true)
    if (!owner.ok || !other.ok) return

    const recipe = store.addRecipe(owner.agent.id, {
      name: 'Horneado',
      inputs: [{ goodName: 'Harina', quantity: 1 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const good = goodStore.findIdByName('Harina')
    expect(good.ok).toBe(true)
    if (!good.ok) return

    const result = store.addRule(
      other.agent.id,
      { source: 'agent', recipeId: recipe.recipe.id },
      { goodId: good.id, quantity: 1, operator: 'AT_LEAST' },
      1,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'RECIPE_NOT_FOUND' }])
    }
  })

  describe('updateRulePriority', () => {
    function setupAgentWithTwoRules(): { agentId: string; ruleIds: [string, string] } {
      goodStore.create('Harina')
      goodStore.create('Pan')

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) throw new Error('Recipe creation failed')

      const good = goodStore.findIdByName('Harina')
      expect(good.ok).toBe(true)
      if (!good.ok) throw new Error('Good not found')

      const agent = store.create({ name: 'Panadero', inventory: [] })
      expect(agent.ok).toBe(true)
      if (!agent.ok) throw new Error('Agent creation failed')

      const first = store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: good.id, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      const second = store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: good.id, quantity: 5, operator: 'LESS_THAN' },
        2,
      )
      expect(first.ok && second.ok).toBe(true)
      if (!first.ok || !second.ok) throw new Error('Rule creation failed')

      return { agentId: agent.agent.id, ruleIds: [first.rule.id, second.rule.id] }
    }

    it('updates the priority and reorders the rules', () => {
      const { agentId, ruleIds } = setupAgentWithTwoRules()

      const result = store.updateRulePriority(agentId, ruleIds[1], 0)

      expect(result.ok).toBe(true)
      const after = store.findById(agentId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.rules.map((rule) => rule.id)).toEqual([ruleIds[1], ruleIds[0]])
      expect(after.agent.rules[0].priority).toBe(0)
      // recipeRef and condition are preserved
      expect(after.agent.rules[0].condition.quantity).toBe(5)
      expect(after.agent.rules[0].condition.operator).toBe('LESS_THAN')
    })

    it('rejects a non-finite priority without changing the rules', () => {
      const { agentId, ruleIds } = setupAgentWithTwoRules()

      const result = store.updateRulePriority(agentId, ruleIds[0], Number.NaN)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'INVALID_PRIORITY' }])
      }
      const after = store.findById(agentId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.rules.map((rule) => rule.priority)).toEqual([1, 2])
    })

    it('returns RULE_NOT_FOUND for an unknown rule', () => {
      const { agentId } = setupAgentWithTwoRules()

      const result = store.updateRulePriority(agentId, 'no-such-rule', 5)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'RULE_NOT_FOUND' }])
      }
    })

    it('returns AGENT_NOT_FOUND for an unknown agent', () => {
      const result = store.updateRulePriority('no-such-agent', 'no-such-rule', 5)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'AGENT_NOT_FOUND' }])
      }
    })
  })

  describe('priority validation (debt fix)', () => {
    function setupRulelessAgent() {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) throw new Error('Recipe creation failed')
      const good = goodStore.findIdByName('Harina')
      expect(good.ok).toBe(true)
      if (!good.ok) throw new Error('Good not found')
      const agent = store.create({ name: 'Panadero', inventory: [] })
      expect(agent.ok).toBe(true)
      if (!agent.ok) throw new Error('Agent creation failed')
      return { recipeId: recipe.recipe.id, goodId: good.id, agentId: agent.agent.id }
    }

    it('rejects a rule with a non-finite priority', () => {
      const { recipeId, goodId, agentId } = setupRulelessAgent()

      const result = store.addRule(
        agentId,
        { source: 'catalog', recipeId },
        { goodId, quantity: 2, operator: 'AT_LEAST' },
        Number.NaN,
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContainEqual({ code: 'INVALID_PRIORITY' })
      }
      const after = store.findById(agentId)
      expect(after.ok).toBe(true)
      if (after.ok) expect(after.agent.rules).toHaveLength(0)
    })

    it('rejects updating a rule to a non-finite priority', () => {
      const { recipeId, goodId, agentId } = setupRulelessAgent()
      const created = store.addRule(
        agentId,
        { source: 'catalog', recipeId },
        { goodId, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      expect(created.ok).toBe(true)
      if (!created.ok) return

      const result = store.updateRule(
        agentId,
        created.rule.id,
        { source: 'catalog', recipeId },
        { goodId, quantity: 2, operator: 'AT_LEAST' },
        Number.NaN,
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toContainEqual({ code: 'INVALID_PRIORITY' })
      }
      const after = store.findById(agentId)
      expect(after.ok).toBe(true)
      if (after.ok) expect(after.agent.rules[0].priority).toBe(1)
    })

    it('accepts zero as a valid priority', () => {
      const { recipeId, goodId, agentId } = setupRulelessAgent()

      const result = store.addRule(
        agentId,
        { source: 'catalog', recipeId },
        { goodId, quantity: 2, operator: 'AT_LEAST' },
        0,
      )

      expect(result.ok).toBe(true)
    })
  })

  describe('produce', () => {
    function setupProduction() {
      goodStore.create('Harina')
      goodStore.create('Pan')
      goodStore.create('Huevos')

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) throw new Error('Recipe creation failed')

      const agent = store.create({
        name: 'Panadero',
        inventory: [
          { goodName: 'Harina', quantity: 10 },
          { goodName: 'Huevos', quantity: 3 },
        ],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) throw new Error('Agent creation failed')

      return { recipeId: recipe.recipe.id, agentId: agent.agent.id }
    }

    it('consumes inputs and produces outputs with a catalog recipe', () => {
      const { recipeId, agentId } = setupProduction()

      const result = store.produce(agentId, { source: 'catalog', recipeId })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      const flourId = goodStore.findIdByName('Harina')
      const panId = goodStore.findIdByName('Pan')
      expect(flourId.ok && panId.ok).toBe(true)
      if (!flourId.ok || !panId.ok) return
      expect(result.agent.quantityOf(flourId.id)).toBe(8)
      expect(result.agent.quantityOf(panId.id)).toBe(1)
      // the store itself reflects the change
      const after = store.findById(agentId)
      expect(after.ok).toBe(true)
      if (after.ok) expect(after.agent.quantityOf(flourId.id)).toBe(8)
    })

    it('produces with an agent-specific recipe', () => {
      const { agentId } = setupProduction()
      const added = store.addRecipe(agentId, {
        name: 'Horneado propio',
        inputs: [{ goodName: 'Harina', quantity: 4 }],
        outputs: [{ goodName: 'Pan', quantity: 2 }],
      })
      expect(added.ok).toBe(true)
      if (!added.ok) return

      const result = store.produce(agentId, { source: 'agent', recipeId: added.recipe.id })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      const flourId = goodStore.findIdByName('Harina')
      const panId = goodStore.findIdByName('Pan')
      expect(flourId.ok && panId.ok).toBe(true)
      if (!flourId.ok || !panId.ok) return
      expect(result.agent.quantityOf(flourId.id)).toBe(6)
      expect(result.agent.quantityOf(panId.id)).toBe(2)
    })

    it('rejects production when material is missing and leaves the inventory untouched', () => {
      const { recipeId } = setupProduction()

      // an agent with less flour than the recipe requires
      const poor = store.create({
        name: 'Aprendiz',
        inventory: [{ goodName: 'Harina', quantity: 1 }],
      })
      expect(poor.ok).toBe(true)
      if (!poor.ok) return

      const result = store.produce(poor.agent.id, { source: 'catalog', recipeId })

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([
        { code: 'INSUFFICIENT_GOOD', goodName: 'Harina', required: 2, available: 1 },
      ])
      const after = store.findById(poor.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      const flourId = goodStore.findIdByName('Harina')
      expect(flourId.ok).toBe(true)
      if (flourId.ok) expect(after.agent.quantityOf(flourId.id)).toBe(1)
      expect(after.agent.inventory).toHaveLength(1)
    })

    it('removes input lines that reach zero and appends new goods at the end', () => {
      const { recipeId } = setupProduction()

      // exactly one production worth of flour: the line must disappear
      const agent = store.create({
        name: 'Preciso',
        inventory: [
          { goodName: 'Huevos', quantity: 2 },
          { goodName: 'Harina', quantity: 2 },
        ],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return

      const result = store.produce(agent.agent.id, { source: 'catalog', recipeId })

      expect(result.ok).toBe(true)
      if (!result.ok) return
      const flourId = goodStore.findIdByName('Harina')
      const panId = goodStore.findIdByName('Pan')
      const eggsId = goodStore.findIdByName('Huevos')
      expect(flourId.ok && panId.ok && eggsId.ok).toBe(true)
      if (!flourId.ok || !panId.ok || !eggsId.ok) return

      const ids = result.agent.inventory.map((line) => line.goodId)
      // the flour line at 0 is gone
      expect(ids).not.toContain(flourId.id)
      // eggs keeps its position, pan is appended at the end
      expect(ids).toEqual([eggsId.id, panId.id])
      expect(result.agent.inventory.every((line) => line.quantity > 0)).toBe(true)
      expect(result.agent.quantityOf(panId.id)).toBe(1)
    })

    it('returns RECIPE_NOT_FOUND for an unknown recipe', () => {
      const { agentId } = setupProduction()

      const result = store.produce(agentId, { source: 'catalog', recipeId: 'no-such-recipe' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'RECIPE_NOT_FOUND' }])
      }
    })

    it('returns AGENT_NOT_FOUND for an unknown agent', () => {
      const result = store.produce('no-such-agent', { source: 'catalog', recipeId: 'x' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'AGENT_NOT_FOUND' }])
      }
    })

    it("cannot produce another agent's recipe through the agent source", () => {
      const { agentId } = setupProduction()
      const other = store.create({ name: 'Obrero', inventory: [] })
      expect(other.ok).toBe(true)
      if (!other.ok) return
      const foreign = store.addRecipe(other.agent.id, {
        name: 'Receta ajena',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(foreign.ok).toBe(true)
      if (!foreign.ok) return

      const result = store.produce(agentId, { source: 'agent', recipeId: foreign.recipe.id })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'RECIPE_NOT_FOUND' }])
      }
    })
  })

  describe('runAutomaticRules', () => {
    function goodIds() {
      const harina = goodStore.findIdByName('Harina')
      const pan = goodStore.findIdByName('Pan')
      expect(harina.ok && pan.ok).toBe(true)
      if (!harina.ok || !pan.ok) throw new Error('Goods not found')
      return { harinaId: harina.id, panId: pan.id }
    }

    function setupWorld() {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) throw new Error('Recipe creation failed')

      const baker = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) throw new Error('Agent creation failed')

      const rule = store.addRule(
        baker.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harinaId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
      if (!rule.ok) throw new Error('Rule creation failed')

      return {
        recipeId: recipe.recipe.id,
        bakerId: baker.agent.id,
        harinaId,
        panId,
        ruleId: rule.rule.id,
      }
    }

    it('produces for non-possessed agents whose condition holds', () => {
      const { bakerId, harinaId, panId, ruleId } = setupWorld()

      const executed = store.runAutomaticRules(null)

      expect(executed).toEqual([{ agentId: bakerId, ruleId }])
      const after = store.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(8)
      expect(after.agent.quantityOf(panId)).toBe(1)
    })

    it('excludes the possessed agent', () => {
      const { bakerId, harinaId } = setupWorld()

      const executed = store.runAutomaticRules(bakerId)

      expect(executed).toEqual([])
      const after = store.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(10)
    })

    it('runs every agent when nobody is possessed', () => {
      const { recipeId, harinaId } = setupWorld()
      const second = store.create({
        name: 'Obrero',
        inventory: [{ goodName: 'Harina', quantity: 4 }],
      })
      expect(second.ok).toBe(true)
      if (!second.ok) return
      const rule = store.addRule(
        second.agent.id,
        { source: 'catalog', recipeId },
        { goodId: harinaId, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      const executed = store.runAutomaticRules(null)

      expect(executed).toHaveLength(2)
      const baker = store.findByName('Panadero')
      const obrero = store.findByName('Obrero')
      expect(baker.ok && obrero.ok).toBe(true)
      if (!baker.ok || !obrero.ok) return
      expect(baker.agent.quantityOf(harinaId)).toBe(8)
      expect(obrero.agent.quantityOf(harinaId)).toBe(2)
    })

    it('executes only one rule per agent per tick, in priority order', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      // two rules, both applicable, different priorities
      const agent = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return

      const cheap = recipeStore.create({
        name: 'Pan barato',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      const expensive = recipeStore.create({
        name: 'Pan caro',
        inputs: [{ goodName: 'Harina', quantity: 5 }],
        outputs: [{ goodName: 'Pan', quantity: 3 }],
      })
      expect(cheap.ok && expensive.ok).toBe(true)
      if (!cheap.ok || !expensive.ok) return

      // priority 2 added first, priority 1 added second: store must still order them
      store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: expensive.recipe.id },
        { goodId: harinaId, quantity: 5, operator: 'AT_LEAST' },
        2,
      )
      const priorityOne = store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: cheap.recipe.id },
        { goodId: harinaId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(priorityOne.ok).toBe(true)
      if (!priorityOne.ok) return

      const executed = store.runAutomaticRules(null)

      // only the priority-1 rule ran, and only once
      expect(executed).toEqual([{ agentId: agent.agent.id, ruleId: priorityOne.rule.id }])
      const after = store.findById(agent.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(9)
      expect(after.agent.quantityOf(panId)).toBe(1)
    })

    it('falls through to the next rule when the first cannot run', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      // agent has 3 flour: rule priority 1 needs 5 (impossible), priority 2 needs 2 (possible)
      const agent = store.create({
        name: 'Aprendiz',
        inventory: [{ goodName: 'Harina', quantity: 3 }],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return

      const needsFive = recipeStore.create({
        name: 'Receta cara',
        inputs: [{ goodName: 'Harina', quantity: 5 }],
        outputs: [{ goodName: 'Pan', quantity: 2 }],
      })
      const needsTwo = recipeStore.create({
        name: 'Receta barata',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(needsFive.ok && needsTwo.ok).toBe(true)
      if (!needsFive.ok || !needsTwo.ok) return

      store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: needsFive.recipe.id },
        { goodId: harinaId, quantity: 3, operator: 'AT_LEAST' },
        1,
      )
      const fallback = store.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: needsTwo.recipe.id },
        { goodId: harinaId, quantity: 3, operator: 'AT_LEAST' },
        2,
      )
      expect(fallback.ok).toBe(true)
      if (!fallback.ok) return

      const executed = store.runAutomaticRules(null)

      expect(executed).toEqual([{ agentId: agent.agent.id, ruleId: fallback.rule.id }])
      const after = store.findById(agent.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(1)
      expect(after.agent.quantityOf(panId)).toBe(1)
    })

    it('does not execute rules whose condition does not hold', () => {
      const { bakerId, harinaId } = setupWorld()
      // lower the stock below the condition threshold (5)
      const baker = store.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      const drained = store.addRecipe(bakerId, {
        name: 'Drenar',
        inputs: [{ goodName: 'Harina', quantity: 8 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(drained.ok).toBe(true)
      if (!drained.ok) return
      const drainedResult = store.produce(bakerId, { source: 'agent', recipeId: drained.recipe.id })
      expect(drainedResult.ok).toBe(true)
      if (!drainedResult.ok) return
      expect(drainedResult.agent.quantityOf(harinaId)).toBe(2)

      const executed = store.runAutomaticRules(null)

      expect(executed).toEqual([])
      const after = store.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(2)
    })

    it('skips rules whose recipe was deleted without breaking the loop', () => {
      const { recipeId, bakerId, harinaId } = setupWorld()

      // a second agent with a rule pointing at the recipe we are about to delete
      const other = store.create({
        name: 'Obrero',
        inventory: [{ goodName: 'Harina', quantity: 4 }],
      })
      expect(other.ok).toBe(true)
      if (!other.ok) return
      const otherRule = store.addRule(
        other.agent.id,
        { source: 'catalog', recipeId },
        { goodId: harinaId, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      expect(otherRule.ok).toBe(true)
      if (!otherRule.ok) return

      // delete the shared recipe: both rules become dangling
      recipeStore.delete(recipeId)

      // the dangling rules fail silently; the baker also has a dangling recipe ref now
      const executed = store.runAutomaticRules(null)

      expect(executed).toEqual([])
      const baker = store.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      expect(baker.agent.quantityOf(harinaId)).toBe(10)
    })

    it('runs up to recipesPerAction recipes for the agent in one round', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
        recipesPerAction: 3,
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return

      const rule = store.addRule(
        baker.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harinaId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
      if (!rule.ok) return

      const executed = store.runAutomaticRules(null)

      // the limit is reached, and the condition is re-checked against the
      // inventory updated by every previous production
      expect(executed).toHaveLength(3)
      expect(executed.every((entry) => entry.ruleId === rule.rule.id)).toBe(true)
      const after = store.findById(baker.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(4)
      expect(after.agent.quantityOf(panId)).toBe(3)
    })

    it('stops before the limit when the condition stops holding', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      // 5 allowed rounds, but flour drops below the threshold after the 2nd
      const baker = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
        recipesPerAction: 5,
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return

      const rule = store.addRule(
        baker.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harinaId, quantity: 8, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      const executed = store.runAutomaticRules(null)

      expect(executed).toHaveLength(2)
      const after = store.findById(baker.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(6)
      expect(after.agent.quantityOf(panId)).toBe(2)
    })

    it('stops before the limit when the material runs out', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId, panId } = goodIds()

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 3 }],
        recipesPerAction: 10,
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return

      // the condition (>= 1) still holds after the first production, but there
      // is not enough flour for a second one
      const rule = store.addRule(
        baker.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harinaId, quantity: 1, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      const executed = store.runAutomaticRules(null)

      expect(executed).toHaveLength(1)
      const after = store.findById(baker.agent.id)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(harinaId)).toBe(1)
      expect(after.agent.quantityOf(panId)).toBe(1)
    })

    it('keeps recipesPerAction across recipe additions and productions', () => {
      goodStore.create('Harina')
      goodStore.create('Pan')
      const { harinaId } = goodIds()

      const recipe = recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = store.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
        recipesPerAction: 3,
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      const bakerId = baker.agent.id

      // addRecipe and produce both rebuild the agent entity
      const added = store.addRecipe(bakerId, {
        name: 'Drenar',
        inputs: [{ goodName: 'Pan', quantity: 1 }],
        outputs: [{ goodName: 'Harina', quantity: 1 }],
      })
      expect(added.ok).toBe(true)

      const rule = store.addRule(
        bakerId,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harinaId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)

      store.runAutomaticRules(null)

      const after = store.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.recipesPerAction).toBe(3)
      expect(after.agent.quantityOf(harinaId)).toBe(4)
    })

    it('returns an empty list when there is nothing to do', () => {
      const executed = store.runAutomaticRules(null)

      expect(executed).toEqual([])
    })
  })
})
