import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRecipe,
  findGoodIdByName,
  getGoods,
  getRecipes,
  hasGoodNamed,
  resetStore,
} from '@/domain/recipeStore'
import { RecipeBuilder } from '../helpers/recipeBuilder'

function buildRecipe(create: (builder: RecipeBuilder) => RecipeBuilder) {
  const draft = create(RecipeBuilder.aRecipe()).build()
  return createRecipe(draft.name, draft.inputs, draft.outputs)
}

describe('createRecipe', () => {
  beforeEach(() => {
    resetStore()
  })

  it('saves a valid recipe with name, inputs and outputs', () => {
    const result = buildRecipe((recipe) =>
      recipe
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1),
    )

    expect(result.ok).toBe(true)

    const recipes = getRecipes()
    expect(recipes).toHaveLength(1)

    const goods = getGoods()
    const recipe = recipes[0]
    expect(recipe.name).toBe('Pan')
    expect(recipe.hasInput('Harina', 2, goods)).toBe(true)
    expect(recipe.hasOutput('Pan', 1, goods)).toBe(true)
    expect(hasGoodNamed('Harina')).toBe(true)
    expect(hasGoodNamed('Pan')).toBe(true)
  })

  it('rejects a recipe without inputs', () => {
    const result = buildRecipe((recipe) =>
      recipe
        .named('Pan')
        .withOutput('Pan', 1),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_INPUTS' }])
    }

    expect(getRecipes()).toHaveLength(0)
  })

  it('rejects a recipe without outputs', () => {
    const result = buildRecipe((recipe) =>
      recipe
        .named('Pan')
        .withInput('Harina', 2),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_OUTPUTS' }])
    }

    expect(getRecipes()).toHaveLength(0)
  })

  it('rejects quantities less than or equal to zero', () => {
    const result = buildRecipe((recipe) =>
      recipe
        .named('Pan')
        .withInput('Harina', 0)
        .withOutput('Pan', -1),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: 'INVALID_QUANTITY', goodName: 'Harina' },
        { code: 'INVALID_QUANTITY', goodName: 'Pan' },
      ])
    }

    expect(getRecipes()).toHaveLength(0)
  })

  it('creates missing goods inline and links recipes to them', () => {
    const first = buildRecipe((recipe) =>
      recipe
        .named('Harina de trigo')
        .withInput('Trigo', 1)
        .withOutput('Harina', 1),
    )
    expect(first.ok).toBe(true)

    const second = buildRecipe((recipe) =>
      recipe
        .named('Pan')
        .withInput('Harina', 2)
        .withOutput('Pan', 1),
    )
    expect(second.ok).toBe(true)

    expect(hasGoodNamed('Trigo')).toBe(true)
    expect(hasGoodNamed('Harina')).toBe(true)
    expect(hasGoodNamed('Pan')).toBe(true)

    const flourId = findGoodIdByName('Harina')
    expect(flourId).toBeDefined()

    if (first.ok && second.ok && flourId) {
      expect(first.recipe.outputs[0].goodId).toBe(flourId)
      expect(second.recipe.inputs[0].goodId).toBe(flourId)
    }
  })
})
