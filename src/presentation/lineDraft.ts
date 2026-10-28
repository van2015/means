import { generateId } from '@/domain/id'

export type LineDraftField = 'goodName' | 'quantity'

export type LineDraft = {
  id: string
  goodName: string
  quantity: string
}

export function createLineDraft(goodName = '', quantity = ''): LineDraft {
  return { id: generateId(), goodName, quantity }
}

export function removeLineAt(lines: LineDraft[], index: number): LineDraft[] {
  return lines.filter((_, lineIndex) => lineIndex !== index)
}
