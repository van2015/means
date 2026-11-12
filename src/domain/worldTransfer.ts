import type { Recipe } from './recipe'
import type { Stores } from './stores'

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

export function buildExport(stores: Stores, selection: WorldSelection): WorldExport {
  const goods = new Map<string, { name: string }>()
  const recipes = new Map<string, ExportedRecipe>()
  const agents = new Map<string, ExportedAgent>()

  const goodNameById = (goodId: string): string | null => {
    const result = stores.goodStore.get(goodId)
    return result.ok ? result.good.name : null
  }

  const exportLines = (lines: { goodId: string; quantity: number }[]): ExportedLine[] => {
    const exported: ExportedLine[] = []
    for (const line of lines) {
      const name = goodNameById(line.goodId)
      if (name === null) continue // defensive: dangling line
      goods.set(name, { name })
      exported.push({ good: name, quantity: line.quantity })
    }
    return exported
  }

  const exportRecipe = (recipe: Recipe): ExportedRecipe => ({
    name: recipe.name,
    inputs: exportLines(recipe.inputs),
    outputs: exportLines(recipe.outputs),
  })

  for (const id of selection.goodIds) {
    const result = stores.goodStore.get(id)
    if (result.ok) goods.set(result.good.name, { name: result.good.name })
  }

  for (const id of selection.recipeIds) {
    const recipe = stores.recipeStore.all().find((r) => r.id === id)
    if (recipe) recipes.set(recipe.name, exportRecipe(recipe))
  }

  for (const id of selection.agentIds) {
    const result = stores.agentStore.findById(id)
    if (!result.ok) continue
    const agent = result.agent

    const rules: ExportedRule[] = []
    for (const rule of agent.rules) {
      let recipeName: string | null
      if (rule.recipeRef.source === 'catalog') {
        const catalogRecipe = stores.recipeStore.all().find((r) => r.id === rule.recipeRef.recipeId)
        recipeName = catalogRecipe?.name ?? null
        // closure: a rule pulls its catalog recipe (and its goods) into the export
        if (catalogRecipe) recipes.set(catalogRecipe.name, exportRecipe(catalogRecipe))
      } else {
        recipeName = agent.recipes.find((r) => r.id === rule.recipeRef.recipeId)?.name ?? null
      }
      const conditionGood = goodNameById(rule.condition.goodId)
      if (recipeName === null || conditionGood === null) continue // skip broken rules
      goods.set(conditionGood, { name: conditionGood })
      rules.push({
        recipe: { source: rule.recipeRef.source, name: recipeName },
        condition: {
          good: conditionGood,
          quantity: rule.condition.quantity,
          operator: rule.condition.operator,
        },
        priority: rule.priority,
      })
    }

    agents.set(agent.name, {
      name: agent.name,
      inventory: exportLines(agent.inventory),
      recipes: agent.recipes.map(exportRecipe),
      rules,
    })
  }

  return {
    version: WORLD_EXPORT_VERSION,
    goods: [...goods.values()],
    recipes: [...recipes.values()],
    agents: [...agents.values()],
  }
}

