import { beforeEach, describe, expect, it } from 'vitest'
import { createRecipe, getGoods, getRecipes, resetStore } from '@/domain/recipeStore'

describe('createRecipe', () => {
  beforeEach(() => {
    resetStore()
  })

  it('saves a valid recipe with name, inputs and outputs', () => {
    createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    const recipes = getRecipes()
    expect(recipes).toHaveLength(1)
    expect(recipes[0].name).toBe('Pan')

    const goods = getGoods()
    expect(goods).toHaveLength(2)
    expect(goods.map((g) => g.name)).toContain('Harina')
    expect(goods.map((g) => g.name)).toContain('Pan')

    const flour = goods.find((g) => g.name === 'Harina')
    const breadGood = goods.find((g) => g.name === 'Pan')
    expect(recipes[0].inputs).toEqual([{ goodId: flour!.id, quantity: 2 }])
    expect(recipes[0].outputs).toEqual([{ goodId: breadGood!.id, quantity: 1 }])
  })

  it('rejects a recipe without inputs', () => {
    expect(() =>
      createRecipe({
        name: 'Pan',
        inputs: [],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      }),
    ).toThrow('Recipe must have at least one input')

    expect(getRecipes()).toHaveLength(0)
    expect(getGoods()).toHaveLength(0)
  })

  it('rejects a recipe without outputs', () => {
    expect(() =>
      createRecipe({
        name: 'Pan',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [],
      }),
    ).toThrow('Recipe must have at least one output')

    expect(getRecipes()).toHaveLength(0)
    expect(getGoods()).toHaveLength(0)
  })
})
