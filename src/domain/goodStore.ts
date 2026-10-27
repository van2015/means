import type { Good } from './recipe'

export type { Good }

type CreateGoodResult =
  | { ok: true; good: Good }
  | { ok: false; error: 'EMPTY_NAME' }

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

  findIdByName(name: string): string | undefined {
    return this.goods.find((g) => g.name === name)?.id
  }

  get(id: string): Good | undefined {
    return this.goods.find((g) => g.id === id)
  }

  create(name: string): CreateGoodResult {
    if (name.trim() === '') {
      return { ok: false, error: 'EMPTY_NAME' }
    }

    const good = this.resolve(name)
    return { ok: true, good }
  }

  resolve(name: string): Good {
    const existing = this.goods.find((g) => g.name === name)
    if (existing) return existing
    const created: Good = { id: generateId(), name }
    this.goods.push(created)
    return created
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const goodStore = new GoodStore()
