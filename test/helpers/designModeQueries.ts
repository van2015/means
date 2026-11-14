import { fireEvent, screen, within, type Screen } from '@testing-library/react'

type DesignSection = 'Recetas' | 'Bienes' | 'Agentes' | 'Mundo'

/** The side-menu button of a design section (null when the menu is absent). */
export function designSectionButton(label: DesignSection): HTMLElement | null {
  return screen.queryByRole('button', { name: new RegExp(`^${label}$`, 'i') })
}

/**
 * Only one design section is mounted at a time, so every query that looks for
 * a control must reveal its section first. Standalone section renders (tests
 * that mount a section without the menu) simply skip this.
 */
export function openDesignSection(label: DesignSection): void {
  const button = designSectionButton(label)
  if (button === null || button.getAttribute('aria-current') === 'page') return
  fireEvent.click(button)
}

export function withinRecipeCatalog() {
  openDesignSection('Recetas')
  return within(screen.getByRole('heading', { name: /catálogo de recetas/i }).closest('section')!)
}

export function withinAgentCatalog() {
  openDesignSection('Agentes')
  return within(screen.getByRole('heading', { name: /catálogo de agentes/i }).closest('section')!)
}

export function withinGoodsCatalog() {
  openDesignSection('Bienes')
  return within(screen.getByRole('heading', { name: /bienes y servicios/i }).closest('section')!)
}

export function recipeNameInput(): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByLabelText(/^nombre$/i)
}

export function addRecipeInputButton(): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByRole('button', { name: /agregar entrada/i })
}

export function recipeInputGoodName(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByLabelText(new RegExp(`nombre del insumo ${index}`, 'i'))
}

export function recipeInputQuantity(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByLabelText(new RegExp(`cantidad del insumo ${index}`, 'i'))
}

export function removeRecipeInputButton(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByRole('button', { name: new RegExp(`eliminar insumo ${index}`, 'i') })
}

export function addRecipeOutputButton(): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByRole('button', { name: /agregar salida/i })
}

export function recipeOutputGoodName(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByLabelText(new RegExp(`nombre del producto ${index}`, 'i'))
}

export function recipeOutputQuantity(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByLabelText(new RegExp(`cantidad del producto ${index}`, 'i'))
}

export function removeRecipeOutputButton(index: number): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByRole('button', { name: new RegExp(`eliminar producto ${index}`, 'i') })
}

export function saveRecipeButton(): HTMLElement {
  openDesignSection('Recetas')
  return screen.getByRole('button', { name: /guardar receta/i })
}

export function goodNameInput(): HTMLElement {
  openDesignSection('Bienes')
  return screen.getByLabelText(/bien o servicio/i)
}

export function registerGoodButton(): HTMLElement {
  openDesignSection('Bienes')
  return screen.getByRole('button', { name: /registrar bien o servicio/i })
}

export function agentNameInput(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/nombre del agente/i)
}

export function agentRecipesPerActionInput(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/recetas por acción/i)
}

export function addAgentInventoryLineButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /agregar línea de inventario/i })
}

export function agentInventoryGoodName(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(new RegExp(`nombre del bien ${index}`, 'i'))
}

export function agentInventoryQuantity(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(new RegExp(`cantidad del bien ${index}`, 'i'))
}

export function removeAgentInventoryLineButton(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', {
    name: new RegExp(`eliminar bien ${index}`, 'i'),
  })
}

export function createAgentButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /crear agente/i })
}

export function manageAgentRecipesButton(
  catalog: ReturnType<typeof withinAgentCatalog>,
): HTMLElement {
  return catalog.getByRole('button', { name: /gestionar recetas/i })
}

export function manageAgentRulesButton(
  catalog: ReturnType<typeof withinAgentCatalog>,
): HTMLElement {
  return catalog.getByRole('button', { name: /gestionar reglas/i })
}

export function agentRecipeNameInput(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/nombre de la receta del agente/i)
}

export function addAgentRecipeInputButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /agregar entrada de receta del agente/i })
}

export function agentRecipeInputGoodName(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(new RegExp(`nombre del insumo de receta del agente ${index}`, 'i'))
}

export function agentRecipeInputQuantity(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(new RegExp(`cantidad del insumo de receta del agente ${index}`, 'i'))
}

export function addAgentRecipeOutputButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /agregar salida de receta del agente/i })
}

export function agentRecipeOutputGoodName(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(new RegExp(`nombre del producto de receta del agente ${index}`, 'i'))
}

export function agentRecipeOutputQuantity(index: number): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(
    new RegExp(`cantidad del producto de receta del agente ${index}`, 'i'),
  )
}

export function saveAgentRecipeButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /guardar receta del agente/i })
}

export function ruleRecipeSelect(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/receta de la regla/i)
}

export function ruleConditionGoodSelect(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/bien de la condición/i)
}

export function ruleConditionQuantityInput(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/cantidad de la condición/i)
}

export function ruleConditionOperatorSelect(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/operador de la condición/i)
}

export function rulePriorityInput(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByLabelText(/prioridad de la regla/i)
}

export function saveRuleButton(): HTMLElement {
  openDesignSection('Agentes')
  return screen.getByRole('button', { name: /guardar regla/i })
}

export function editButton(scope: Screen | ReturnType<typeof within> = screen): HTMLElement {
  return scope.getByRole('button', { name: /editar/i })
}

export function deleteButton(scope: Screen | ReturnType<typeof within> = screen): HTMLElement {
  return scope.getByRole('button', { name: /eliminar/i })
}
