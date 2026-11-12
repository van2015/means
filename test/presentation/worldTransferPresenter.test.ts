import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { WorldTransferPresenter } from '@/presentation/worldTransferPresenter'

describe('WorldTransferPresenter', () => {
  let stores: Stores
  let presenter: WorldTransferPresenter
  let harinaId: string
  let recipeId: string
  let agentId: string

  beforeEach(() => {
    stores = createStores()
    presenter = new WorldTransferPresenter(stores)

    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')
    const harina = stores.goodStore.findIdByName('Harina')
    if (!harina.ok) throw new Error('Good not found')
    harinaId = harina.id

    const recipe = stores.recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    if (!recipe.ok) throw new Error('Recipe creation failed')
    recipeId = recipe.recipe.id

    const agent = stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })
    if (!agent.ok) throw new Error('Agent creation failed')
    agentId = agent.agent.id
  })

  it('starts with nothing selected and cannot export', () => {
    expect(presenter.selectedCount).toBe(0)
    expect(presenter.canExport).toBe(false)
    expect(presenter.exportJson()).toBeNull()
    expect(presenter.importErrors).toEqual([])
    expect(presenter.importSummary).toBeNull()
  })

  it('toggles selection per type and counts them', () => {
    presenter.toggleGood(harinaId)
    presenter.toggleRecipe(recipeId)
    presenter.toggleAgent(agentId)
    expect(presenter.selectedCount).toBe(3)
    expect(presenter.selectedGoods).toEqual([harinaId])

    presenter.toggleGood(harinaId)
    expect(presenter.selectedCount).toBe(2)
    expect(presenter.selectedGoods).toEqual([])
    expect(presenter.selectedRecipes).toEqual([recipeId])
    expect(presenter.selectedAgents).toEqual([agentId])
  })

  it('notifies subscribers on selection changes', () => {
    let calls = 0
    presenter.subscribe(() => {
      calls++
    })

    presenter.toggleGood(harinaId)

    expect(calls).toBeGreaterThan(0)
  })

  it('exports the selected subset as JSON with dependency closure', () => {
    presenter.toggleRecipe(recipeId)

    const json = presenter.exportJson()

    expect(json).not.toBeNull()
    const parsed = JSON.parse(json ?? '{}')
    expect(parsed.version).toBe(1)
    expect(parsed.recipes.map((r: { name: string }) => r.name)).toEqual(['Pan de harina'])
    expect(parsed.goods.map((g: { name: string }) => g.name).sort()).toEqual(['Harina', 'Pan'])
    expect(parsed.agents).toEqual([])
  })

  it('imports a valid file and reports the summary', () => {
    const file = JSON.stringify({
      version: 1,
      goods: [{ name: 'Madera' }],
      recipes: [],
      agents: [],
    })

    presenter.importJson(file)

    expect(presenter.importErrors).toEqual([])
    expect(presenter.importSummary?.goods).toEqual({ added: 1, skipped: 0 })
    expect(stores.goodStore.hasNamed('Madera')).toBe(true)
  })

  it('reports errors for an invalid file without touching the world', () => {
    presenter.importJson('{broken')

    expect(presenter.importSummary).toBeNull()
    expect(presenter.importErrors).toEqual([{ code: 'INVALID_JSON' }])
    expect(stores.goodStore.all()).toHaveLength(2)
  })

  it('replaces errors with a summary after a successful import, and vice versa', () => {
    presenter.importJson('{broken')
    expect(presenter.importErrors).toHaveLength(1)

    presenter.importJson(JSON.stringify({ version: 1, goods: [], recipes: [], agents: [] }))
    expect(presenter.importErrors).toEqual([])
    expect(presenter.importSummary).not.toBeNull()

    presenter.importJson('{broken')
    expect(presenter.importSummary).toBeNull()
    expect(presenter.importErrors).toHaveLength(1)
  })

  it('clears the last result', () => {
    presenter.importJson('{broken')
    presenter.clearResult()

    expect(presenter.importErrors).toEqual([])
    expect(presenter.importSummary).toBeNull()
  })

  it('notifies subscribers when importing', () => {
    let calls = 0
    presenter.subscribe(() => {
      calls++
    })

    presenter.importJson(JSON.stringify({ version: 1, goods: [], recipes: [], agents: [] }))

    expect(calls).toBeGreaterThan(0)
  })
})
