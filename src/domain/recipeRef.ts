import type { Agent, RuleRecipeRef } from './agent'
import type { Recipe } from './recipe'
import type { RecipeStore } from './recipeStore'

/** Resolves a rule's recipe reference against the agent or the catalog. */
export function resolveRecipe(
  agent: Agent,
  recipeRef: RuleRecipeRef,
  recipeStore: RecipeStore,
): Recipe | null {
  if (recipeRef.source === 'agent') {
    return agent.recipes.find((recipe) => recipe.id === recipeRef.recipeId) ?? null
  }
  const result = recipeStore.findById(recipeRef.recipeId)
  return result.ok ? result.recipe : null
}
