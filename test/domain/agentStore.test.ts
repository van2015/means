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
})
