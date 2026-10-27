import { beforeEach, describe, expect, it } from 'vitest'
import { GoodStore } from '@/domain/goodStore'
import { RecipeStore } from '@/domain/recipeStore'
import { RecipeBuilder } from '../helpers/recipeBuilder'

describe('RecipeStore', () => {
  let goodStore: GoodStore
  let store: RecipeStore

  beforeEach(() => {
    goodStore = new GoodStore()
    store = new RecipeStore(goodStore)
  })

  it('saves a valid recipe with name, inputs and outputs', () => {
    const result = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )

    expect(result.ok).toBe(true)
    expect(store.count()).toBe(1)

    const recipe = store.findByName('Pan')
    expect(recipe).toBeDefined()

    const flourId = goodStore.findIdByName('Harina')
    const breadId = goodStore.findIdByName('Pan')
    expect(flourId).toBeDefined()
    expect(breadId).toBeDefined()

    if (recipe && flourId && breadId) {
      const flour = goodStore.get(flourId)
      const bread = goodStore.get(breadId)
      expect(flour).toBeDefined()
      expect(bread).toBeDefined()

      if (flour && bread) {
        expect(recipe.consumes(flour, 2)).toBe(true)
        expect(recipe.produces(bread, 1)).toBe(true)
      }
    }
  })

  it('rejects a recipe without inputs', () => {
    const result = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withOutput('Pan', 1)
        .build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_INPUTS' }])
    }

    expect(store.count()).toBe(0)
  })

  it('rejects a recipe without outputs', () => {
    const result = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_OUTPUTS' }])
    }

    expect(store.count()).toBe(0)
  })

  it('rejects quantities less than or equal to zero', () => {
    const result = store.create(
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

    expect(store.count()).toBe(0)
  })

  it('deleteRecipe removes the recipe from the catalog', () => {
    const created = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    store.delete(created.recipe.id)

    expect(store.count()).toBe(0)
    expect(store.findByName('Pan')).toBeUndefined()
  })

  it('update rejects invalid drafts and leaves the original untouched', () => {
    const created = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const result = store.update(created.recipe.id, {
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

    const original = store.findByName('Pan')
    expect(original).toBeDefined()
    expect(original?.id).toBe(created.recipe.id)
  })

  it('updates an existing recipe and keeps the same id', () => {
    const created = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const result = store.update(created.recipe.id, {
      name: 'Pan integral',
      inputs: [{ goodName: 'Harina integral', quantity: 3 }],
      outputs: [{ goodName: 'Pan integral', quantity: 1 }],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.recipe.id).toBe(created.recipe.id)
    expect(result.recipe.name).toBe('Pan integral')

    const flourId = goodStore.findIdByName('Harina integral')
    const breadId = goodStore.findIdByName('Pan integral')
    expect(flourId).toBeDefined()
    expect(breadId).toBeDefined()

    if (flourId && breadId) {
      const flour = goodStore.get(flourId)
      const bread = goodStore.get(breadId)
      expect(flour).toBeDefined()
      expect(bread).toBeDefined()
      if (flour && bread) {
        expect(result.recipe.consumes(flour, 3)).toBe(true)
        expect(result.recipe.produces(bread, 1)).toBe(true)
      }
    }

    const catalogRecipe = store.findByName('Pan integral')
    expect(catalogRecipe).toBeDefined()
    expect(catalogRecipe?.id).toBe(created.recipe.id)
  })

  it('createGood rejects empty names and leaves catalog unchanged', () => {
    const result = goodStore.create('')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('EMPTY_NAME')
    expect(goodStore.all()).toHaveLength(0)
  })

  it('createGood adds a good to the catalog', () => {
    const result = goodStore.create('Harina')

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.good.name).toBe('Harina')
    expect(goodStore.hasNamed('Harina')).toBe(true)
    expect(goodStore.all()).toContainEqual(result.good)
  })

  it('creates missing goods inline and links recipes to them', () => {
    const first = store.create(
      RecipeBuilder.aRecipe()
        .named('Harina de trigo')
        .withInput('Trigo', 1)
        .withOutput('Harina', 1)
        .build(),
    )
    expect(first.ok).toBe(true)

    const second = store.create(
      RecipeBuilder.aRecipe()
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1)
        .build(),
    )
    expect(second.ok).toBe(true)

    expect(goodStore.hasNamed('Trigo')).toBe(true)
    expect(goodStore.hasNamed('Harina')).toBe(true)
    expect(goodStore.hasNamed('Pan')).toBe(true)

    const flourId = goodStore.findIdByName('Harina')
    expect(flourId).toBeDefined()

    const producer = store.findByName('Harina de trigo')
    const consumer = store.findByName('Pan')
    expect(producer).toBeDefined()
    expect(consumer).toBeDefined()

    if (producer && consumer && flourId) {
      expect(producer.usesGoodAsOutput(flourId)).toBe(true)
      expect(consumer.usesGoodAsInput(flourId)).toBe(true)
    }
  })
})
