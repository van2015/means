import { DEFAULT_RECIPES_PER_ACTION } from './agent'
import type { DraftLine } from './recipe'
import type { Stores } from './stores'
import {
  WORLD_EXPORT_VERSION,
  type ExportedAgent,
  type ExportedLine,
  type ExportedRecipe,
  type ExportedRule,
  type WorldExport,
} from './worldExport'

export type ImportError =
  | { code: 'INVALID_JSON' }
  | { code: 'UNSUPPORTED_VERSION'; version: unknown }
  | { code: 'INVALID_STRUCTURE'; path: string }
  | { code: 'DUPLICATE_NAME'; kind: 'bien' | 'receta' | 'agente'; name: string }
  | {
      code: 'MISSING_REFERENCE'
      kind: 'bien' | 'receta'
      name: string
      source: 'receta' | 'agente'
      sourceName: string
    }

export type ImportSummary = {
  goods: { added: number; skipped: number }
  recipes: { added: number; skipped: number }
  agents: { added: number; skipped: number }
  rules: { added: number; skipped: number }
}

export type ImportResult =
  { ok: true; summary: ImportSummary } | { ok: false; errors: ImportError[] }

/**
 * Reads a JSON payload into the world: parse, validate the structure, check
 * that every reference resolves, and only then apply it to the stores.
 */
export function importWorld(stores: Stores, json: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, errors: [{ code: 'INVALID_JSON' }] }
  }

  const { errors: structureErrors, value } = validateWorldExport(raw)
  if (value === null) return { ok: false, errors: structureErrors }

  const referenceErrors = validateReferences(stores, value)
  if (referenceErrors.length > 0) return { ok: false, errors: referenceErrors }

  return { ok: true, summary: applyImport(stores, value) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type DuplicateKind = Extract<ImportError, { code: 'DUPLICATE_NAME' }>['kind']

/**
 * Registers a name inside a section, reporting the duplicate instead. Used by
 * every catalog that must not repeat a name (goods, recipes, agents).
 */
function registerName(
  names: Set<string>,
  name: string,
  kind: DuplicateKind,
  errors: ImportError[],
): boolean {
  if (names.has(name)) {
    errors.push({ code: 'DUPLICATE_NAME', kind, name })
    return true
  }
  names.add(name)
  return false
}

function validateLine(raw: unknown, path: string, errors: ImportError[]): ExportedLine | null {
  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  if (typeof raw.good !== 'string' || raw.good.trim() === '') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.good` })
    return null
  }
  if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity) || raw.quantity <= 0) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.quantity` })
    return null
  }
  return { good: raw.good, quantity: raw.quantity }
}

function validateLines(
  raw: unknown,
  path: string,
  errors: ImportError[],
  allowEmpty: boolean,
): ExportedLine[] | null {
  if (!Array.isArray(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  if (!allowEmpty && raw.length === 0) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  const lines: ExportedLine[] = []
  raw.forEach((item, index) => {
    const line = validateLine(item, `${path}[${index}]`, errors)
    if (line) lines.push(line)
  })
  return errors.length > 0 ? null : lines
}

function validateRecipeShape(
  raw: unknown,
  path: string,
  errors: ImportError[],
): ExportedRecipe | null {
  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.name` })
    return null
  }
  const inputs = validateLines(raw.inputs, `${path}.inputs`, errors, false)
  const outputs = validateLines(raw.outputs, `${path}.outputs`, errors, false)
  if (inputs === null || outputs === null) return null
  return { name: raw.name, inputs, outputs }
}

type ExportedCondition = ExportedRule['condition']

function validateConditionShape(
  raw: unknown,
  path: string,
  errors: ImportError[],
): ExportedCondition | null {
  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  const good = raw.good
  const quantity = raw.quantity
  const operator = raw.operator
  if (typeof good !== 'string' || good.trim() === '') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.good` })
    return null
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.quantity` })
    return null
  }
  if (operator !== 'AT_LEAST' && operator !== 'LESS_THAN') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.operator` })
    return null
  }
  return { good, quantity, operator }
}

