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
})
