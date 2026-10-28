export type LineDraft = {
  goodName: string
  quantity: string
}

export function removeLineAt(lines: LineDraft[], index: number): LineDraft[] {
  return lines.filter((_, lineIndex) => lineIndex !== index)
}