function validateRuleShape(raw: unknown, path: string, errors: ImportError[]): ExportedRule | null {
  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  if (!isRecord(raw.recipe)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.recipe` })
    return null
  }
  const source = raw.recipe.source
  if (
    (source !== 'catalog' && source !== 'agent') ||
    typeof raw.recipe.name !== 'string' ||
    raw.recipe.name.trim() === ''
  ) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.recipe` })
    return null
  }
  const condition = validateConditionShape(raw.condition, `${path}.condition`, errors)
  if (condition === null) return null
  if (typeof raw.priority !== 'number' || !Number.isFinite(raw.priority)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.priority` })
    return null
  }
  return {
    recipe: { source, name: raw.recipe.name },
    condition,
    priority: raw.priority,
  }
}

function validateAgentRecipesShape(
  raw: unknown,
  path: string,
  errors: ImportError[],
): ExportedRecipe[] | null {
  if (!Array.isArray(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.recipes` })
    return null
  }
  const recipes: ExportedRecipe[] = []
  const recipeNames = new Set<string>()
  raw.forEach((item, index) => {
    const recipe = validateRecipeShape(item, `${path}.recipes[${index}]`, errors)
    if (!recipe) return
    if (registerName(recipeNames, recipe.name, 'receta', errors)) return
    recipes.push(recipe)
  })
  return recipes
}

function validateAgentRulesShape(
  raw: unknown,
  path: string,
  errors: ImportError[],
): ExportedRule[] | null {
  if (!Array.isArray(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.rules` })
    return null
  }
  const rules: ExportedRule[] = []
  raw.forEach((item, index) => {
    const rule = validateRuleShape(item, `${path}.rules[${index}]`, errors)
    if (rule) rules.push(rule)
  })
  return rules
}

function validateAgentShape(
  raw: unknown,
  path: string,
  errors: ImportError[],
): ExportedAgent | null {
  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path })
    return null
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.name` })
    return null
  }
  const inventory = validateLines(raw.inventory, `${path}.inventory`, errors, true)
  if (inventory === null) return null

  const recipes = validateAgentRecipesShape(raw.recipes, path, errors)
  if (recipes === null) return null
  const rules = validateAgentRulesShape(raw.rules, path, errors)
  if (rules === null) return null
  const recipesPerAction = validateRecipesPerAction(raw, path, errors)
  if (recipesPerAction === null) return null

  if (errors.length > 0) return null
  return { name: raw.name, inventory, recipes, rules, recipesPerAction }
}

/**
 * Absent in files exported before story #18 ⇒ the default 1; present but not
 * an integer ≥ 1 ⇒ structural error (nothing is imported).
 */
function validateRecipesPerAction(
  raw: Record<string, unknown>,
  path: string,
  errors: ImportError[],
): number | null {
  const value = raw.recipesPerAction
  if (value === undefined) return DEFAULT_RECIPES_PER_ACTION
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.recipesPerAction` })
    return null
  }
  return value
}

function validateGoods(raw: unknown[], errors: ImportError[]): { name: string }[] {
  const goods: { name: string }[] = []
  const goodNames = new Set<string>()
  raw.forEach((item, index) => {
    const path = `goods[${index}]`
    if (!isRecord(item) || typeof item.name !== 'string' || item.name.trim() === '') {
      errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.name` })
      return
    }
    if (registerName(goodNames, item.name, 'bien', errors)) return
    goods.push({ name: item.name })
  })
  return goods
}

function validateNamedRecipes(raw: unknown[], errors: ImportError[]): ExportedRecipe[] {
  const recipes: ExportedRecipe[] = []
  const recipeNames = new Set<string>()
  raw.forEach((item, index) => {
    const recipe = validateRecipeShape(item, `recipes[${index}]`, errors)
    if (!recipe) return
    if (registerName(recipeNames, recipe.name, 'receta', errors)) return
    recipes.push(recipe)
  })
  return recipes
}