export function serializeExport(world: WorldExport): string {
  return JSON.stringify(world, null, 2)
}

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
  if (!isRecord(raw.condition)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.condition` })
    return null
  }
  const good = raw.condition.good
  const quantity = raw.condition.quantity
  const operator = raw.condition.operator
  if (typeof good !== 'string' || good.trim() === '') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.condition.good` })
    return null
  }
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.condition.quantity` })
    return null
  }
  if (operator !== 'AT_LEAST' && operator !== 'LESS_THAN') {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.condition.operator` })
    return null
  }
  if (typeof raw.priority !== 'number' || !Number.isFinite(raw.priority)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.priority` })
    return null
  }
  return {
    recipe: { source, name: raw.recipe.name },
    condition: { good, quantity, operator },
    priority: raw.priority,
  }
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

  if (!Array.isArray(raw.recipes)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.recipes` })
    return null
  }
  const recipes: ExportedRecipe[] = []
  const recipeNames = new Set<string>()
  raw.recipes.forEach((item, index) => {
    const recipe = validateRecipeShape(item, `${path}.recipes[${index}]`, errors)
    if (!recipe) return
    if (recipeNames.has(recipe.name)) {
      errors.push({ code: 'DUPLICATE_NAME', kind: 'receta', name: recipe.name })
      return
    }
    recipeNames.add(recipe.name)
    recipes.push(recipe)
  })

  if (!Array.isArray(raw.rules)) {
    errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.rules` })
    return null
  }
  const rules: ExportedRule[] = []
  raw.rules.forEach((item, index) => {
    const rule = validateRuleShape(item, `${path}.rules[${index}]`, errors)
    if (rule) rules.push(rule)
  })

  if (errors.length > 0) return null
  return { name: raw.name, inventory, recipes, rules }
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

  const goods: { name: string }[] = []
  const goodNames = new Set<string>()
  raw.goods.forEach((item, index) => {
    const path = `goods[${index}]`
    if (!isRecord(item) || typeof item.name !== 'string' || item.name.trim() === '') {
      errors.push({ code: 'INVALID_STRUCTURE', path: `${path}.name` })
      return
    }
    if (goodNames.has(item.name)) {
      errors.push({ code: 'DUPLICATE_NAME', kind: 'bien', name: item.name })
      return
    }
    goodNames.add(item.name)
    goods.push({ name: item.name })
  })

  const recipes: ExportedRecipe[] = []
  const recipeNames = new Set<string>()
  raw.recipes.forEach((item, index) => {
    const recipe = validateRecipeShape(item, `recipes[${index}]`, errors)
    if (!recipe) return
    if (recipeNames.has(recipe.name)) {
      errors.push({ code: 'DUPLICATE_NAME', kind: 'receta', name: recipe.name })
      return
    }
    recipeNames.add(recipe.name)
    recipes.push(recipe)
  })

  const agents: ExportedAgent[] = []
  const agentNames = new Set<string>()
  raw.agents.forEach((item, index) => {
    const agent = validateAgentShape(item, `agents[${index}]`, errors)
    if (!agent) return
    if (agentNames.has(agent.name)) {
      errors.push({ code: 'DUPLICATE_NAME', kind: 'agente', name: agent.name })
      return
    }
    agentNames.add(agent.name)
    agents.push(agent)
  })

  if (errors.length > 0) return { errors, value: null }
  return { errors, value: { version: WORLD_EXPORT_VERSION, goods, recipes, agents } }
}

function validateReferences(stores: Stores, data: WorldExport): ImportError[] {
  const errors: ImportError[] = []

  const worldGoods = new Set(stores.goodStore.all().map((good) => good.name))
  const fileGoods = new Set(data.goods.map((good) => good.name))
  const hasGood = (name: string) => worldGoods.has(name) || fileGoods.has(name)

  const worldRecipes = new Set(stores.recipeStore.all().map((recipe) => recipe.name))
  const fileRecipes = new Set(data.recipes.map((recipe) => recipe.name))
  const hasCatalogRecipe = (name: string) => worldRecipes.has(name) || fileRecipes.has(name)

  const checkLines = (lines: ExportedLine[], source: 'receta' | 'agente', sourceName: string) => {
    for (const line of lines) {
      if (!hasGood(line.good)) {
        errors.push({
          code: 'MISSING_REFERENCE',
          kind: 'bien',
          name: line.good,
          source,
          sourceName,
        })
      }
    }
  }

  for (const recipe of data.recipes) {
    checkLines(recipe.inputs, 'receta', recipe.name)
    checkLines(recipe.outputs, 'receta', recipe.name)
  }

  for (const agent of data.agents) {
    checkLines(agent.inventory, 'agente', agent.name)
    for (const recipe of agent.recipes) {
      checkLines(recipe.inputs, 'receta', recipe.name)
      checkLines(recipe.outputs, 'receta', recipe.name)
    }
    const agentRecipeNames = new Set(agent.recipes.map((recipe) => recipe.name))
    for (const rule of agent.rules) {
      if (!hasGood(rule.condition.good)) {
        errors.push({
          code: 'MISSING_REFERENCE',
          kind: 'bien',
          name: rule.condition.good,
          source: 'agente',
          sourceName: agent.name,
        })
      }
      const recipeExists =
        rule.recipe.source === 'catalog'
          ? hasCatalogRecipe(rule.recipe.name)
          : agentRecipeNames.has(rule.recipe.name)
      if (!recipeExists) {
        errors.push({
          code: 'MISSING_REFERENCE',
          kind: 'receta',
          name: rule.recipe.name,
          source: 'agente',
          sourceName: agent.name,
        })
      }
    }
  }

  return errors
}

function applyImport(stores: Stores, data: WorldExport): ImportSummary {
  const summary: ImportSummary = {
    goods: { added: 0, skipped: 0 },
    recipes: { added: 0, skipped: 0 },
    agents: { added: 0, skipped: 0 },
    rules: { added: 0, skipped: 0 },
  }

  for (const good of data.goods) {
    if (stores.goodStore.hasNamed(good.name)) {
      summary.goods.skipped++
    } else {
      stores.goodStore.create(good.name)
      summary.goods.added++
    }
  }

  for (const recipe of data.recipes) {
    if (stores.recipeStore.findByName(recipe.name).ok) {
      summary.recipes.skipped++
      continue
    }
    stores.recipeStore.create({
      name: recipe.name,
      inputs: recipe.inputs.map((line) => ({ goodName: line.good, quantity: line.quantity })),
      outputs: recipe.outputs.map((line) => ({ goodName: line.good, quantity: line.quantity })),
    })
    summary.recipes.added++
  }

  for (const agent of data.agents) {
    if (stores.agentStore.findByName(agent.name).ok) {
      summary.agents.skipped++
      summary.recipes.skipped += agent.recipes.length
      summary.rules.skipped += agent.rules.length
      continue
    }

    const created = stores.agentStore.create({
      name: agent.name,
      inventory: agent.inventory.map((line) => ({
        goodName: line.good,
        quantity: line.quantity,
      })),
    })
    if (!created.ok) continue // unreachable after validation
    summary.agents.added++

    const recipeIdByName = new Map<string, string>()
    for (const recipe of agent.recipes) {
      const result = stores.agentStore.addRecipe(created.agent.id, {
        name: recipe.name,
        inputs: recipe.inputs.map((line) => ({ goodName: line.good, quantity: line.quantity })),
        outputs: recipe.outputs.map((line) => ({ goodName: line.good, quantity: line.quantity })),
      })
      if (result.ok) {
        recipeIdByName.set(recipe.name, result.recipe.id)
        summary.recipes.added++
      }
    }

    for (const rule of agent.rules) {
      let recipeId: string
      if (rule.recipe.source === 'catalog') {
        const catalogRecipe = stores.recipeStore.findByName(rule.recipe.name)
        if (!catalogRecipe.ok) continue // unreachable after validation
        recipeId = catalogRecipe.recipe.id
      } else {
        const own = recipeIdByName.get(rule.recipe.name)
        if (own === undefined) continue // unreachable after validation
        recipeId = own
      }
      const good = stores.goodStore.findIdByName(rule.condition.good)
      if (!good.ok) continue // unreachable after validation
      const result = stores.agentStore.addRule(
        created.agent.id,
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

  return summary
}
