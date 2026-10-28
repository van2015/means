import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { RecipePresenter } from '@/presentation/recipePresenter'

describe('RecipePresenter', () => {
  let stores: Stores
  let presenter: RecipePresenter

  beforeEach(() => {
    stores = createStores()
    presenter = new RecipePresenter(stores)
  })

  it('starts with an empty form', () => {
    expect(presenter.name).toBe('')
    expect(presenter.inputs).toEqual([])
    expect(presenter.outputs).toEqual([])
    expect(presenter.errors).toEqual([])
    expect(presenter.editingId).toBeNull()
  })

  it('creates a recipe and refreshes the list', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    presenter.setName('Pan')
    presenter.addInput()
    presenter.updateInput(0, 'goodName', 'Harina')
    presenter.updateInput(0, 'quantity', '2')
    presenter.addOutput()
    presenter.updateOutput(0, 'goodName', 'Pan')
    presenter.updateOutput(0, 'quantity', '1')

    presenter.submit()

    expect(presenter.recipes).toHaveLength(1)
    expect(presenter.recipes[0].name).toBe('Pan')
    expect(presenter.name).toBe('')
    expect(presenter.errors).toEqual([])
  })

  it('shows validation errors for invalid recipes', () => {
    presenter.submit()

    expect(presenter.errors).toEqual([{ code: 'NO_INPUTS' }, { code: 'NO_OUTPUTS' }])
    expect(presenter.recipes).toHaveLength(0)
  })

  it('loads a recipe into the form for editing', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    const result = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    presenter.startEdit(result.recipe)

    expect(presenter.name).toBe('Pan')
    expect(presenter.inputs[0].goodName).toBe('Harina')
    expect(presenter.inputs[0].quantity).toBe('2')
    expect(presenter.editingId).toBe(result.recipe.id)
  })

  it('updates an existing recipe and keeps the same id', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    const created = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    presenter.startEdit(created.recipe)
    presenter.setName('Pan integral')
    presenter.submit()

    expect(presenter.recipes[0].name).toBe('Pan integral')
    expect(presenter.recipes[0].id).toBe(created.recipe.id)
  })

  it('deletes a recipe', () => {
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')

    const created = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    presenter.deleteRecipe(created.recipe.id)

    expect(presenter.recipes).toHaveLength(0)
  })

  it('notifies subscribers when state changes', () => {
    let calls = 0
    presenter.subscribe(() => {
      calls++
    })

    presenter.setName('Pan')

    expect(calls).toBeGreaterThan(0)
  })
})