function validateNamedAgents(raw: unknown[], errors: ImportError[]): ExportedAgent[] {
  const agents: ExportedAgent[] = []
  const agentNames = new Set<string>()
  raw.forEach((item, index) => {
    const agent = validateAgentShape(item, `agents[${index}]`, errors)
    if (!agent) return
    if (registerName(agentNames, agent.name, 'agente', errors)) return
    agents.push(agent)
  })
  return agents
}

function validateWorldExport(raw: unknown): {
  errors: ImportError[]
  value: WorldExport | null
} {
  const errors: ImportError[] = []

  if (!isRecord(raw)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: '' })
    return { errors, value: null }
  }
  if (raw.version !== WORLD_EXPORT_VERSION) {
    errors.push({ code: 'UNSUPPORTED_VERSION', version: raw.version })
    return { errors, value: null }
  }
  if (!Array.isArray(raw.goods) || !Array.isArray(raw.recipes) || !Array.isArray(raw.agents)) {
    if (!Array.isArray(raw.goods)) errors.push({ code: 'INVALID_STRUCTURE', path: 'goods' })
    if (!Array.isArray(raw.recipes)) errors.push({ code: 'INVALID_STRUCTURE', path: 'recipes' })
    if (!Array.isArray(raw.agents)) errors.push({ code: 'INVALID_STRUCTURE', path: 'agents' })
    return { errors, value: null }
  }

  const goods = validateGoods(raw.goods, errors)
  const recipes = validateNamedRecipes(raw.recipes, errors)
  const agents = validateNamedAgents(raw.agents, errors)

  if (errors.length > 0) return { errors, value: null }
  return { errors, value: { version: WORLD_EXPORT_VERSION, goods, recipes, agents } }
}

type ReferenceContext = {
  hasGood: (name: string) => boolean
  hasCatalogRecipe: (name: string) => boolean
}

function createReferenceContext(stores: Stores, data: WorldExport): ReferenceContext {
  const worldGoods = new Set(stores.goodStore.all().map((good) => good.name))
  const fileGoods = new Set(data.goods.map((good) => good.name))
  const worldRecipes = new Set(stores.recipeStore.all().map((recipe) => recipe.name))
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
  errors: ImportError[],
): void {
  for (const line of lines) {
    if (!context.hasGood(line.good)) {
      errors.push(missingReference('bien', line.good, source, sourceName))
    }
  }
}

function validateRecipeReferences(
  recipes: ExportedRecipe[],
  context: ReferenceContext,
  errors: ImportError[],
): void {
  for (const recipe of recipes) {
    checkLines(recipe.inputs, 'receta', recipe.name, context, errors)
    checkLines(recipe.outputs, 'receta', recipe.name, context, errors)
  }
}

function validateRuleReferences(
  rule: ExportedRule,
  agent: ExportedAgent,
  agentRecipeNames: Set<string>,
  context: ReferenceContext,
  errors: ImportError[],
): void {
  if (!context.hasGood(rule.condition.good)) {
    errors.push(missingReference('bien', rule.condition.good, 'agente', agent.name))
  }
  const recipeExists =
    rule.recipe.source === 'catalog'
      ? context.hasCatalogRecipe(rule.recipe.name)
      : agentRecipeNames.has(rule.recipe.name)
  if (!recipeExists) {
    errors.push(missingReference('receta', rule.recipe.name, 'agente', agent.name))
  }
}

function validateAgentReferences(
  agents: ExportedAgent[],
  context: ReferenceContext,
  errors: ImportError[],
): void {
  for (const agent of agents) {
    checkLines(agent.inventory, 'agente', agent.name, context, errors)
    for (const recipe of agent.recipes) {
      checkLines(recipe.inputs, 'receta', recipe.name, context, errors)
      checkLines(recipe.outputs, 'receta', recipe.name, context, errors)
    }
    const agentRecipeNames = new Set(agent.recipes.map((recipe) => recipe.name))
    for (const rule of agent.rules) {
      validateRuleReferences(rule, agent, agentRecipeNames, context, errors)
    }
  }
}

