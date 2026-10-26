export type Good = {
  id: string
  name: string
}

export type RecipeLine = {
  goodId: string
  quantity: number
}

export type DraftLine = {
  goodName: string
  quantity: number
}

export type RecipeError =
  | { code: 'NO_INPUTS' }
  | { code: 'NO_OUTPUTS' }
  | { code: 'INVALID_QUANTITY'; goodName: string }

export type RecipeResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; errors: RecipeError[] }

function findGoodName(goodId: string, goods: Good[]): string {
  const good = goods.find((g) => g.id === goodId)
  if (!good) throw new Error(`Good with id ${goodId} not found`)
  return good.name
}

export class Recipe {
  readonly id: string
  readonly name: string
  readonly inputs: RecipeLine[]
  readonly outputs: RecipeLine[]

  constructor(id: string, name: string, inputs: RecipeLine[], outputs: RecipeLine[]) {
    this.id = id
    this.name = name
    this.inputs = inputs
    this.outputs = outputs
  }

  hasInput(goodName: string, quantity: number, goods: Good[]): boolean {
    return this.inputs.some(
      (line) => findGoodName(line.goodId, goods) === goodName && line.quantity === quantity,
    )
  }

  hasOutput(goodName: string, quantity: number, goods: Good[]): boolean {
    return this.outputs.some(
      (line) => findGoodName(line.goodId, goods) === goodName && line.quantity === quantity,
    )
  }
}

function validateRequiredLines(
  lines: unknown[],
  error: RecipeError,
  errors: RecipeError[],
): void {
  if (lines.length === 0) {
    errors.push(error)
  }
}

function validatePositiveQuantities(
  lines: DraftLine[],
  errors: RecipeError[],
): void {
  for (const line of lines) {
    if (line.quantity <= 0) {
      errors.push({ code: 'INVALID_QUANTITY', goodName: line.goodName })
    }
  }
}

export function validateRecipe(inputs: DraftLine[], outputs: DraftLine[]): RecipeError[] {
  const errors: RecipeError[] = []

  validateRequiredLines(inputs, { code: 'NO_INPUTS' }, errors)
  validateRequiredLines(outputs, { code: 'NO_OUTPUTS' }, errors)

  validatePositiveQuantities(inputs, errors)
  validatePositiveQuantities(outputs, errors)

  return errors
}

export function createRecipeEntity(
  id: string,
  name: string,
  inputs: RecipeLine[],
  outputs: RecipeLine[],
): Recipe {
  return new Recipe(id, name, inputs, outputs)
}
