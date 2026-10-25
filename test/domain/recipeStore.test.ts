import { beforeEach, describe, expect, it } from 'vitest'
import { createRecipe, getGoods, getRecipes, resetStore } from '@/domain/recipeStore'

describe('createRecipe', () => {
  beforeEach(() => {
    resetStore()
  })

  it('saves a valid recipe with name, inputs and outputs', () => {
    const result = createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    expect(result.ok).toBe(true)

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
    const result = createRecipe({
      name: 'Pan',
      inputs: [],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_INPUTS' }])
    }

    expect(getRecipes()).toHaveLength(0)
    expect(getGoods()).toHaveLength(0)
  })

  it('rejects a recipe without outputs', () => {
    const result = createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: 'NO_OUTPUTS' }])
    }

    expect(getRecipes()).toHaveLength(0)
    expect(getGoods()).toHaveLength(0)
  })

  it('rejects quantities less than or equal to zero', () => {
    const result = createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 0 }],
      outputs: [{ goodName: 'Pan', quantity: -1 }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: 'INVALID_QUANTITY', goodName: 'Harina' },
        { code: 'INVALID_QUANTITY', goodName: 'Pan' },
      ])
    }

    expect(getRecipes()).toHaveLength(0)
    expect(getGoods()).toHaveLength(0)
  })
})
