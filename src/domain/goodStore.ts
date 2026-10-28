import { generateId } from './id'
import type { Good } from './recipe'

export type { Good }

type CreateGoodResult =
  { ok: true; good: Good } | { ok: false; error: 'EMPTY_NAME' | 'DUPLICATE_NAME' }

export type FindGoodIdResult = { ok: true; id: string } | { ok: false; error: 'GOOD_NOT_FOUND' }

export type FindGoodResult = { ok: true; good: Good } | { ok: false; error: 'GOOD_NOT_FOUND' }

export class GoodStore {
  private goods: Good[] = []

  reset(): void {
    this.goods = []
  }

  all(): Good[] {
    return this.goods
  }

  hasNamed(name: string): boolean {
    return this.goods.some((g) => g.name === name)
  }

  findIdByName(name: string): FindGoodIdResult {
    const id = this.goods.find((g) => g.name === name)?.id
    if (id === undefined) {
      return { ok: false, error: 'GOOD_NOT_FOUND' }
    }
    return { ok: true, id }
  }

  get(id: string): FindGoodResult {
    const good = this.goods.find((g) => g.id === id)
    if (good === undefined) {
      return { ok: false, error: 'GOOD_NOT_FOUND' }
    }
    return { ok: true, good }
  }

  create(name: string): CreateGoodResult {
    if (name.trim() === '') {
      return { ok: false, error: 'EMPTY_NAME' }
    }

    if (this.hasNamed(name)) {
      return { ok: false, error: 'DUPLICATE_NAME' }
    }

    const created: Good = { id: generateId(), name }
    this.goods.push(created)
    return { ok: true, good: created }
  }

  require(name: string): FindGoodResult {
    const good = this.goods.find((g) => g.name === name)
    if (good === undefined) {
      return { ok: false, error: 'GOOD_NOT_FOUND' }
    }
    return { ok: true, good }
  }
}
