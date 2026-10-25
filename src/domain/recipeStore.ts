export type Good = {
  id: string
  name: string
}

export type RecipeLine = {
  goodId: string
  quantity: number
}

export type Recipe = {
  id: string
  name: string
  inputs: RecipeLine[]
  outputs: RecipeLine[]
}

export type CreateRecipeInput = {
  name: string
  inputs: { goodName: string; quantity: number }[]
  outputs: { goodName: string; quantity: number }[]
}

let goods: Good[] = []
let recipes: Recipe[] = []

export function resetStore(): void {
  goods = []
  recipes = []
}

export function getGoods(): Good[] {
  return goods
}

export function getRecipes(): Recipe[] {
  return recipes
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

function findOrCreateGood(name: string): Good {
  const existing = goods.find((g) => g.name === name)
  if (existing) return existing
  const created: Good = { id: generateId(), name }
  goods.push(created)
  return created
}

export function createRecipe(input: CreateRecipeInput): Recipe {
  if (input.inputs.length === 0) {
    throw new Error('Recipe must have at least one input')
  }
  if (input.outputs.length === 0) {
    throw new Error('Recipe must have at least one output')
  }

  const recipe: Recipe = {
    id: generateId(),
    name: input.name,
    inputs: input.inputs.map((line) => ({
      goodId: findOrCreateGood(line.goodName).id,
      quantity: line.quantity,
    })),
    outputs: input.outputs.map((line) => ({
      goodId: findOrCreateGood(line.goodName).id,
      quantity: line.quantity,
    })),
  }

  recipes.push(recipe)
  return recipe
}
