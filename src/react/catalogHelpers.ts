import type { Good } from '@/domain/goodStore'

export function goodName(goods: Good[], goodId: string): string {
  return goods.find((good) => good.id === goodId)?.name ?? ''
}
