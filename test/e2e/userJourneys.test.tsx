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
    const availableAgents = screen.getByRole('list', { name: /agentes disponibles/i })
    expect(within(availableAgents).getByText('Panadero')).toBeInTheDocument()
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()

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

  it('journey 7: view available agents and possess one in play mode', async () => {
    render(<App stores={stores} />)

    // --- create two agents in design mode ---
    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())
    await user.type(agentNameInput(), 'Obrero')
    await user.click(createAgentButton())

    // --- go to play mode: both agents are available ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    const availableAgents = screen.getByRole('list', { name: /agentes disponibles/i })
    expect(within(availableAgents).getAllByRole('listitem')).toHaveLength(2)
    expect(within(availableAgents).getByText('Panadero')).toBeInTheDocument()
    expect(within(availableAgents).getByText('Obrero')).toBeInTheDocument()
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()

    // --- possess one agent ---
    const poseerButtons = within(availableAgents).getAllByRole('button', { name: /^poseer$/i })
    await user.click(poseerButtons[0])

    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
    expect(screen.queryByText(/no posees a ningún agente/i)).not.toBeInTheDocument()

    // the possessed agent shows its status; the rest keep their buttons (story #9)
    const items = within(availableAgents).getAllByRole('listitem')
    expect(within(items[0]).getByText(/poseído/i)).toBeInTheDocument()
    const remaining = within(availableAgents).getAllByRole('button', { name: /^poseer$/i })
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toBeEnabled()

    // --- possession survives switching to design mode and back ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
    expect(stores.possessionStore.possessed()?.name).toBe('Panadero')
  })

  it('journey 8: play mode shows an empty state when there are no agents', async () => {
    render(<App stores={stores} />)

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))

    expect(screen.getByText(/no hay agentes disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^poseer$/i })).not.toBeInTheDocument()
  })

  it('journey 9: switch the possessed agent and release it', async () => {
    render(<App stores={stores} />)

    // --- create two agents in design mode ---
    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())
    await user.type(agentNameInput(), 'Obrero')
    await user.click(createAgentButton())

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    const availableAgents = screen.getByRole('list', { name: /agentes disponibles/i })

    // no possession yet: no release button
    expect(screen.queryByRole('button', { name: /dejar de poseer/i })).not.toBeInTheDocument()

    // --- possess Panadero, then switch to Obrero ---
    const poseerButtons = within(availableAgents).getAllByRole('button', { name: /^poseer$/i })
    await user.click(poseerButtons[0])
    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()

    const switchButtons = within(availableAgents).getAllByRole('button', { name: /^poseer$/i })
    expect(switchButtons).toHaveLength(1)
    await user.click(switchButtons[0])

    expect(screen.getByText(/poseído: obrero/i)).toBeInTheDocument()
    expect(screen.queryByText(/poseído: panadero/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dejar de poseer/i })).toBeInTheDocument()

    // --- switch to design mode and back: the switch persists ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    expect(screen.getByText(/poseído: obrero/i)).toBeInTheDocument()

    // --- release the agent ---
    await user.click(screen.getByRole('button', { name: /dejar de poseer/i }))
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dejar de poseer/i })).not.toBeInTheDocument()
    expect(stores.possessionStore.possessedAgentId()).toBeNull()

    // both agents are poseable again
    const again = within(screen.getByRole('list', { name: /agentes disponibles/i })).getAllByRole(
      'button',
      { name: /^poseer$/i },
    )
    expect(again).toHaveLength(2)
    await user.click(again[0])
    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
  })

  it('journey 10: view inventory and recipes of the possessed agent', async () => {
    render(<App stores={stores} />)

    // --- design mode: goods, agent with inventory, agent-specific recipe ---
    await registerGood('Harina')
    await registerGood('Pan')

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    await user.type(agentRecipeNameInput(), 'Horneado')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    // --- play mode: sections hidden until possessing ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    expect(screen.queryByRole('heading', { name: /inventario de/i })).not.toBeInTheDocument()

    // --- possess: inventory and recipes appear ---
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))

    expect(screen.getByRole('heading', { name: /inventario de panadero/i })).toBeInTheDocument()
    const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).getByText('Harina: 10')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /recetas de panadero/i })).toBeInTheDocument()
    const recipes = screen.getByRole('list', { name: /recetas del agente poseído/i })
    expect(within(recipes).getByText('Horneado')).toBeInTheDocument()
    expect(within(recipes).getByText(/insumo: harina: 2/i)).toBeInTheDocument()
    expect(within(recipes).getByText(/producto: pan: 1/i)).toBeInTheDocument()

    // --- release: sections disappear ---
    await user.click(screen.getByRole('button', { name: /dejar de poseer/i }))
    expect(screen.queryByRole('heading', { name: /inventario de/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /recetas de/i })).not.toBeInTheDocument()

    // --- possess again: sections are back, reading the same stores ---
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))
    const inventoryAgain = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventoryAgain).getByText('Harina: 10')).toBeInTheDocument()
    const recipesAgain = screen.getByRole('list', { name: /recetas del agente poseído/i })
    expect(within(recipesAgain).getByText('Horneado')).toBeInTheDocument()
  })
})
