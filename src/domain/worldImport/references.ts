import type { WorldStores } from '../stores'
import {
  type ExportedAgent,
  type ExportedLine,
  type ExportedRecipe,
  type ExportedRule,
  type WorldExport,
} from '../worldExport'
import { type ImportError, ValidationContext } from './validation'

type ReferenceContext = {
  hasGood: (name: string) => boolean
  hasCatalogRecipe: (name: string) => boolean
}

function createReferenceContext(stores: WorldStores, data: WorldExport): ReferenceContext {
  const worldGoods = new Set(stores.goodStore.names())
  const fileGoods = new Set(data.goods.map((good) => good.name))
  const worldRecipes = new Set(stores.recipeStore.names())
  const fileRecipes = new Set(data.recipes.map((recipe) => recipe.name))
  return {
    hasGood: (name) => worldGoods.has(name) || fileGoods.has(name),
    hasCatalogRecipe: (name) => worldRecipes.has(name) || fileRecipes.has(name),
  }
}

function missingReference(
  kind: 'bien' | 'receta',
  name: string,
  source: 'receta' | 'agente',
  sourceName: string,
): ImportError {
  return { code: 'MISSING_REFERENCE', kind, name, source, sourceName }
}

function checkLines(
  lines: ExportedLine[],
  source: 'receta' | 'agente',
  sourceName: string,
  context: ReferenceContext,
  ctx: ValidationContext,
): void {
  for (const line of lines) {
    if (!context.hasGood(line.good)) {
      ctx.push(missingReference('bien', line.good, source, sourceName))
    }
  }
}

function validateRecipeReferences(
  recipes: ExportedRecipe[],
  context: ReferenceContext,
  ctx: ValidationContext,
): void {
  for (const recipe of recipes) {
    checkLines(recipe.inputs, 'receta', recipe.name, context, ctx)
    checkLines(recipe.outputs, 'receta', recipe.name, context, ctx)
  }
}

function validateRuleReferences(
  rule: ExportedRule,
  agent: ExportedAgent,
  agentRecipeNames: Set<string>,
  context: ReferenceContext,
  ctx: ValidationContext,
): void {
  if (!context.hasGood(rule.condition.good)) {
    ctx.push(missingReference('bien', rule.condition.good, 'agente', agent.name))
  }
  const recipeExists =
    rule.recipe.source === 'catalog'
      ? context.hasCatalogRecipe(rule.recipe.name)
      : agentRecipeNames.has(rule.recipe.name)
  if (!recipeExists) {
    ctx.push(missingReference('receta', rule.recipe.name, 'agente', agent.name))
  }
}

function validateAgentReferences(
  agents: ExportedAgent[],
  context: ReferenceContext,
  ctx: ValidationContext,
): void {
  for (const agent of agents) {
    checkLines(agent.inventory, 'agente', agent.name, context, ctx)
    for (const recipe of agent.recipes) {
      checkLines(recipe.inputs, 'receta', recipe.name, context, ctx)
      checkLines(recipe.outputs, 'receta', recipe.name, context, ctx)
    }
    const agentRecipeNames = new Set(agent.recipes.map((recipe) => recipe.name))
    for (const rule of agent.rules) {
      validateRuleReferences(rule, agent, agentRecipeNames, context, ctx)
    }
  }
}

export function validateReferences(stores: WorldStores, data: WorldExport): ImportError[] {
  const ctx = new ValidationContext()
  const context = createReferenceContext(stores, data)
  validateRecipeReferences(data.recipes, context, ctx)
  validateAgentReferences(data.agents, context, ctx)
  return ctx.all()
}
