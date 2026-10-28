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
    goodStore.create('Harina')
    goodStore.create('Pan')

    const result = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
    )

    expect(result.ok).toBe(true)
    expect(store.count()).toBe(1)

    const recipeResult = store.findByName('Pan')
    expect(recipeResult.ok).toBe(true)
    if (!recipeResult.ok) return
    const recipe = recipeResult.recipe

    const flourResult = goodStore.findIdByName('Harina')
    const breadResult = goodStore.findIdByName('Pan')
    expect(flourResult.ok).toBe(true)
    expect(breadResult.ok).toBe(true)

    if (!recipe || !flourResult.ok || !breadResult.ok) return

    const flourResult2 = goodStore.get(flourResult.id)
    const breadResult2 = goodStore.get(breadResult.id)
    expect(flourResult2.ok).toBe(true)
    expect(breadResult2.ok).toBe(true)

    if (!flourResult2.ok || !breadResult2.ok) return

    expect(recipe.consumes(flourResult2.good, 2)).toBe(true)
    expect(recipe.produces(breadResult2.good, 1)).toBe(true)
  })

  it('rejects a recipe without inputs', () => {
    goodStore.create('Pan')

    const result = store.create(RecipeBuilder.aRecipe().named('Pan').withOutput('Pan', 1).build())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_INPUTS' }])
    }

    expect(store.count()).toBe(0)
  })

  it('rejects a recipe without outputs', () => {
    goodStore.create('Harina')

    const result = store.create(RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).build())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_OUTPUTS' }])
    }

    expect(store.count()).toBe(0)
  })

  it('rejects quantities less than or equal to zero', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const result = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 0).withOutput('Pan', -1).build(),
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

  it('rejects unknown goods', () => {
    const result = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: 'UNKNOWN_GOOD', goodName: 'Harina' })
      expect(result.errors).toContainEqual({ code: 'UNKNOWN_GOOD', goodName: 'Pan' })
    }
    expect(store.count()).toBe(0)
  })

  it('deleteRecipe removes the recipe from the catalog', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const created = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return

    store.delete(created.recipe.id)

    expect(store.count()).toBe(0)
    const notFound = store.findByName('Pan')
    expect(notFound.ok).toBe(false)
    if (!notFound.ok) {
      expect(notFound.error).toBe('RECIPE_NOT_FOUND')
    }
  })

  it('update rejects invalid drafts and leaves the original untouched', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')

    const created = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
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

    const originalResult = store.findByName('Pan')
    expect(originalResult.ok).toBe(true)
    if (!originalResult.ok) return
    expect(originalResult.recipe.id).toBe(created.recipe.id)
  })

  it('updates an existing recipe and keeps the same id', () => {
    goodStore.create('Harina')
    goodStore.create('Pan')
    goodStore.create('Harina integral')
    goodStore.create('Pan integral')

    const created = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
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

    const flourResult = goodStore.findIdByName('Harina integral')
    const breadResult = goodStore.findIdByName('Pan integral')
    expect(flourResult.ok).toBe(true)
    expect(breadResult.ok).toBe(true)

    if (!flourResult.ok || !breadResult.ok) return

    const flourResult2 = goodStore.get(flourResult.id)
    const breadResult2 = goodStore.get(breadResult.id)
    expect(flourResult2.ok).toBe(true)
    expect(breadResult2.ok).toBe(true)
    if (!flourResult2.ok || !breadResult2.ok) return

    expect(result.recipe.consumes(flourResult2.good, 3)).toBe(true)
    expect(result.recipe.produces(breadResult2.good, 1)).toBe(true)

    const catalogRecipeResult = store.findByName('Pan integral')
    expect(catalogRecipeResult.ok).toBe(true)
    if (!catalogRecipeResult.ok) return
    expect(catalogRecipeResult.recipe.id).toBe(created.recipe.id)
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

  it('links recipes to pre-existing goods without creating duplicates', () => {
    goodStore.create('Trigo')
    goodStore.create('Harina')
    goodStore.create('Pan')

    const first = store.create(
      RecipeBuilder.aRecipe()
        .named('Harina de trigo')
        .withInput('Trigo', 1)
        .withOutput('Harina', 1)
        .build(),
    )
    expect(first.ok).toBe(true)

    const second = store.create(
      RecipeBuilder.aRecipe().named('Pan').withInput('Harina', 2).withOutput('Pan', 1).build(),
    )
    expect(second.ok).toBe(true)

    expect(goodStore.hasNamed('Trigo')).toBe(true)
    expect(goodStore.hasNamed('Harina')).toBe(true)
    expect(goodStore.hasNamed('Pan')).toBe(true)

    const flourResult = goodStore.findIdByName('Harina')
    expect(flourResult.ok).toBe(true)

    const producerResult = store.findByName('Harina de trigo')
    const consumerResult = store.findByName('Pan')
    expect(producerResult.ok).toBe(true)
    expect(consumerResult.ok).toBe(true)

    if (!producerResult.ok || !consumerResult.ok || !flourResult.ok) return

    expect(producerResult.recipe.usesGoodAsOutput(flourResult.id)).toBe(true)
    expect(consumerResult.recipe.usesGoodAsInput(flourResult.id)).toBe(true)
  })
})
