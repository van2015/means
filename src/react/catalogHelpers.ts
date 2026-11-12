import type { Rule } from '@/domain/agentStore'
import type { Good } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'

export function goodName(goods: Good[], goodId: string): string {
  return goods.find((good) => good.id === goodId)?.name ?? ''
}

export function recipeName(
  recipeRef: Rule['recipeRef'],
  catalogRecipes: Recipe[],
  agentRecipes: Recipe[],
): string {
  const recipes = recipeRef.source === 'catalog' ? catalogRecipes : agentRecipes
  return recipes.find((recipe) => recipe.id === recipeRef.recipeId)?.name ?? ''
}

export function operatorLabel(operator: Rule['condition']['operator']): string {
  return operator === 'AT_LEAST' ? 'al menos' : 'menos de'
}
