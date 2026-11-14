import type { AgentStore } from '../agentStore'
import type { GoodStore } from '../goodStore'
import type { DraftLine } from '../recipe'
import type { RecipeStore } from '../recipeStore'
import type { WorldStores } from '../stores'
import {
  type ExportedAgent,
  type ExportedLine,
  type ExportedRecipe,
  type ExportedRule,
  type WorldExport,
} from '../worldExport'

export type ImportSummary = {
  goods: { added: number; skipped: number }
  recipes: { added: number; skipped: number }
  agents: { added: number; skipped: number }
  rules: { added: number; skipped: number }
}

function toDraftLines(lines: ExportedLine[]): DraftLine[] {
  return lines.map((line) => ({ goodName: line.good, quantity: line.quantity }))
}

type ImportKind = keyof ImportSummary

/**
 * Counts what an import run adds and skips. The apply phase mutates the
 * counters only through these two methods instead of editing the summary.
 */
class ImportCounter {
  private readonly counts: ImportSummary = {
    goods: { added: 0, skipped: 0 },
    recipes: { added: 0, skipped: 0 },
    agents: { added: 0, skipped: 0 },
    rules: { added: 0, skipped: 0 },
  }

  added(kind: ImportKind, count = 1): void {
    this.counts[kind].added += count
  }

  skipped(kind: ImportKind, count = 1): void {
    this.counts[kind].skipped += count
  }

  toSummary(): ImportSummary {
    return {
      goods: { ...this.counts.goods },
      recipes: { ...this.counts.recipes },
      agents: { ...this.counts.agents },
      rules: { ...this.counts.rules },
    }
  }
}

function applyGoods(
  goodStore: GoodStore,
  goods: WorldExport['goods'],
  counter: ImportCounter,
): void {
  for (const good of goods) {
    if (goodStore.hasNamed(good.name)) {
      counter.skipped('goods')
    } else {
      goodStore.create(good.name)
      counter.added('goods')
    }
  }
}

function applyRecipes(
  recipeStore: RecipeStore,
  recipes: ExportedRecipe[],
  counter: ImportCounter,
): void {
  for (const recipe of recipes) {
    if (recipeStore.findByName(recipe.name).ok) {
      counter.skipped('recipes')
      continue
    }
    recipeStore.create({
      name: recipe.name,
      inputs: toDraftLines(recipe.inputs),
      outputs: toDraftLines(recipe.outputs),
    })
    counter.added('recipes')
  }
}

function applyAgents(stores: WorldStores, agents: ExportedAgent[], counter: ImportCounter): void {
  for (const agent of agents) {
    if (stores.agentStore.findByName(agent.name).ok) {
      counter.skipped('agents')
      counter.skipped('recipes', agent.recipes.length)
      counter.skipped('rules', agent.rules.length)
      continue
    }

    const created = stores.agentStore.create({
      name: agent.name,
      inventory: toDraftLines(agent.inventory),
      recipesPerAction: agent.recipesPerAction,
    })
    if (!created.ok) continue // unreachable after validation
    counter.added('agents')

    const recipeIdByName = applyAgentRecipes(
      stores.agentStore,
      created.agent.id,
      agent.recipes,
      counter,
    )
    applyAgentRules(stores, created.agent.id, agent.rules, recipeIdByName, counter)
  }
}

function applyAgentRecipes(
  agentStore: AgentStore,
  agentId: string,
  recipes: ExportedRecipe[],
  counter: ImportCounter,
): Map<string, string> {
  const recipeIdByName = new Map<string, string>()
  for (const recipe of recipes) {
    const result = agentStore.addRecipe(agentId, {
      name: recipe.name,
      inputs: toDraftLines(recipe.inputs),
      outputs: toDraftLines(recipe.outputs),
    })
    if (result.ok) {
      recipeIdByName.set(recipe.name, result.recipe.id)
      counter.added('recipes')
    }
  }
  return recipeIdByName
}

function resolveRuleRecipeId(
  recipeStore: RecipeStore,
  rule: ExportedRule,
  recipeIdByName: Map<string, string>,
): string | null {
  if (rule.recipe.source === 'agent') return recipeIdByName.get(rule.recipe.name) ?? null
  const catalogRecipe = recipeStore.findByName(rule.recipe.name)
  return catalogRecipe.ok ? catalogRecipe.recipe.id : null
}

function applyAgentRules(
  stores: WorldStores,
  agentId: string,
  rules: ExportedRule[],
  recipeIdByName: Map<string, string>,
  counter: ImportCounter,
): void {
  for (const rule of rules) {
    const recipeId = resolveRuleRecipeId(stores.recipeStore, rule, recipeIdByName)
    if (recipeId === null) continue // unreachable after validation
    const good = stores.goodStore.findIdByName(rule.condition.good)
    if (!good.ok) continue // unreachable after validation
    const result = stores.agentStore.addRule(
      agentId,
      { source: rule.recipe.source, recipeId },
      {
        goodId: good.id,
        quantity: rule.condition.quantity,
        operator: rule.condition.operator,
      },
      rule.priority,
    )
    if (result.ok) counter.added('rules')
  }
}

export function applyImport(stores: WorldStores, data: WorldExport): ImportSummary {
  const counter = new ImportCounter()

  applyGoods(stores.goodStore, data.goods, counter)
  applyRecipes(stores.recipeStore, data.recipes, counter)
  applyAgents(stores, data.agents, counter)

  return counter.toSummary()
}
