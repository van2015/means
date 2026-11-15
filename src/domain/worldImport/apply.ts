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

type ImportKind = keyof ImportSummary

function toDraftLines(lines: ExportedLine[]): DraftLine[] {
  return lines.map((line) => ({ goodName: line.good, quantity: line.quantity }))
}

/**
 * Applies a validated payload to the three catalogs, counting what it adds
 * and skips. The stores and the counters travel together, so each apply step
 * only takes the payload it works on. The name → id map of an agent's recipes
 * stays local to that agent, because only its rules resolve against it.
 */
class ImportContext {
  private readonly goodStore: GoodStore
  private readonly recipeStore: RecipeStore
  private readonly agentStore: AgentStore
  private readonly counts: ImportSummary = {
    goods: { added: 0, skipped: 0 },
    recipes: { added: 0, skipped: 0 },
    agents: { added: 0, skipped: 0 },
    rules: { added: 0, skipped: 0 },
  }

  constructor(stores: WorldStores) {
    this.goodStore = stores.goodStore
    this.recipeStore = stores.recipeStore
    this.agentStore = stores.agentStore
  }

  apply(data: WorldExport): ImportSummary {
    this.applyGoods(data.goods)
    this.applyRecipes(data.recipes)
    this.applyAgents(data.agents)
    return this.toSummary()
  }

  /** Counts what an import run adds and skips; the summary is only read here. */
  private added(kind: ImportKind, count = 1): void {
    this.counts[kind].added += count
  }

  private skipped(kind: ImportKind, count = 1): void {
    this.counts[kind].skipped += count
  }

  private toSummary(): ImportSummary {
    return {
      goods: { ...this.counts.goods },
      recipes: { ...this.counts.recipes },
      agents: { ...this.counts.agents },
      rules: { ...this.counts.rules },
    }
  }

  private applyGoods(goods: WorldExport['goods']): void {
    for (const good of goods) {
      if (this.goodStore.hasNamed(good.name)) {
        this.skipped('goods')
      } else {
        this.goodStore.create(good.name)
        this.added('goods')
      }
    }
  }

  private applyRecipes(recipes: ExportedRecipe[]): void {
    for (const recipe of recipes) {
      if (this.recipeStore.findByName(recipe.name).ok) {
        this.skipped('recipes')
        continue
      }
      this.recipeStore.create({
        name: recipe.name,
        inputs: toDraftLines(recipe.inputs),
        outputs: toDraftLines(recipe.outputs),
      })
      this.added('recipes')
    }
  }

  private applyAgents(agents: ExportedAgent[]): void {
    for (const agent of agents) {
      if (this.agentStore.findByName(agent.name).ok) {
        this.skipped('agents')
        this.skipped('recipes', agent.recipes.length)
        this.skipped('rules', agent.rules.length)
        continue
      }
      this.applyOneAgent(agent)
    }
  }

  /** Creates one agent together with its recipes and rules. */
  private applyOneAgent(agent: ExportedAgent): void {
    const created = this.agentStore.create({
      name: agent.name,
      inventory: toDraftLines(agent.inventory),
      recipesPerAction: agent.recipesPerAction,
    })
    if (!created.ok) return // unreachable after validation
    this.added('agents')

    const recipeIdByName = this.applyAgentRecipes(created.agent.id, agent.recipes)
    this.applyAgentRules(created.agent.id, agent.rules, recipeIdByName)
  }

  private applyAgentRecipes(agentId: string, recipes: ExportedRecipe[]): Map<string, string> {
    const recipeIdByName = new Map<string, string>()
    for (const recipe of recipes) {
      const result = this.agentStore.addRecipe(agentId, {
        name: recipe.name,
        inputs: toDraftLines(recipe.inputs),
        outputs: toDraftLines(recipe.outputs),
      })
      if (result.ok) {
        recipeIdByName.set(recipe.name, result.recipe.id)
        this.added('recipes')
      }
    }
    return recipeIdByName
  }

  private applyAgentRules(
    agentId: string,
    rules: ExportedRule[],
    recipeIdByName: Map<string, string>,
  ): void {
    for (const rule of rules) {
      if (this.applyOneRule(agentId, rule, recipeIdByName)) this.added('rules')
    }
  }

  /** One rule; false when its recipe or its good cannot be resolved. */
  private applyOneRule(
    agentId: string,
    rule: ExportedRule,
    recipeIdByName: Map<string, string>,
  ): boolean {
    const recipeId = this.resolveRuleRecipeId(rule, recipeIdByName)
    if (recipeId === null) return false // unreachable after validation
    const good = this.goodStore.findIdByName(rule.condition.good)
    if (!good.ok) return false // unreachable after validation

    const result = this.agentStore.addRule(
      agentId,
      { source: rule.recipe.source, recipeId },
      {
        goodId: good.id,
        quantity: rule.condition.quantity,
        operator: rule.condition.operator,
      },
      rule.priority,
    )
    return result.ok
  }

  private resolveRuleRecipeId(
    rule: ExportedRule,
    recipeIdByName: Map<string, string>,
  ): string | null {
    if (rule.recipe.source === 'agent') return recipeIdByName.get(rule.recipe.name) ?? null
    const catalog = this.recipeStore.findByName(rule.recipe.name)
    return catalog.ok ? catalog.recipe.id : null
  }
}

export function applyImport(stores: WorldStores, data: WorldExport): ImportSummary {
  return new ImportContext(stores).apply(data)
}
