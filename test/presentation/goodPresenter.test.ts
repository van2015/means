import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { GoodPresenter } from '@/presentation/goodPresenter'

describe('GoodPresenter', () => {
  let stores: Stores
  let presenter: GoodPresenter

  beforeEach(() => {
    stores = createStores()
    presenter = new GoodPresenter(stores)
  })

  it('registers a good and clears the input', () => {
    presenter.setGoodName('Harina')
    presenter.registerGood()

    expect(presenter.goods).toHaveLength(1)
    expect(presenter.goods[0].name).toBe('Harina')
    expect(presenter.goodName).toBe('')
    expect(presenter.goodError).toBeNull()
  })

  it('shows an error for empty good names', () => {
    presenter.setGoodName('   ')
    presenter.registerGood()

    expect(presenter.goods).toHaveLength(0)
    expect(presenter.goodError).toBe('El nombre no puede estar vacío')
  })

  it('notifies subscribers when goods change', () => {
    let calls = 0
    presenter.subscribe(() => {
      calls++
    })

    presenter.registerGood()

    expect(calls).toBeGreaterThan(0)
  })
})
