import type { GoodStore } from './goodStore'
import { type DraftLine, Recipe, type RecipeDraft, type RecipeLine } from './recipe'

type UnknownGoodError = { code: 'UNKNOWN_GOOD'; goodName: string }

/** Resolves a draft good name to its id, failing loudly when it is missing. */
function goodIdFor(goodStore: GoodStore, name: string): string {
  const result = goodStore.findIdByName(name)
  if (!result.ok) {
    throw new Error(`Unexpected missing good: ${name}`)
  }
  return result.id
}

/** Maps draft lines (good names) onto entity lines (good ids). */
export function resolveDraftLines(goodStore: GoodStore, lines: DraftLine[]): RecipeLine[] {
  return lines.map((line) => ({
    goodId: goodIdFor(goodStore, line.goodName),
    quantity: line.quantity,
  }))
}

/** Builds a recipe entity out of a draft, resolving good names to ids. */
export function buildRecipeFromDraft(goodStore: GoodStore, id: string, draft: RecipeDraft): Recipe {
  return new Recipe(
    id,
    draft.name,
    resolveDraftLines(goodStore, draft.inputs),
    resolveDraftLines(goodStore, draft.outputs),
  )
}

/** Reports every line whose good is not registered in the good store. */
export function unknownGoodLineErrors(
  goodStore: GoodStore,
  lines: { goodName: string }[],
): UnknownGoodError[] {
  const errors: UnknownGoodError[] = []
  for (const line of lines) {
    if (!goodStore.findIdByName(line.goodName).ok) {
      errors.push({ code: 'UNKNOWN_GOOD', goodName: line.goodName })
    }
  }
  return errors
}
