import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import {
  buildExport,
  importWorld,
  serializeExport,
  WORLD_EXPORT_VERSION,
} from '@/domain/worldTransfer'
import type { WorldExport } from '@/domain/worldTransfer'

describe('worldTransfer', () => {
  let stores: Stores

  beforeEach(() => {
    stores = createStores()
  })

  function setupWorld() {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')
    stores.goodStore.create('Huevos')

    const recipe = stores.recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)

    const agent = stores.agentStore.create({
      name: 'Panadero',
      inventory: [
        { goodName: 'Harina', quantity: 10 },
        { goodName: 'Huevos', quantity: 3 },
      ],
    })
    expect(agent.ok).toBe(true)
    if (!agent.ok) return { recipe, agent }

    const own = stores.agentStore.addRecipe(agent.agent.id, {
      name: 'Horneado propio',
      inputs: [{ goodName: 'Huevos', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(own.ok).toBe(true)

    const harina = stores.goodStore.findIdByName('Harina')
    expect(harina.ok).toBe(true)
    if (!harina.ok) return { recipe, agent }

    if (recipe.ok) {
      stores.agentStore.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harina.id, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
    }

    return { recipe, agent }
  }

  describe('buildExport', () => {
    it('exports only the selected goods', () => {
      setupWorld()
      const harina = stores.goodStore.findIdByName('Harina')
      expect(harina.ok).toBe(true)
      if (!harina.ok) return

      const result = buildExport(stores, {
        goodIds: [harina.id],
        recipeIds: [],
        agentIds: [],
      })

      expect(result.version).toBe(WORLD_EXPORT_VERSION)
      expect(result.goods).toEqual([{ name: 'Harina' }])
      expect(result.recipes).toEqual([])
      expect(result.agents).toEqual([])
    })

    it('a selected recipe pulls its goods (dependency closure)', () => {
      setupWorld()
      const recipe = stores.recipeStore.findByName('Pan de harina')
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const result = buildExport(stores, {
        goodIds: [],
        recipeIds: [recipe.recipe.id],
        agentIds: [],
      })

      expect(result.recipes.map((r) => r.name)).toEqual(['Pan de harina'])
      expect(result.goods.map((g) => g.name).sort()).toEqual(['Harina', 'Pan'])
      expect(result.recipes[0].inputs).toEqual([{ good: 'Harina', quantity: 2 }])
      expect(result.recipes[0].outputs).toEqual([{ good: 'Pan', quantity: 1 }])
    })

    it('a selected agent pulls inventory, own recipes, rules and their catalog recipe', () => {
      setupWorld()
      const agent = stores.agentStore.findByName('Panadero')
      expect(agent.ok).toBe(true)
      if (!agent.ok) return

      const result = buildExport(stores, {
        goodIds: [],
        recipeIds: [],
        agentIds: [agent.agent.id],
      })

      expect(result.agents).toHaveLength(1)
      const exported = result.agents[0]
      expect(exported.name).toBe('Panadero')
      expect(exported.inventory).toEqual([
        { good: 'Harina', quantity: 10 },
        { good: 'Huevos', quantity: 3 },
      ])
      expect(exported.recipes.map((r) => r.name)).toEqual(['Horneado propio'])
      expect(exported.rules).toHaveLength(1)
      expect(exported.rules[0]).toEqual({
        recipe: { source: 'catalog', name: 'Pan de harina' },
        condition: { good: 'Harina', quantity: 5, operator: 'AT_LEAST' },
        priority: 1,
      })
      // closure: the catalog recipe referenced by the rule comes along
      expect(result.recipes.map((r) => r.name)).toEqual(['Pan de harina'])
      // closure: goods of inventory + rule condition + recipe lines
      expect(result.goods.map((g) => g.name).sort()).toEqual(['Harina', 'Huevos', 'Pan'])
    })

    it('a rule on an agent-specific recipe does not leak that recipe to the catalog', () => {
      setupWorld()
      const agent = stores.agentStore.findByName('Panadero')
      const harina = stores.goodStore.findIdByName('Harina')
      expect(agent.ok && harina.ok).toBe(true)
      if (!agent.ok || !harina.ok) return
      const own = agent.agent.recipes[0]
      stores.agentStore.addRule(
        agent.agent.id,
        { source: 'agent', recipeId: own.id },
        { goodId: harina.id, quantity: 1, operator: 'AT_LEAST' },
        2,
      )

      const result = buildExport(stores, {
        goodIds: [],
        recipeIds: [],
        agentIds: [agent.agent.id],
      })

      // the catalog only contains the recipe referenced by the catalog-source rule
      expect(result.recipes.map((r) => r.name)).toEqual(['Pan de harina'])
      const sources = result.agents[0].rules.map((r) => r.recipe.source).sort()
      expect(sources).toEqual(['agent', 'catalog'])
      const agentRule = result.agents[0].rules.find((r) => r.recipe.source === 'agent')
      expect(agentRule?.recipe.name).toBe('Horneado propio')
    })

    it('deduplicates goods shared between selection and closure', () => {
      setupWorld()
      const harina = stores.goodStore.findIdByName('Harina')
      const recipe = stores.recipeStore.findByName('Pan de harina')
      const agent = stores.agentStore.findByName('Panadero')
      expect(harina.ok && recipe.ok && agent.ok).toBe(true)
      if (!harina.ok || !recipe.ok || !agent.ok) return

      const result = buildExport(stores, {
        goodIds: [harina.id],
        recipeIds: [recipe.recipe.id],
        agentIds: [agent.agent.id],
      })

      const names = result.goods.map((g) => g.name)
      expect(names).toEqual([...new Set(names)])
      expect(result.recipes).toHaveLength(1)
      expect(result.agents).toHaveLength(1)
    })

    it('ignores ids that no longer exist', () => {
      const result = buildExport(stores, {
        goodIds: ['ghost-good'],
        recipeIds: ['ghost-recipe'],
        agentIds: ['ghost-agent'],
      })

      expect(result.goods).toEqual([])
      expect(result.recipes).toEqual([])
      expect(result.agents).toEqual([])
    })
  })

  describe('importWorld: roundtrip', () => {
    it('export → import into an empty world is equivalent', () => {
      setupWorld()

      const selection = {
        goodIds: stores.goodStore.all().map((g) => g.id),
        recipeIds: stores.recipeStore.all().map((r) => r.id),
        agentIds: stores.agentStore.all().map((a) => a.id),
      }
      const json = serializeExport(buildExport(stores, selection))

      const fresh = createStores()
      const result = importWorld(fresh, json)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.summary.goods.added).toBe(3)
      expect(result.summary.recipes.added).toBe(2) // catalog recipe + agent's own recipe
      expect(result.summary.agents.added).toBe(1)
      expect(result.summary.rules.added).toBe(1)

      // world equivalence by names and quantities
      expect(
        fresh.goodStore
          .all()
          .map((g) => g.name)
          .sort(),
      ).toEqual(['Harina', 'Huevos', 'Pan'])
      const recipe = fresh.recipeStore.findByName('Pan de harina')
      const harinaId = fresh.goodStore.findIdByName('Harina')
      const panId = fresh.goodStore.findIdByName('Pan')
      expect(recipe.ok && harinaId.ok && panId.ok).toBe(true)
      if (recipe.ok && harinaId.ok && panId.ok) {
        expect(recipe.recipe.inputs).toEqual([{ goodId: harinaId.id, quantity: 2 }])
        expect(recipe.recipe.outputs).toEqual([{ goodId: panId.id, quantity: 1 }])
      }
      const agent = fresh.agentStore.findByName('Panadero')
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      expect(agent.agent.inventory).toHaveLength(2)
      expect(agent.agent.recipes.map((r) => r.name)).toEqual(['Horneado propio'])
      expect(agent.agent.rules).toHaveLength(1)
      expect(agent.agent.rules[0].priority).toBe(1)
      expect(agent.agent.rules[0].condition.operator).toBe('AT_LEAST')
      expect(agent.agent.rules[0].recipeRef.source).toBe('catalog')
    })

    it('re-importing the same file skips everything (idempotent)', () => {
      setupWorld()
      const selection = {
        goodIds: stores.goodStore.all().map((g) => g.id),
        recipeIds: stores.recipeStore.all().map((r) => r.id),
        agentIds: stores.agentStore.all().map((a) => a.id),
      }
      const json = serializeExport(buildExport(stores, selection))

      const fresh = createStores()
      expect(importWorld(fresh, json).ok).toBe(true)

      const second = importWorld(fresh, json)
      expect(second.ok).toBe(true)
      if (!second.ok) return
      expect(second.summary.goods).toEqual({ added: 0, skipped: 3 })
      expect(second.summary.recipes).toEqual({ added: 0, skipped: 2 })
      expect(second.summary.agents).toEqual({ added: 0, skipped: 1 })
      expect(second.summary.rules).toEqual({ added: 0, skipped: 1 })
      expect(fresh.goodStore.all().length).toBe(3)
      expect(fresh.agentStore.count()).toBe(1)
    })

    it('partial overlap: existing elements are skipped, new ones added', () => {
      setupWorld()
      const selection = {
        goodIds: stores.goodStore.all().map((g) => g.id),
        recipeIds: stores.recipeStore.all().map((r) => r.id),
        agentIds: [],
      }
      const json = serializeExport(buildExport(stores, selection))

      // target world already has one good
      const fresh = createStores()
      fresh.goodStore.create('Harina')

      const result = importWorld(fresh, json)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.summary.goods).toEqual({ added: 2, skipped: 1 })
      expect(result.summary.recipes).toEqual({ added: 1, skipped: 0 })
      expect(fresh.goodStore.all().length).toBe(3)
      expect(fresh.recipeStore.count()).toBe(1)
    })

    it('a recipe can import using goods that already exist in the target world', () => {
      // file only contains the recipe; the world already has the goods
      const file: WorldExport = {
        version: WORLD_EXPORT_VERSION,
        goods: [],
        recipes: [
          {
            name: 'Pan de harina',
            inputs: [{ good: 'Harina', quantity: 2 }],
            outputs: [{ good: 'Pan', quantity: 1 }],
          },
        ],
        agents: [],
      }
      const fresh = createStores()
      fresh.goodStore.create('Harina')
      fresh.goodStore.create('Pan')

      const result = importWorld(fresh, serializeExport(file))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.summary.recipes.added).toBe(1)
    })
  })

  describe('importWorld: validation (all-or-nothing)', () => {
    it('rejects invalid JSON without touching the world', () => {
      const result = importWorld(stores, '{not json')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([{ code: 'INVALID_JSON' }])
      expect(stores.goodStore.all().length).toBe(0)
      expect(stores.recipeStore.count()).toBe(0)
      expect(stores.agentStore.count()).toBe(0)
    })

    it('rejects an unsupported version', () => {
      const result = importWorld(
        stores,
        JSON.stringify({ version: 99, goods: [], recipes: [], agents: [] }),
      )

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([{ code: 'UNSUPPORTED_VERSION', version: 99 }])
    })

    it('rejects a non-object root', () => {
      const result = importWorld(stores, '"just a string"')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors[0]).toEqual({ code: 'INVALID_STRUCTURE', path: '' })
    })

    it('rejects missing top-level arrays', () => {
      const result = importWorld(stores, JSON.stringify({ version: WORLD_EXPORT_VERSION }))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(
        result.errors.map((e) => (e.code === 'INVALID_STRUCTURE' ? e.path : e.code)).sort(),
      ).toEqual(['agents', 'goods', 'recipes'])
    })

    it('rejects structural problems with their path', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Harina' }],
        recipes: [{ name: 'R', inputs: [{ good: 'Harina', quantity: 0 }], outputs: [] }],
        agents: [],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toContainEqual({
        code: 'INVALID_STRUCTURE',
        path: 'recipes[0].inputs[0].quantity',
      })
      // also: outputs empty is invalid
      expect(result.errors).toContainEqual({
        code: 'INVALID_STRUCTURE',
        path: 'recipes[0].outputs',
      })
      expect(stores.goodStore.all().length).toBe(0)
    })

    it('rejects duplicate names inside the file', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Harina' }, { name: 'Harina' }],
        recipes: [],
        agents: [],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([{ code: 'DUPLICATE_NAME', kind: 'bien', name: 'Harina' }])
      expect(stores.goodStore.all().length).toBe(0)
    })

    it('rejects a recipe referencing a good that exists nowhere', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Pan' }],
        recipes: [
          {
            name: 'Pan de harina',
            inputs: [{ good: 'Madera', quantity: 1 }],
            outputs: [{ good: 'Pan', quantity: 1 }],
          },
        ],
        agents: [],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([
        {
          code: 'MISSING_REFERENCE',
          kind: 'bien',
          name: 'Madera',
          source: 'receta',
          sourceName: 'Pan de harina',
        },
      ])
      expect(stores.recipeStore.count()).toBe(0)
    })

    it('rejects a rule referencing a recipe that exists nowhere', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Harina' }],
        recipes: [],
        agents: [
          {
            name: 'Panadero',
            inventory: [{ good: 'Harina', quantity: 10 }],
            recipes: [],
            rules: [
              {
                recipe: { source: 'catalog', name: 'Receta fantasma' },
                condition: { good: 'Harina', quantity: 5, operator: 'AT_LEAST' },
                priority: 1,
              },
            ],
          },
        ],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toEqual([
        {
          code: 'MISSING_REFERENCE',
          kind: 'receta',
          name: 'Receta fantasma',
          source: 'agente',
          sourceName: 'Panadero',
        },
      ])
      expect(stores.agentStore.count()).toBe(0)
    })

    it('accepts a rule referencing a recipe included in the same file', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Harina' }, { name: 'Pan' }],
        recipes: [
          {
            name: 'Pan de harina',
            inputs: [{ good: 'Harina', quantity: 2 }],
            outputs: [{ good: 'Pan', quantity: 1 }],
          },
        ],
        agents: [
          {
            name: 'Panadero',
            inventory: [{ good: 'Harina', quantity: 10 }],
            recipes: [],
            rules: [
              {
                recipe: { source: 'catalog', name: 'Pan de harina' },
                condition: { good: 'Harina', quantity: 5, operator: 'AT_LEAST' },
                priority: 3,
              },
            ],
          },
        ],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.summary.rules.added).toBe(1)
      const agent = stores.agentStore.findByName('Panadero')
      expect(agent.ok).toBe(true)
      if (agent.ok) expect(agent.agent.rules[0].priority).toBe(3)
    })

    it('a broken file imports nothing even if part of it is valid', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [{ name: 'Harina' }], // valid on its own
        recipes: [
          {
            name: 'Receta rota',
            inputs: [{ good: 'NoExiste', quantity: 1 }],
            outputs: [{ good: 'Harina', quantity: 1 }],
          },
        ],
        agents: [],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      expect(stores.goodStore.all()).toHaveLength(0) // the valid good was NOT imported
      expect(stores.recipeStore.count()).toBe(0)
    })

    it('rejects invalid rule shapes', () => {
      const file = {
        version: WORLD_EXPORT_VERSION,
        goods: [],
        recipes: [],
        agents: [
          {
            name: 'Panadero',
            inventory: [],
            recipes: [],
            rules: [
              {
                recipe: { source: 'wrong-source', name: 'X' },
                condition: { good: 'Harina', quantity: 1, operator: 'AT_LEAST' },
                priority: 1,
              },
            ],
          },
        ],
      }
      const result = importWorld(stores, JSON.stringify(file))

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.errors).toContainEqual({
        code: 'INVALID_STRUCTURE',
        path: 'agents[0].rules[0].recipe',
      })
    })
  })
})
