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

export type RecipeDraft = {
  name: string
  inputs: DraftLine[]
  outputs: DraftLine[]
}

export type RecipeError =
  | { code: 'NO_INPUTS' }
  | { code: 'NO_OUTPUTS' }
  | { code: 'INVALID_QUANTITY'; goodName: string }
  | { code: 'UNKNOWN_GOOD'; goodName: string }
  | { code: 'RECIPE_NAME_EXISTS' }
  | { code: 'RECIPE_NOT_FOUND' }

export type RecipeResult = { ok: true; recipe: Recipe } | { ok: false; errors: RecipeError[] }

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

  consumes(good: Good, quantity: number): boolean {
    return this.inputs.some((line) => line.goodId === good.id && line.quantity === quantity)
  }

  produces(good: Good, quantity: number): boolean {
    return this.outputs.some((line) => line.goodId === good.id && line.quantity === quantity)
  }

  usesGoodAsInput(goodId: string): boolean {
    return this.inputs.some((line) => line.goodId === goodId)
  }

  usesGoodAsOutput(goodId: string): boolean {
    return this.outputs.some((line) => line.goodId === goodId)
  }
}

function validateRequiredLines(lines: unknown[], error: RecipeError, errors: RecipeError[]): void {
  if (lines.length === 0) {
    errors.push(error)
  }
}

function validatePositiveQuantities(lines: DraftLine[], errors: RecipeError[]): void {
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
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
