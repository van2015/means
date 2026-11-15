import type { Agent, Rule } from './agent'
import type { AgentStore } from './agentStore'
import type { GoodStore } from './goodStore'
import type { Recipe } from './recipe'
import type { RecipeStore } from './recipeStore'
import { resolveRecipe } from './recipeRef'
import type { WorldStores } from './stores'

export const WORLD_EXPORT_VERSION = 1

export type ExportedLine = {
  good: string
  quantity: number
}

export type ExportedRecipe = {
  name: string
  inputs: ExportedLine[]
  outputs: ExportedLine[]
}

export type ExportedRule = {
  recipe: { source: 'catalog' | 'agent'; name: string }
  condition: { good: string; quantity: number; operator: 'AT_LEAST' | 'LESS_THAN' }
  priority: number
}

export type ExportedAgent = {
  name: string
  inventory: ExportedLine[]
  recipes: ExportedRecipe[]
  rules: ExportedRule[]
  /** Absent in files exported before story #18 ⇒ 1 on import. */
  recipesPerAction?: number
}

export type WorldExport = {
  version: typeof WORLD_EXPORT_VERSION
  goods: { name: string }[]
  recipes: ExportedRecipe[]
  agents: ExportedAgent[]
}

export type WorldSelection = {
  goodIds: string[]
  recipeIds: string[]
  agentIds: string[]
}

/**
 * Builds a world export out of the current stores. Keeps the three catalogs
 * (goods, recipes, agents) and the order in which they are registered, which
 * is part of the exported payload.
 */
class ExportBuilder {
  private goodStore: GoodStore
  private recipeStore: RecipeStore
  private agentStore: AgentStore
  private goods = new Map<string, { name: string }>()
  private recipes = new Map<string, ExportedRecipe>()
  private agents = new Map<string, ExportedAgent>()

  constructor(stores: WorldStores) {
    this.goodStore = stores.goodStore
    this.recipeStore = stores.recipeStore
    this.agentStore = stores.agentStore
  }

  build(): WorldExport {
    return {
      version: WORLD_EXPORT_VERSION,
      goods: [...this.goods.values()],
      recipes: [...this.recipes.values()],
      agents: [...this.agents.values()],
    }
  }

  addGoodById(goodId: string): void {
    const result = this.goodStore.get(goodId)
    if (result.ok) this.addGoodName(result.good.name)
  }

  addRecipeById(recipeId: string): void {
    const result = this.recipeStore.findById(recipeId)
    if (result.ok) this.addRecipe(result.recipe)
  }

  addAgentById(agentId: string): void {
    const result = this.agentStore.findById(agentId)
    if (result.ok) this.addAgent(result.agent)
  }

  /** Convert a recipe to its exported shape, registering the goods it uses. */
  private exportRecipe(recipe: Recipe): ExportedRecipe {
    return {
      name: recipe.name,
      inputs: this.addLines(recipe.inputs),
      outputs: this.addLines(recipe.outputs),
    }
  }

  /** Export a catalog recipe and register it in the exported catalog. */
  private addRecipe(recipe: Recipe): ExportedRecipe {
    const exported = this.exportRecipe(recipe)
    this.recipes.set(exported.name, exported)
    return exported
  }

  private addAgent(agent: Agent): void {
    // a rule pulls its catalog recipe (and its goods) into the export before
    // the agent's own inventory and recipes, so it is exported first
    const rules = this.addRules(agent)
    const inventory = this.addLines(agent.inventory)
    // the agent's own recipes are exported inside the agent, not in the catalog
    const recipes = agent.recipes.map((recipe) => this.exportRecipe(recipe))
    this.agents.set(agent.name, {
      name: agent.name,
      inventory,
      recipes,
      rules,
      recipesPerAction: agent.recipesPerAction,
    })
  }

  private addGoodName(name: string): void {
    this.goods.set(name, { name })
  }

  private goodNameById(goodId: string): string | null {
    const result = this.goodStore.get(goodId)
    return result.ok ? result.good.name : null
  }

  /** Export recipe lines and register every good they reference. */
  private addLines(lines: { goodId: string; quantity: number }[]): ExportedLine[] {
    const exported: ExportedLine[] = []
    for (const line of lines) {
      const name = this.goodNameById(line.goodId)
      if (name === null) continue // defensive: dangling line
      this.addGoodName(name)
      exported.push({ good: name, quantity: line.quantity })
    }
    return exported
  }

  private addRules(agent: Agent): ExportedRule[] {
    const rules: ExportedRule[] = []
    for (const rule of agent.rules) {
      const target = this.resolveRuleRecipe(agent, rule)
      // a rule pulls its catalog recipe (and its goods) into the export before
      // the agent's own inventory and recipes, so it is exported first
      if (target !== null && target.catalog !== null) this.addRecipe(target.catalog)

      const good = target === null ? null : this.goodNameById(rule.condition.goodId)
      if (target === null || good === null) continue // skip broken rules
      this.addGoodName(good)
      rules.push(this.exportRule(rule, target.name, good))
    }
    return rules
  }

  /** A rule in its exported shape: its recipe and its good, both by name. */
  private exportRule(rule: Rule, recipeName: string, goodName: string): ExportedRule {
    return {
      recipe: { source: rule.recipeRef.source, name: recipeName },
      condition: {
        good: goodName,
        quantity: rule.condition.quantity,
        operator: rule.condition.operator,
      },
      priority: rule.priority,
    }
  }

  /** The recipe a rule points at: its name, plus the catalog recipe to export. */
  private resolveRuleRecipe(
    agent: Agent,
    rule: Rule,
  ): { name: string; catalog: Recipe | null } | null {
    const recipe = resolveRecipe(agent, rule.recipeRef, this.recipeStore)
    if (recipe === null) return null
    return { name: recipe.name, catalog: rule.recipeRef.source === 'catalog' ? recipe : null }
  }
}

export function buildExport(stores: WorldStores, selection: WorldSelection): WorldExport {
  const builder = new ExportBuilder(stores)

  for (const id of selection.goodIds) builder.addGoodById(id)
  for (const id of selection.recipeIds) builder.addRecipeById(id)
  for (const id of selection.agentIds) builder.addAgentById(id)

  return builder.build()
}

export function serializeExport(world: WorldExport): string {
  return JSON.stringify(world, null, 2)
}
