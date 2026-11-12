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
  // a rule whose recipe was deleted is not silently shown as an empty name:
  // it stays visible (and editable) with an explicit placeholder
  return recipes.find((recipe) => recipe.id === recipeRef.recipeId)?.name ?? '(receta borrada)'
}

export function operatorLabel(operator: Rule['condition']['operator']): string {
  return operator === 'AT_LEAST' ? 'al menos' : 'menos de'
}
