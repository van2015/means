import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { PLAY_TICK_MS } from '@/presentation/usePlayMode'
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

  it('journey 11: change the priority of the possessed agent rules', async () => {
    render(<App stores={stores} />)

    // --- design mode: goods, recipe, agent, two rules (priorities 1 and 2) ---
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
    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '2')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    await user.selectOptions(ruleRecipeSelect(), 'Pan de harina')
    await user.selectOptions(ruleConditionGoodSelect(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '5')
    await user.selectOptions(ruleConditionOperatorSelect(), 'LESS_THAN')
    await user.type(rulePriorityInput(), '2')
    await user.click(saveRuleButton())

    // --- play mode: rules listed in priority order ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))

    const rules = screen.getByRole('list', { name: /reglas del agente poseído/i })
    let items = within(rules).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toMatch(/al menos 2 harina/i)
    expect(items[1].textContent).toMatch(/menos de 5 harina/i)

    // --- change the second rule's priority from 2 to 0 ---
    const inputs = screen.getAllByLabelText(/prioridad de la regla/i)
    await user.clear(inputs[1])
    await user.type(inputs[1], '0')
    await user.click(screen.getAllByRole('button', { name: /guardar prioridad/i })[1])

    items = within(rules).getAllByRole('listitem')
    expect(items[0].textContent).toMatch(/menos de 5 harina/i)
    expect(items[0].textContent).toContain('prioridad: 0')
    expect(items[1].textContent).toMatch(/al menos 2 harina/i)
    expect(items[1].textContent).toContain('prioridad: 1')

    // --- persistence: design mode and back ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))
    await user.click(manageAgentRulesButton(withinAgentCatalog()))
    expect(withinAgentCatalog().getByText(/menos de 5 harina/i)).toBeInTheDocument()
    expect(withinAgentCatalog().getByText(/prioridad: 0/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    const rulesAgain = screen.getByRole('list', { name: /reglas del agente poseído/i })
    const itemsAgain = within(rulesAgain).getAllByRole('listitem')
    expect(itemsAgain[0].textContent).toContain('prioridad: 0')
    expect(itemsAgain[1].textContent).toContain('prioridad: 1')
  })

  it('journey 12: produce with catalog and agent recipes', async () => {
    render(<App stores={stores} />)

    // --- design mode: goods, recipe (2 Harina → 1 Pan), agent with 10 Harina ---
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

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    // --- play mode: possess and produce with the catalog recipe ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))

    const catalogList = screen.getByRole('list', { name: /recetas del catálogo para producir/i })
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))

    let inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).getByText('Harina: 8')).toBeInTheDocument()
    expect(within(inventory).getByText('Pan: 1')).toBeInTheDocument()

    // --- produce four more times: flour 8 → 6 → 4 → 2 → 0 (line disappears) ---
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))

    inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).queryByText(/^harina:/i)).not.toBeInTheDocument()
    expect(within(inventory).getByText('Pan: 5')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    // --- one more time: insufficient material, nothing changes ---
    await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/falta harina: necesitas 2, tienes 0/i)
    inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).queryByText(/^harina:/i)).not.toBeInTheDocument()
    expect(within(inventory).getByText('Pan: 5')).toBeInTheDocument()

    // --- persistence across mode switches: inventory persists, the error is transient
    // (the presenter is recreated on remount, so the alert is gone)
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).getByText('Pan: 5')).toBeInTheDocument()
    expect(within(inventory).queryByText(/^harina:/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('journey 13: produce with an agent-specific recipe', async () => {
    render(<App stores={stores} />)

    // --- design mode: goods, agent with inventory and its own recipe ---
    await registerGood('Harina')
    await registerGood('Pan')

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    await user.type(agentRecipeNameInput(), 'Horneado propio')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '4')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '2')
    await user.click(saveAgentRecipeButton())

    // --- play mode: produce with the agent recipe ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))

    // no catalog recipes: empty state shown
    expect(screen.getByText(/no hay recetas en el catálogo/i)).toBeInTheDocument()

    const agentList = screen.getByRole('list', { name: /recetas del agente para producir/i })
    expect(within(agentList).getByText('Horneado propio')).toBeInTheDocument()
    await user.click(within(agentList).getByRole('button', { name: /^producir$/i }))

    const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(inventory).getByText('Harina: 6')).toBeInTheDocument()
    expect(within(inventory).getByText('Pan: 2')).toBeInTheDocument()
  })

  it('journey 14: background agents keep running their rules while another is possessed', async () => {
    render(<App stores={stores} />)

    // --- design mode: recipe and two agents with the same automatic rule ---
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

    const harina = stores.goodStore.findIdByName('Harina')
    const recipe = stores.recipeStore.findByName('Pan de harina')
    expect(harina.ok && recipe.ok).toBe(true)
    if (!harina.ok || !recipe.ok) return

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    await user.type(agentNameInput(), 'Obrero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const baker = stores.agentStore.findByName('Panadero')
    const worker = stores.agentStore.findByName('Obrero')
    expect(baker.ok && worker.ok).toBe(true)
    if (!baker.ok || !worker.ok) return

    for (const agent of [baker.agent, worker.agent]) {
      const rule = stores.agentStore.addRule(
        agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: harina.id, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
    }

    // --- play mode: possess the baker (first in the list) ---
    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    const availableAgents = screen.getByRole('list', { name: /agentes disponibles/i })
    await user.click(within(availableAgents).getAllByRole('button', { name: /^poseer$/i })[0])

    // snapshot right after possession: whatever the baker had at this point
    const bakerAtPossession = stores.agentStore.findById(baker.agent.id)
    expect(bakerAtPossession.ok).toBe(true)
    if (!bakerAtPossession.ok) return
    const bakerFlourAtPossession = bakerAtPossession.agent.quantityOf(harina.id)

    // --- the worker keeps producing in the background ---
    await waitFor(
      () => {
        const workerNow = stores.agentStore.findById(worker.agent.id)
        expect(workerNow.ok).toBe(true)
        if (!workerNow.ok) return
        expect(workerNow.agent.quantityOf(harina.id)).toBeLessThan(10)
      },
      { timeout: PLAY_TICK_MS * 4 },
    )

    // --- the possessed baker did NOT run its rules meanwhile ---
    const bakerAfter = stores.agentStore.findById(baker.agent.id)
    expect(bakerAfter.ok).toBe(true)
    if (!bakerAfter.ok) return
    expect(bakerAfter.agent.quantityOf(harina.id)).toBe(bakerFlourAtPossession)
    const bakerInventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(
      within(bakerInventory).getByText(`Harina: ${bakerFlourAtPossession}`),
    ).toBeInTheDocument()

    // --- switching possession reveals the worker's produced inventory ---
    const remaining = within(
      screen.getByRole('list', { name: /agentes disponibles/i }),
    ).getAllByRole('button', { name: /^poseer$/i })
    expect(remaining).toHaveLength(1)
    await user.click(remaining[0])

    const workerNow = stores.agentStore.findById(worker.agent.id)
    const pan = stores.goodStore.findIdByName('Pan')
    expect(workerNow.ok && pan.ok).toBe(true)
    if (!workerNow.ok || !pan.ok) return
    const workerFlour = workerNow.agent.quantityOf(harina.id)
    const workerPan = workerNow.agent.quantityOf(pan.id)
    expect(workerFlour).toBeLessThan(10)
    expect(workerPan).toBeGreaterThan(0)

    const workerInventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
    expect(within(workerInventory).getByText(`Harina: ${workerFlour}`)).toBeInTheDocument()
    expect(within(workerInventory).getByText(`Pan: ${workerPan}`)).toBeInTheDocument()
  })

  it('journey 15: export a world selection and import it into another world', async () => {
    // --- world A: build a complete economy ---
    const worldA = createStores()
    const first = render(<App stores={worldA} />)

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

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    await user.type(agentRecipeNameInput(), 'Horneado propio')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '1')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    // rule referencing the catalog recipe (setup via store, as in journey 14)
    const recipeA = worldA.recipeStore.findByName('Pan de harina')
    const harinaA = worldA.goodStore.findIdByName('Harina')
    const agentA = worldA.agentStore.findByName('Panadero')
    expect(recipeA.ok && harinaA.ok && agentA.ok).toBe(true)
    if (!recipeA.ok || !harinaA.ok || !agentA.ok) return
    worldA.agentStore.addRule(
      agentA.agent.id,
      { source: 'catalog', recipeId: recipeA.recipe.id },
      { goodId: harinaA.id, quantity: 5, operator: 'AT_LEAST' },
      1,
    )

    // --- select everything and export (capturing the would-be download) ---
    const capturedBlobs: Blob[] = []
    URL.createObjectURL = ((blob: Blob) => {
      capturedBlobs.push(blob)
      return 'blob:mock'
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = () => undefined
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const transferSection = screen
      .getByRole('heading', { name: /exportar \/ importar mundo/i })
      .closest('section')!
    const checkboxes = within(transferSection).getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      await user.click(checkbox)
    }
    await user.click(within(transferSection).getByRole('button', { name: /exportar selección/i }))

    expect(anchorClick).toHaveBeenCalled()
    expect(capturedBlobs).toHaveLength(1)
    const exportedJson = await capturedBlobs[0].text()
    const exported = JSON.parse(exportedJson)
    expect(exported.version).toBe(1)
    expect(exported.goods.map((g: { name: string }) => g.name).sort()).toEqual(['Harina', 'Pan'])
    expect(exported.recipes.map((r: { name: string }) => r.name)).toEqual(['Pan de harina'])
    expect(exported.agents.map((a: { name: string }) => a.name)).toEqual(['Panadero'])
    expect(exported.agents[0].recipes.map((r: { name: string }) => r.name)).toEqual([
      'Horneado propio',
    ])
    expect(exported.agents[0].rules).toHaveLength(1)
    vi.restoreAllMocks()

    // --- world B: empty, import the file ---
    first.unmount()
    const worldB = createStores()
    render(<App stores={worldB} />)

    const file = new File([exportedJson], 'means-mundo.json', { type: 'application/json' })
    const transferSectionB = screen
      .getByRole('heading', { name: /exportar \/ importar mundo/i })
      .closest('section')!
    await user.upload(within(transferSectionB).getByLabelText(/importar archivo/i), file)

    expect(await screen.findByRole('status')).toHaveTextContent(/se importaron/i)

    // --- verify everything landed in world B's UI ---
    const goodsCatalog = screen
      .getByRole('heading', { name: /bienes y servicios/i })
      .closest('section')!
    expect(within(goodsCatalog).getByText('Harina')).toBeInTheDocument()
    expect(within(goodsCatalog).getByText('Pan')).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText('Pan de harina')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()

    await user.click(manageAgentRecipesButton(withinAgentCatalog()))
    expect(withinAgentCatalog().getByText('Horneado propio')).toBeInTheDocument()

    await user.click(manageAgentRulesButton(withinAgentCatalog()))
    expect(withinAgentCatalog().getByText(/al menos 5 harina/i)).toBeInTheDocument()
    expect(withinAgentCatalog().getByText(/prioridad: 1/i)).toBeInTheDocument()

    // --- re-import: everything is omitted, nothing duplicated ---
    await user.upload(
      within(
        screen.getByRole('heading', { name: /exportar \/ importar mundo/i }).closest('section')!,
      ).getByLabelText(/importar archivo/i),
      file,
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      /se importaron 0 elementos y se omitieron/i,
    )
    expect(worldB.goodStore.all()).toHaveLength(2)
    expect(worldB.recipeStore.count()).toBe(1)
    expect(worldB.agentStore.count()).toBe(1)
    expect(worldB.agentStore.all()[0].rules).toHaveLength(1)
  })
})