function validateReferences(stores: Stores, data: WorldExport): ImportError[] {
  const errors: ImportError[] = []
  const context = createReferenceContext(stores, data)
  validateRecipeReferences(data.recipes, context, errors)
  validateAgentReferences(data.agents, context, errors)
  return errors
}

function toDraftLines(lines: ExportedLine[]): DraftLine[] {
  return lines.map((line) => ({ goodName: line.good, quantity: line.quantity }))
}

function applyGoods(stores: Stores, goods: WorldExport['goods'], summary: ImportSummary): void {
  for (const good of goods) {
    if (stores.goodStore.hasNamed(good.name)) {
      summary.goods.skipped++
    } else {
      stores.goodStore.create(good.name)
      summary.goods.added++
    }
  }
}

function applyRecipes(stores: Stores, recipes: ExportedRecipe[], summary: ImportSummary): void {
  for (const recipe of recipes) {
    if (stores.recipeStore.findByName(recipe.name).ok) {
      summary.recipes.skipped++
      continue
    }
    stores.recipeStore.create({
      name: recipe.name,
      inputs: toDraftLines(recipe.inputs),
      outputs: toDraftLines(recipe.outputs),
    })
    summary.recipes.added++
  }
}

function applyAgents(stores: Stores, agents: ExportedAgent[], summary: ImportSummary): void {
  for (const agent of agents) {
    if (stores.agentStore.findByName(agent.name).ok) {
      summary.agents.skipped++
      summary.recipes.skipped += agent.recipes.length
      summary.rules.skipped += agent.rules.length
      continue
    }

    const created = stores.agentStore.create({
      name: agent.name,
      inventory: toDraftLines(agent.inventory),
      recipesPerAction: agent.recipesPerAction,
    })
    if (!created.ok) continue // unreachable after validation
    summary.agents.added++

    const recipeIdByName = applyAgentRecipes(stores, created.agent.id, agent.recipes, summary)
    applyAgentRules(stores, created.agent.id, agent.rules, recipeIdByName, summary)
  }
}

function applyAgentRecipes(
  stores: Stores,
  agentId: string,
  recipes: ExportedRecipe[],
  summary: ImportSummary,
): Map<string, string> {
  const recipeIdByName = new Map<string, string>()
  for (const recipe of recipes) {
    const result = stores.agentStore.addRecipe(agentId, {
      name: recipe.name,
      inputs: toDraftLines(recipe.inputs),
      outputs: toDraftLines(recipe.outputs),
    })
    if (result.ok) {
      recipeIdByName.set(recipe.name, result.recipe.id)
      summary.recipes.added++
    }
  }
  return recipeIdByName
}

function resolveRuleRecipeId(
  stores: Stores,
  rule: ExportedRule,
  recipeIdByName: Map<string, string>,
): string | null {
  if (rule.recipe.source === 'agent') return recipeIdByName.get(rule.recipe.name) ?? null
  const catalogRecipe = stores.recipeStore.findByName(rule.recipe.name)
  return catalogRecipe.ok ? catalogRecipe.recipe.id : null
}

function applyAgentRules(
  stores: Stores,
  agentId: string,
  rules: ExportedRule[],
  recipeIdByName: Map<string, string>,
  summary: ImportSummary,
): void {
  for (const rule of rules) {
    const recipeId = resolveRuleRecipeId(stores, rule, recipeIdByName)
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
    if (result.ok) summary.rules.added++
  }
}

function applyImport(stores: Stores, data: WorldExport): ImportSummary {
  const summary: ImportSummary = {
    goods: { added: 0, skipped: 0 },
    recipes: { added: 0, skipped: 0 },
    agents: { added: 0, skipped: 0 },
    rules: { added: 0, skipped: 0 },
  }

  applyGoods(stores, data.goods, summary)
  applyRecipes(stores, data.recipes, summary)
  applyAgents(stores, data.agents, summary)

  return summary
}
