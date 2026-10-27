import { beforeEach, describe, expect, it } from 'vitest'
import { RecipeStore } from '@/domain/recipeStore'
import { RecipeBuilder } from '../helpers/recipeBuilder'

describe('RecipeStore', () => {
  let store: RecipeStore

  beforeEach(() => {
    store = new RecipeStore()
  })

  it('saves a valid recipe with name, inputs and outputs', () => {
    const result = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )

    expect(result.ok).toBe(true)
    expect(store.recipeCount()).toBe(1)

    const recipe = store.findRecipeByName('Pan')
    expect(recipe).toBeDefined()

    const flourId = store.findGoodIdByName('Harina')
    const breadId = store.findGoodIdByName('Pan')
    expect(flourId).toBeDefined()
    expect(breadId).toBeDefined()

    if (recipe && flourId && breadId) {
      const flour = store.getGood(flourId)
      const bread = store.getGood(breadId)
      expect(flour).toBeDefined()
      expect(bread).toBeDefined()

      if (flour && bread) {
        expect(recipe.consumes(flour, 2)).toBe(true)
        expect(recipe.produces(bread, 1)).toBe(true)
      }
    }
  })

  it('rejects a recipe without inputs', () => {
    const result = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withOutput('Pan', 1)
        .build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_INPUTS' }])
    }

    expect(store.recipeCount()).toBe(0)
  })

  it('rejects a recipe without outputs', () => {
    const result = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_OUTPUTS' }])
    }

    expect(store.recipeCount()).toBe(0)
  })

  it('rejects quantities less than or equal to zero', () => {
    const result = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 0)
        .withOutput('Pan', -1)
        .build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: 'INVALID_QUANTITY', goodName: 'Harina' },
        { code: 'INVALID_QUANTITY', goodName: 'Pan' },
      ])
    }

    expect(store.recipeCount()).toBe(0)
  })

  it('deleteRecipe removes the recipe from the catalog', () => {
    const created = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    store.deleteRecipe(created.recipe.id)

    expect(store.recipeCount()).toBe(0)
    expect(store.findRecipeByName('Pan')).toBeUndefined()
  })

  it('updateRecipe rejects invalid drafts and leaves the original untouched', () => {
    const created = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const result = store.updateRecipe(created.recipe.id, {
      name: 'Pan invalido',
      inputs: [],
      outputs: [{ goodName: 'Pan', quantity: -1 }],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { code: 'NO_INPUTS' },
      { code: 'INVALID_QUANTITY', goodName: 'Pan' },
    ])

    const original = store.findRecipeByName('Pan')
    expect(original).toBeDefined()
    expect(original?.id).toBe(created.recipe.id)
  })

  it('updates an existing recipe and keeps the same id', () => {
    const created = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const result = store.updateRecipe(created.recipe.id, {
      name: 'Pan integral',
      inputs: [{ goodName: 'Harina integral', quantity: 3 }],
      outputs: [{ goodName: 'Pan integral', quantity: 1 }],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.recipe.id).toBe(created.recipe.id)
    expect(result.recipe.name).toBe('Pan integral')

    const flourId = store.findGoodIdByName('Harina integral')
    const breadId = store.findGoodIdByName('Pan integral')
    expect(flourId).toBeDefined()
    expect(breadId).toBeDefined()

    if (flourId && breadId) {
      const flour = store.getGood(flourId)
      const bread = store.getGood(breadId)
      expect(flour).toBeDefined()
      expect(bread).toBeDefined()
      if (flour && bread) {
        expect(result.recipe.consumes(flour, 3)).toBe(true)
        expect(result.recipe.produces(bread, 1)).toBe(true)
      }
    }

    const catalogRecipe = store.findRecipeByName('Pan integral')
    expect(catalogRecipe).toBeDefined()
    expect(catalogRecipe?.id).toBe(created.recipe.id)
  })

  it('createGood rejects empty names and leaves catalog unchanged', () => {
    const result = store.createGood('')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EMPTY_NAME')
    expect(store.getGoods()).toHaveLength(0)
  })

  it('createGood adds a good to the catalog', () => {
    const result = store.createGood('Harina')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.good.name).toBe('Harina')
    expect(store.hasGoodNamed('Harina')).toBe(true)
    expect(store.getGoods()).toContainEqual(result.good)
  })

  it('creates missing goods inline and links recipes to them', () => {
    const first = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Harina de trigo')
        .withInput('Trigo', 1)
        .withOutput('Harina', 1)
        .build(),
    )
    expect(first.ok).toBe(true)

    const second = store.createRecipe(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(second.ok).toBe(true)

    expect(store.hasGoodNamed('Trigo')).toBe(true)
    expect(store.hasGoodNamed('Harina')).toBe(true)
    expect(store.hasGoodNamed('Pan')).toBe(true)

    const flourId = store.findGoodIdByName('Harina')
    expect(flourId).toBeDefined()

    const producer = store.findRecipeByName('Harina de trigo')
    const consumer = store.findRecipeByName('Pan')
    expect(producer).toBeDefined()
    expect(consumer).toBeDefined()

    if (producer && consumer && flourId) {
      expect(producer.usesGoodAsOutput(flourId)).toBe(true)
      expect(consumer.usesGoodAsInput(flourId)).toBe(true)
    }
  })

  describe('agents', () => {
    it('saves a valid agent with name and initial inventory', () => {
      const result = store.createAgent({
        name: 'Panadero',
        inventory: [
          { goodName: 'Harina', quantity: 10 },
          { goodName: 'Pan', quantity: 5 },
        ],
      })

      expect(result.ok).toBe(true)
      expect(store.agentCount()).toBe(1)

      const agent = store.findAgentByName('Panadero')
      expect(agent).toBeDefined()

      const flourId = store.findGoodIdByName('Harina')
      const breadId = store.findGoodIdByName('Pan')
      expect(flourId).toBeDefined()
      expect(breadId).toBeDefined()

      if (agent && flourId && breadId) {
        const flour = store.getGood(flourId)
        const bread = store.getGood(breadId)
        expect(flour).toBeDefined()
        expect(bread).toBeDefined()

        if (flour && bread) {
          expect(agent.has(flour, 10)).toBe(true)
          expect(agent.has(bread, 5)).toBe(true)
        }
      }
    })

    it('rejects an agent with an empty name and leaves catalog unchanged', () => {
      const result = store.createAgent({
        name: '',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toEqual([{ code: 'EMPTY_NAME' }])
      }

      expect(store.agentCount()).toBe(0)
    })

    it('rejects non-positive quantities and leaves catalog unchanged', () => {
      const result = store.createAgent({
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

      expect(store.agentCount()).toBe(0)
    })
  })
})
