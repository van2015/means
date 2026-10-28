import { screen, within, type Screen } from '@testing-library/react'

export function withinRecipeCatalog() {
  return within(screen.getByRole('heading', { name: /catálogo de recetas/i }).closest('section')!)
}

export function withinAgentCatalog() {
  return within(screen.getByRole('heading', { name: /catálogo de agentes/i }).closest('section')!)
}

export function recipeNameInput(): HTMLElement {
  return screen.getByLabelText(/^nombre$/i)
}

export function addRecipeInputButton(): HTMLElement {
  return screen.getByRole('button', { name: /agregar entrada/i })
}

export function recipeInputGoodName(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`nombre del insumo ${index}`, 'i'))
}

export function recipeInputQuantity(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`cantidad del insumo ${index}`, 'i'))
}

export function addRecipeOutputButton(): HTMLElement {
  return screen.getByRole('button', { name: /agregar salida/i })
}

export function recipeOutputGoodName(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`nombre del producto ${index}`, 'i'))
}

export function recipeOutputQuantity(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`cantidad del producto ${index}`, 'i'))
}

export function saveRecipeButton(): HTMLElement {
  return screen.getByRole('button', { name: /guardar receta/i })
}

export function goodNameInput(): HTMLElement {
  return screen.getByLabelText(/bien o servicio/i)
}

export function registerGoodButton(): HTMLElement {
  return screen.getByRole('button', { name: /registrar bien o servicio/i })
}

export function agentNameInput(): HTMLElement {
  return screen.getByLabelText(/nombre del agente/i)
}

export function addAgentInventoryLineButton(): HTMLElement {
  return screen.getByRole('button', { name: /agregar línea de inventario/i })
}

export function agentInventoryGoodName(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`nombre del bien ${index}`, 'i'))
}

export function agentInventoryQuantity(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`cantidad del bien ${index}`, 'i'))
}

export function createAgentButton(): HTMLElement {
  return screen.getByRole('button', { name: /crear agente/i })
}

export function manageAgentRecipesButton(catalog: ReturnType<typeof withinAgentCatalog>): HTMLElement {
  return catalog.getByRole('button', { name: /gestionar recetas/i })
}

export function agentRecipeNameInput(): HTMLElement {
  return screen.getByLabelText(/nombre de la receta del agente/i)
}

export function addAgentRecipeInputButton(): HTMLElement {
  return screen.getByRole('button', { name: /agregar entrada de receta del agente/i })
}

export function agentRecipeInputGoodName(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`nombre del insumo de receta del agente ${index}`, 'i'))
}

export function agentRecipeInputQuantity(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`cantidad del insumo de receta del agente ${index}`, 'i'))
}

export function addAgentRecipeOutputButton(): HTMLElement {
  return screen.getByRole('button', { name: /agregar salida de receta del agente/i })
}

export function agentRecipeOutputGoodName(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`nombre del producto de receta del agente ${index}`, 'i'))
}

export function agentRecipeOutputQuantity(index: number): HTMLElement {
  return screen.getByLabelText(new RegExp(`cantidad del producto de receta del agente ${index}`, 'i'))
}

export function saveAgentRecipeButton(): HTMLElement {
  return screen.getByRole('button', { name: /guardar receta del agente/i })
}

export function editButton(scope: Screen | ReturnType<typeof within> = screen): HTMLElement {
  return scope.getByRole('button', { name: /editar/i })
}

export function deleteButton(scope: Screen | ReturnType<typeof within> = screen): HTMLElement {
  return scope.getByRole('button', { name: /eliminar/i })
}
