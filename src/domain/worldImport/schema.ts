import { DEFAULT_RECIPES_PER_ACTION } from '../agent'
import {
  WORLD_EXPORT_VERSION,
  type ExportedAgent,
  type ExportedLine,
  type ExportedRecipe,
  type ExportedRule,
  type WorldExport,
} from '../worldExport'
import { type ImportError, ValidationContext, collectUnique } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateLine(raw: unknown, path: string, ctx: ValidationContext): ExportedLine | null {
  if (!isRecord(raw)) {
    ctx.invalid(path)
    return null
  }
  if (typeof raw.good !== 'string' || raw.good.trim() === '') {
    ctx.invalid(`${path}.good`)
    return null
  }
  if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity) || raw.quantity <= 0) {
    ctx.invalid(`${path}.quantity`)
    return null
  }
  return { good: raw.good, quantity: raw.quantity }
}

function validateLines(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
  allowEmpty: boolean,
): ExportedLine[] | null {
  if (!Array.isArray(raw)) {
    ctx.invalid(path)
    return null
  }
  if (!allowEmpty && raw.length === 0) {
    ctx.invalid(path)
    return null
  }
  const mark = ctx.mark()
  const lines: ExportedLine[] = []
  raw.forEach((item, index) => {
    const line = validateLine(item, `${path}[${index}]`, ctx)
    if (line) lines.push(line)
  })
  // only the errors raised here sink this list, never the outer ones
  return ctx.failedSince(mark) ? null : lines
}

function validateRecipeShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): ExportedRecipe | null {
  if (!isRecord(raw)) {
    ctx.invalid(path)
    return null
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    ctx.invalid(`${path}.name`)
    return null
  }
  const inputs = validateLines(raw.inputs, `${path}.inputs`, ctx, false)
  const outputs = validateLines(raw.outputs, `${path}.outputs`, ctx, false)
  if (inputs === null || outputs === null) return null
  return { name: raw.name, inputs, outputs }
}

type ExportedCondition = ExportedRule['condition']

function validateConditionShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): ExportedCondition | null {
  if (!isRecord(raw)) {
    ctx.invalid(path)
    return null
  }
  const good = raw.good
  const quantity = raw.quantity
  const operator = raw.operator
  if (typeof good !== 'string' || good.trim() === '') {
    ctx.invalid(`${path}.good`)
    return null
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    ctx.invalid(`${path}.quantity`)
    return null
  }
  if (operator !== 'AT_LEAST' && operator !== 'LESS_THAN') {
    ctx.invalid(`${path}.operator`)
    return null
  }
  return { good, quantity, operator }
}

function validateRuleShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): ExportedRule | null {
  if (!isRecord(raw)) {
    ctx.invalid(path)
    return null
  }
  if (!isRecord(raw.recipe)) {
    ctx.invalid(`${path}.recipe`)
    return null
  }
  const source = raw.recipe.source
  if (
    (source !== 'catalog' && source !== 'agent') ||
    typeof raw.recipe.name !== 'string' ||
    raw.recipe.name.trim() === ''
  ) {
    ctx.invalid(`${path}.recipe`)
    return null
  }
  const condition = validateConditionShape(raw.condition, `${path}.condition`, ctx)
  if (condition === null) return null
  if (typeof raw.priority !== 'number' || !Number.isFinite(raw.priority)) {
    ctx.invalid(`${path}.priority`)
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
  ctx: ValidationContext,
): ExportedRecipe[] | null {
  if (!Array.isArray(raw)) {
    ctx.invalid(`${path}.recipes`)
    return null
  }
  return collectUnique(raw, `${path}.recipes`, 'receta', validateRecipeShape, ctx)
}

function validateAgentRulesShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): ExportedRule[] | null {
  if (!Array.isArray(raw)) {
    ctx.invalid(`${path}.rules`)
    return null
  }
  const rules: ExportedRule[] = []
  raw.forEach((item, index) => {
    const rule = validateRuleShape(item, `${path}.rules[${index}]`, ctx)
    if (rule) rules.push(rule)
  })
  return rules
}

function validateAgentShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): ExportedAgent | null {
  if (!isRecord(raw)) {
    ctx.invalid(path)
    return null
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    ctx.invalid(`${path}.name`)
    return null
  }
  const mark = ctx.mark()
  const inventory = validateLines(raw.inventory, `${path}.inventory`, ctx, true)
  if (inventory === null) return null

  const recipes = validateAgentRecipesShape(raw.recipes, path, ctx)
  if (recipes === null) return null
  const rules = validateAgentRulesShape(raw.rules, path, ctx)
  if (rules === null) return null
  const recipesPerAction = validateRecipesPerAction(raw, path, ctx)
  if (recipesPerAction === null) return null

  // drop the agent when one of its own parts failed, whatever else failed before
  if (ctx.failedSince(mark)) return null
  return { name: raw.name, inventory, recipes, rules, recipesPerAction }
}

/**
 * Absent in files exported before story #18 ⇒ the default 1; present but not
 * an integer ≥ 1 ⇒ structural error (nothing is imported).
 */
function validateRecipesPerAction(
  raw: Record<string, unknown>,
  path: string,
  ctx: ValidationContext,
): number | null {
  const value = raw.recipesPerAction
  if (value === undefined) return DEFAULT_RECIPES_PER_ACTION
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    ctx.invalid(`${path}.recipesPerAction`)
    return null
  }
  return value
}

function validateGoodShape(
  raw: unknown,
  path: string,
  ctx: ValidationContext,
): { name: string } | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || raw.name.trim() === '') {
    ctx.invalid(`${path}.name`)
    return null
  }
  return { name: raw.name }
}

function validateGoods(raw: unknown[], ctx: ValidationContext): { name: string }[] {
  return collectUnique(raw, 'goods', 'bien', validateGoodShape, ctx)
}

function validateNamedRecipes(raw: unknown[], ctx: ValidationContext): ExportedRecipe[] {
  return collectUnique(raw, 'recipes', 'receta', validateRecipeShape, ctx)
}

function validateNamedAgents(raw: unknown[], ctx: ValidationContext): ExportedAgent[] {
  return collectUnique(raw, 'agents', 'agente', validateAgentShape, ctx)
}

export function validateWorldExport(raw: unknown): {
  errors: ImportError[]
  value: WorldExport | null
} {
  const ctx = new ValidationContext()

  if (!isRecord(raw)) {
    ctx.invalid('')
    return { errors: ctx.all(), value: null }
  }
  if (raw.version !== WORLD_EXPORT_VERSION) {
    ctx.push({ code: 'UNSUPPORTED_VERSION', version: raw.version })
    return { errors: ctx.all(), value: null }
  }
  if (!Array.isArray(raw.goods) || !Array.isArray(raw.recipes) || !Array.isArray(raw.agents)) {
    if (!Array.isArray(raw.goods)) ctx.invalid('goods')
    if (!Array.isArray(raw.recipes)) ctx.invalid('recipes')
    if (!Array.isArray(raw.agents)) ctx.invalid('agents')
    return { errors: ctx.all(), value: null }
  }

  const goods = validateGoods(raw.goods, ctx)
  const recipes = validateNamedRecipes(raw.recipes, ctx)
  const agents = validateNamedAgents(raw.agents, ctx)

  if (ctx.hasErrors()) return { errors: ctx.all(), value: null }
  return { errors: [], value: { version: WORLD_EXPORT_VERSION, goods, recipes, agents } }
}
