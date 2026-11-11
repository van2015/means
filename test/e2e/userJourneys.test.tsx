import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { App } from '@/react/App'
import {
  addAgentInventoryLineButton,
  addAgentRecipeInputButton,
  addAgentRecipeOutputButton,
  addRecipeInputButton,
  addRecipeOutputButton,
  agentInventoryGoodName,
  agentInventoryQuantity,
  agentNameInput,
  agentRecipeInputGoodName,
  agentRecipeInputQuantity,
  agentRecipeNameInput,
  agentRecipeOutputGoodName,
  agentRecipeOutputQuantity,
  createAgentButton,
  goodNameInput,
  manageAgentRecipesButton,
  manageAgentRulesButton,
  recipeInputGoodName,
  recipeInputQuantity,
  recipeNameInput,
  recipeOutputGoodName,
  recipeOutputQuantity,
  registerGoodButton,
  ruleConditionGoodSelect,
  ruleConditionOperatorSelect,
  ruleConditionQuantityInput,
  rulePriorityInput,
  ruleRecipeSelect,
  saveAgentRecipeButton,
  saveRecipeButton,
  saveRuleButton,
  withinAgentCatalog,
  withinRecipeCatalog,
} from '../helpers/designModeQueries'

describe('E2E: user journeys across the whole app', () => {
  let stores: Stores
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    stores = createStores()
    user = userEvent.setup()
  })

  async function registerGood(name: string) {
    await user.type(goodNameInput(), name)
    await user.click(registerGoodButton())
  }

  it('journey 1: build a complete economy in design mode and keep it when switching modes', async () => {
    render(<App stores={stores} />)

    // --- register goods ---
    await registerGood('Harina')
    await registerGood('Pan')
    expect(within(document.body).getAllByText('Harina').length).toBeGreaterThan(0)

    // --- catalog recipe ---
    await user.type(recipeNameInput(), 'Pan de harina')
    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '2')
    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')
    await user.click(saveRecipeButton())

    const recipeCatalog = withinRecipeCatalog()
    expect(recipeCatalog.getByText('Pan de harina')).toBeInTheDocument()
    expect(recipeCatalog.getByText(/harina: 2/i)).toBeInTheDocument()
    expect(recipeCatalog.getByText(/pan: 1/i)).toBeInTheDocument()

    // --- agent with initial inventory ---
    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText('Panadero')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 10/i)).toBeInTheDocument()

    // --- agent-specific recipe ---
    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    await user.type(agentRecipeNameInput(), 'Horneado propio')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '1')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '2')
    await user.click(saveAgentRecipeButton())

    expect(agentCatalog.getByText('Horneado propio')).toBeInTheDocument()
    // agent-specific recipes must NOT leak into the general catalog
    expect(withinRecipeCatalog().queryByText('Horneado propio')).not.toBeInTheDocument()

    // --- automatic rule referencing the catalog recipe ---
    await user.click(manageAgentRulesButton(withinAgentCatalog()))
    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '5')
    await user.selectOptions(ruleConditionOperatorSelect(), 'AT_LEAST')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    const rulesList = within(screen.getByRole('list', { name: /reglas del agente/i }))
    expect(rulesList.getByText(/pan de harina/i)).toBeInTheDocument()
    expect(rulesList.getByText(/al menos 5 harina/i)).toBeInTheDocument()

    // --- switch to play mode: shared state is intact ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    expect(screen.getByRole('heading', { name: /modo juego/i })).toBeInTheDocument()
    expect(screen.getByText(/bienes registrados: 2/i)).toBeInTheDocument()

    // --- back to design mode: catalogs keep the shared data ---
    // (DesignMode unmounts while in play mode, so agent selection is reset)
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))
    expect(withinRecipeCatalog().getByText('Pan de harina')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText(/harina: 10/i)).toBeInTheDocument()

    // re-select the agent to confirm its recipe survived the mode switch
    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    expect(withinAgentCatalog().getByText('Horneado propio')).toBeInTheDocument()
  })

  it('journey 2: edit then delete a catalog recipe, and edits reflect in the catalog', async () => {
    render(<App stores={stores} />)
    await registerGood('Harina')
    await registerGood('Pan')

    await user.type(recipeNameInput(), 'Pan de harina')
    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '2')
    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')
    await user.click(saveRecipeButton())

    // edit
    await user.click(withinRecipeCatalog().getByRole('button', { name: /editar/i }))
    expect(recipeNameInput()).toHaveValue('Pan de harina')
    await user.clear(recipeInputQuantity(1))
    await user.type(recipeInputQuantity(1), '5')
    await user.click(saveRecipeButton())

    const catalog = withinRecipeCatalog()
    expect(catalog.getByText(/harina: 5/i)).toBeInTheDocument()
    expect(catalog.queryByText(/harina: 2/i)).not.toBeInTheDocument()

    // delete
    await user.click(catalog.getByRole('button', { name: /eliminar/i }))
    expect(catalog.queryByText('Pan de harina')).not.toBeInTheDocument()
  })

  it('journey 3: validation errors are shown and nothing invalid is persisted', async () => {
    render(<App stores={stores} />)
    await registerGood('Harina')

    // duplicate good
    await user.type(goodNameInput(), 'Harina')
    await user.click(registerGoodButton())
    expect(screen.getByText(/el bien ya está registrado/i)).toBeInTheDocument()
    expect(stores.goodStore.all()).toHaveLength(1)

    // recipe without lines
    await user.click(saveRecipeButton())
    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
    expect(stores.recipeStore.count()).toBe(0)

    // agent referencing an unregistered good
    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Madera')
    await user.type(agentInventoryQuantity(1), '3')
    await user.click(createAgentButton())
    expect(screen.getByText(/el bien "Madera" no está registrado/i)).toBeInTheDocument()
    expect(stores.agentStore.count()).toBe(0)
  })

  it('journey 4: rules are listed ordered by priority after creating them out of order', async () => {
    render(<App stores={stores} />)
    await registerGood('Harina')
    await registerGood('Pan')

    await user.type(recipeNameInput(), 'Pan de harina')
    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '1')
    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')
    await user.click(saveRecipeButton())

    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())

    await user.click(manageAgentRulesButton(withinAgentCatalog()))

    // rule with priority 2 first
    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '2')
    await user.type(rulePriorityInput(), '2')
    await user.click(saveRuleButton())

    // rule with priority 1 second
    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Pan')
    await user.type(ruleConditionQuantityInput(), '1')
    await user.selectOptions(ruleConditionOperatorSelect(), 'LESS_THAN')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    const rulesList = screen.getByRole('list', { name: /reglas del agente/i })
    const items = within(rulesList)
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatch(/menos de 1 pan/i)
    expect(items[1]).toMatch(/al menos 2 harina/i)
  })

  it('journey 5: delete an agent-specific recipe and a rule from the UI', async () => {
    render(<App stores={stores} />)
    await registerGood('Harina')
    await registerGood('Pan')

    await user.type(recipeNameInput(), 'Pan de harina')
    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '1')
    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')
    await user.click(saveRecipeButton())

    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())

    // agent-specific recipe: create + delete
    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    await user.type(agentRecipeNameInput(), 'Horneado propio')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '1')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())
    expect(withinAgentCatalog().getByText('Horneado propio')).toBeInTheDocument()

    await user.click(withinAgentCatalog().getByRole('button', { name: /eliminar/i }))
    expect(withinAgentCatalog().queryByText('Horneado propio')).not.toBeInTheDocument()

    // rule: create + delete
    await user.click(manageAgentRulesButton(withinAgentCatalog()))
    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '5')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    const rulesList = screen.getByRole('list', { name: /reglas del agente/i })
    expect(within(rulesList).getByText(/pan de harina/i)).toBeInTheDocument()

    await user.click(within(rulesList).getByRole('button', { name: /eliminar/i }))
    expect(within(rulesList).queryByText(/pan de harina/i)).not.toBeInTheDocument()
  })

  it('journey 6: correct mistakes while filling forms instead of starting over', async () => {
    render(<App stores={stores} />)
    await registerGood('Harina')
    await registerGood('Pan')

    // empty recipe name is rejected with a visible error
    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '1')
    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')
    await user.click(saveRecipeButton())
    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText('Harina')).not.toBeInTheDocument()

    // now type the name and save
    await user.type(recipeNameInput(), 'Pan de harina')
    await user.click(saveRecipeButton())
    expect(withinRecipeCatalog().getByText('Pan de harina')).toBeInTheDocument()

    // build an agent recipe, removing a wrongly added line first
    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())
    await user.click(manageAgentRecipesButton(withinAgentCatalog()))

    await user.type(agentRecipeNameInput(), 'Horneado')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '1')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(2), 'Madera')
    await user.type(agentRecipeInputQuantity(2), '5')

    // remove the wrong second line (the fix for story #16 on agent recipes)
    await user.click(
      screen.getByRole('button', { name: /eliminar insumo de receta del agente 2/i }),
    )
    expect(
      screen.queryByLabelText(/nombre del insumo de receta del agente 2/i),
    ).not.toBeInTheDocument()

    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '2')
    await user.click(saveAgentRecipeButton())

    const agent = stores.agentStore.findByName('Panadero')
    expect(agent.ok).toBe(true)
    if (!agent.ok) return
    expect(agent.agent.recipes).toHaveLength(1)
    // only the correct line survived: 'Madera' was never persisted
    expect(agent.agent.recipes[0].inputs).toHaveLength(1)
    expect(agent.agent.recipes[0].inputs[0].quantity).toBe(1)

    // duplicate agent recipe names are rejected
    await user.type(agentRecipeNameInput(), 'Horneado')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())
    expect(screen.getByText(/ya existe una receta con ese nombre/i)).toBeInTheDocument()

    const after = stores.agentStore.findByName('Panadero')
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.agent.recipes).toHaveLength(1)
  })
})
