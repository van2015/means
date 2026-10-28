import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { DesignMode } from '@/react/DesignMode'
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
  deleteButton,
  editButton,
  goodNameInput,
  manageAgentRecipesButton,
  manageAgentRulesButton,
  recipeInputGoodName,
  recipeInputQuantity,
  recipeNameInput,
  removeRecipeInputButton,
  recipeOutputGoodName,
  recipeOutputQuantity,
  registerGoodButton,
  removeAgentInventoryLineButton,
  removeRecipeOutputButton,
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

describe('DesignMode', () => {
  let stores: Stores

  beforeEach(() => {
    stores = createStores()
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')
    stores.goodStore.create('Huevos')
    stores.goodStore.create('Tortilla')
  })

  it('renders a recipe form with inputs, outputs and save', () => {
    render(<DesignMode stores={stores} />)

    expect(recipeNameInput()).toBeInTheDocument()
    expect(screen.getByText(/entradas/i)).toBeInTheDocument()
    expect(screen.getByText(/salidas/i)).toBeInTheDocument()
    expect(saveRecipeButton()).toBeInTheDocument()
  })

  it('saves a valid recipe and shows it in the catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(recipeNameInput(), 'Pan')

    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '2')

    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')

    await user.click(saveRecipeButton())

    expect(screen.getByRole('heading', { name: /catálogo de recetas/i })).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText('Pan')).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText(/harina: 2/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText(/pan: 1/i)).toBeInTheDocument()
  })

  it('removes an input line while creating a recipe', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(1), 'Harina')
    await user.type(recipeInputQuantity(1), '2')

    await user.click(addRecipeInputButton())
    await user.type(recipeInputGoodName(2), 'Huevos')
    await user.type(recipeInputQuantity(2), '3')

    await user.click(removeRecipeInputButton(1))

    expect(screen.queryByLabelText(/nombre del insumo 2/i)).not.toBeInTheDocument()
    expect(recipeInputGoodName(1)).toHaveValue('Huevos')
    expect(recipeInputQuantity(1)).toHaveValue(3)
  })

  it('removes an output line while creating a recipe', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')

    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(2), 'Tortilla')
    await user.type(recipeOutputQuantity(2), '2')

    await user.click(removeRecipeOutputButton(1))

    expect(screen.queryByLabelText(/nombre del producto 2/i)).not.toBeInTheDocument()
    expect(recipeOutputGoodName(1)).toHaveValue('Tortilla')
    expect(recipeOutputQuantity(1)).toHaveValue(2)
  })

  it('saves an edited recipe without the removed input line', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [
        { goodName: 'Harina', quantity: 2 },
        { goodName: 'Huevos', quantity: 3 },
      ],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(editButton())
    await user.click(removeRecipeInputButton(1))
    await user.click(saveRecipeButton())

    expect(withinRecipeCatalog().getByText(/huevos: 3/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText(/harina: 2/i)).not.toBeInTheDocument()
  })

  it('saves an edited recipe without the removed output line', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [
        { goodName: 'Pan', quantity: 1 },
        { goodName: 'Tortilla', quantity: 2 },
      ],
    })

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(editButton())
    await user.click(removeRecipeOutputButton(1))
    await user.click(saveRecipeButton())

    expect(withinRecipeCatalog().getByText(/tortilla: 2/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText(/pan: 1/i)).not.toBeInTheDocument()
  })

  it('loads a recipe into the form when clicking edit', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode stores={stores} />)

    await userEvent.click(editButton())

    expect(recipeNameInput()).toHaveValue('Pan')
    expect(recipeInputGoodName(1)).toHaveValue('Harina')
    expect(recipeInputQuantity(1)).toHaveValue(2)
    expect(recipeOutputGoodName(1)).toHaveValue('Pan')
    expect(recipeOutputQuantity(1)).toHaveValue(1)
  })

  it('saves edited recipe and shows updated data in the catalog', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode stores={stores} />)

    await userEvent.click(editButton())

    await userEvent.clear(recipeNameInput())
    await userEvent.type(recipeNameInput(), 'Pan integral')

    await userEvent.click(saveRecipeButton())

    expect(withinRecipeCatalog().getByText('Pan integral')).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText('Pan')).not.toBeInTheDocument()
  })

  it('deletes a recipe and it disappears from the catalog', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode stores={stores} />)

    await userEvent.click(deleteButton())

    expect(withinRecipeCatalog().queryByText('Pan')).not.toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText(/harina: 2/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when editing an invalid recipe and does not update the catalog', async () => {
    stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode stores={stores} />)

    await userEvent.click(editButton())

    await userEvent.clear(recipeNameInput())
    await userEvent.type(recipeNameInput(), 'Pan invalido')

    await userEvent.clear(recipeInputQuantity(1))
    await userEvent.type(recipeInputQuantity(1), '0')

    await userEvent.click(saveRecipeButton())

    expect(screen.getByText(/la cantidad de harina debe ser mayor que cero/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText('Pan')).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText('Pan invalido')).not.toBeInTheDocument()
  })

  it('registers a good and shows it in the goods catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(goodNameInput(), 'Harina')
    await user.click(registerGoodButton())

    expect(screen.getByRole('heading', { name: /bienes y servicios/i })).toBeInTheDocument()
    expect(screen.getByText('Harina')).toBeInTheDocument()
  })

  it('shows an error when registering a good with an empty name', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(registerGoodButton())

    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: /harina/i })).not.toBeInTheDocument()
  })

  it('lets the user pick an existing good when adding a recipe line', async () => {
    const user = userEvent.setup()
    stores.goodStore.create('Harina')

    render(<DesignMode stores={stores} />)

    await user.click(addRecipeInputButton())

    const input = recipeInputGoodName(1)
    expect(input).toHaveAttribute('list', 'goods-list-inputs')

    const datalist = document.getElementById('goods-list-inputs')
    expect(datalist).toBeInTheDocument()
    expect(datalist?.querySelector('option[value="Harina"]')).toBeInTheDocument()

    await user.type(input, 'Harina')
    await user.type(recipeInputQuantity(1), '2')

    await user.click(addRecipeOutputButton())
    await user.type(recipeOutputGoodName(1), 'Pan')
    await user.type(recipeOutputQuantity(1), '1')

    await user.type(recipeNameInput(), 'Pan')
    await user.click(saveRecipeButton())

    expect(withinRecipeCatalog().getByText('Pan')).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText(/harina: 2/i)).toBeInTheDocument()
    expect(withinRecipeCatalog().getByText(/pan: 1/i)).toBeInTheDocument()

    const harinaGoods = stores.goodStore.all().filter((good) => good.name === 'Harina')
    expect(harinaGoods).toHaveLength(1)
  })

  it('shows validation errors on invalid submit', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(saveRecipeButton())

    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
  })

  it('creates an agent with name and initial inventory and shows it in the catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')

    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')

    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText('Panadero')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 10/i)).toBeInTheDocument()
  })

  it('removes an inventory line while creating an agent', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')

    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')

    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(2), 'Huevos')
    await user.type(agentInventoryQuantity(2), '3')

    await user.click(removeAgentInventoryLineButton(1))

    expect(screen.queryByLabelText(/nombre del bien 2/i)).not.toBeInTheDocument()
    expect(agentInventoryGoodName(1)).toHaveValue('Huevos')
    expect(agentInventoryQuantity(1)).toHaveValue(3)

    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText(/huevos: 3/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText(/harina: 10/i)).not.toBeInTheDocument()
  })

  it('displays existing agents with their name and initial inventory', () => {
    stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })

    render(<DesignMode stores={stores} />)

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText('Panadero')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 10/i)).toBeInTheDocument()
  })

  it('shows validation errors when creating an agent with empty name or invalid quantity', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '0')

    await user.click(createAgentButton())

    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument()
    expect(screen.getByText(/la cantidad de harina debe ser mayor que cero/i)).toBeInTheDocument()

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.queryByText('Panadero')).not.toBeInTheDocument()
  })

  it('creates an agent-specific recipe and shows it under that agent', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRecipesButton(agentCatalog))

    await user.type(agentRecipeNameInput(), 'Pan artesanal')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    expect(agentCatalog.getByText('Pan artesanal')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 2/i)).toBeInTheDocument()
    expect(agentCatalog.getByText(/pan: 1/i)).toBeInTheDocument()

    expect(withinRecipeCatalog().queryByText('Pan artesanal')).not.toBeInTheDocument()
  })

  it('edits an agent-specific recipe and reflects the change under the agent', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRecipesButton(agentCatalog))

    await user.type(agentRecipeNameInput(), 'Pan artesanal')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    await user.click(editButton(agentCatalog))
    await user.clear(agentRecipeNameInput())
    await user.type(agentRecipeNameInput(), 'Pan integral')
    await user.clear(agentRecipeInputQuantity(1))
    await user.type(agentRecipeInputQuantity(1), '3')
    await user.click(saveAgentRecipeButton())

    expect(agentCatalog.getByText('Pan integral')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 3/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText('Pan artesanal')).not.toBeInTheDocument()
    expect(agentCatalog.queryByText(/harina: 2/i)).not.toBeInTheDocument()
  })

  it('deletes an agent-specific recipe and it disappears from the agent', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRecipesButton(agentCatalog))

    await user.type(agentRecipeNameInput(), 'Pan artesanal')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    await user.click(deleteButton(agentCatalog))

    expect(agentCatalog.queryByText('Pan artesanal')).not.toBeInTheDocument()
    expect(agentCatalog.queryByText(/harina: 2/i)).not.toBeInTheDocument()
    expect(agentCatalog.queryByText(/pan: 1/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when saving an invalid agent-specific recipe and does not save', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRecipesButton(agentCatalog))

    await user.type(agentRecipeNameInput(), 'Pan invalido')
    await user.click(saveAgentRecipeButton())

    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText('Pan invalido')).not.toBeInTheDocument()

    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '0')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '-1')
    await user.click(saveAgentRecipeButton())

    expect(screen.getByText(/la cantidad de harina debe ser mayor que cero/i)).toBeInTheDocument()
    expect(screen.getByText(/la cantidad de pan debe ser mayor que cero/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText('Pan invalido')).not.toBeInTheDocument()
  })

  it('does not show agent-specific recipes in the general recipe catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRecipesButton(agentCatalog))

    await user.type(agentRecipeNameInput(), 'Pan artesanal')
    await user.click(addAgentRecipeInputButton())
    await user.type(agentRecipeInputGoodName(1), 'Harina')
    await user.type(agentRecipeInputQuantity(1), '2')
    await user.click(addAgentRecipeOutputButton())
    await user.type(agentRecipeOutputGoodName(1), 'Pan')
    await user.type(agentRecipeOutputQuantity(1), '1')
    await user.click(saveAgentRecipeButton())

    expect(agentCatalog.getByText('Pan artesanal')).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText('Pan artesanal')).not.toBeInTheDocument()
  })

  it('creates an automatic rule for an agent and shows it in the ordered rule list', async () => {
    const recipe = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const goodResult = stores.goodStore.findIdByName('Harina')
    expect(goodResult.ok).toBe(true)
    if (!goodResult.ok) return

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))

    await user.selectOptions(ruleRecipeSelect(), `catalog:${recipe.recipe.id}`)
    await user.selectOptions(ruleConditionGoodSelect(), goodResult.id)
    await user.type(ruleConditionQuantityInput(), '2')
    await user.selectOptions(ruleConditionOperatorSelect(), 'AT_LEAST')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    expect(agentCatalog.getByText(/Pan — al menos 2 Harina/i)).toBeInTheDocument()
    expect(agentCatalog.getByText(/prioridad: 1/i)).toBeInTheDocument()
  })

  it('shows validation errors when saving a rule without recipe or condition', async () => {
    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))
    await user.click(saveRuleButton())

    expect(screen.getByText(/se requiere una receta/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere un bien para la condición/i)).toBeInTheDocument()
    expect(
      screen.getByText(/la cantidad de la condición debe ser mayor que cero/i),
    ).toBeInTheDocument()
    expect(agentCatalog.queryByText(/prioridad:/i)).not.toBeInTheDocument()
  })

  it('edits an automatic rule and reflects the change in the ordered list', async () => {
    const recipe = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const goodResult = stores.goodStore.findIdByName('Harina')
    expect(goodResult.ok).toBe(true)
    if (!goodResult.ok) return

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))

    await user.selectOptions(ruleRecipeSelect(), `catalog:${recipe.recipe.id}`)
    await user.selectOptions(ruleConditionGoodSelect(), goodResult.id)
    await user.type(ruleConditionQuantityInput(), '2')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    await user.click(editButton(agentCatalog))
    await user.clear(ruleConditionQuantityInput())
    await user.type(ruleConditionQuantityInput(), '3')
    await user.clear(rulePriorityInput())
    await user.type(rulePriorityInput(), '2')
    await user.click(saveRuleButton())

    expect(agentCatalog.getByText(/Pan — al menos 3 Harina/i)).toBeInTheDocument()
    expect(agentCatalog.getByText(/prioridad: 2/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText(/Pan — al menos 2 Harina/i)).not.toBeInTheDocument()
    expect(agentCatalog.queryByText(/prioridad: 1/i)).not.toBeInTheDocument()
  })

  it('deletes an automatic rule and removes it from the agent', async () => {
    const recipe = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const goodResult = stores.goodStore.findIdByName('Harina')
    expect(goodResult.ok).toBe(true)
    if (!goodResult.ok) return

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))

    await user.selectOptions(ruleRecipeSelect(), `catalog:${recipe.recipe.id}`)
    await user.selectOptions(ruleConditionGoodSelect(), goodResult.id)
    await user.type(ruleConditionQuantityInput(), '2')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    await user.click(deleteButton(agentCatalog))

    expect(agentCatalog.queryByText(/Pan — al menos 2 Harina/i)).not.toBeInTheDocument()
    expect(agentCatalog.queryByText(/prioridad: 1/i)).not.toBeInTheDocument()
  })

  it('orders automatic rules by priority', async () => {
    const pan = stores.recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(pan.ok).toBe(true)
    if (!pan.ok) return

    const tortilla = stores.recipeStore.create({
      name: 'Tortilla',
      inputs: [{ goodName: 'Huevos', quantity: 3 }],
      outputs: [{ goodName: 'Tortilla', quantity: 1 }],
    })
    expect(tortilla.ok).toBe(true)
    if (!tortilla.ok) return

    const harinaResult = stores.goodStore.findIdByName('Harina')
    const huevosResult = stores.goodStore.findIdByName('Huevos')
    expect(harinaResult.ok).toBe(true)
    expect(huevosResult.ok).toBe(true)
    if (!harinaResult.ok || !huevosResult.ok) return

    const user = userEvent.setup()
    render(<DesignMode stores={stores} />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))

    await user.selectOptions(ruleRecipeSelect(), `catalog:${pan.recipe.id}`)
    await user.selectOptions(ruleConditionGoodSelect(), harinaResult.id)
    await user.type(ruleConditionQuantityInput(), '2')
    await user.type(rulePriorityInput(), '2')
    await user.click(saveRuleButton())

    await user.selectOptions(ruleRecipeSelect(), `catalog:${tortilla.recipe.id}`)
    await user.selectOptions(ruleConditionGoodSelect(), huevosResult.id)
    await user.clear(ruleConditionQuantityInput())
    await user.type(ruleConditionQuantityInput(), '3')
    await user.clear(rulePriorityInput())
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    const rulesList = agentCatalog.getByRole('list', { name: /reglas del agente/i })
    const ruleItems = within(rulesList).getAllByRole('listitem')
    const ruleTexts = ruleItems.map((item) => item.textContent)
    const panIndex = ruleTexts.findIndex((text) => text?.includes('Pan —'))
    const tortillaIndex = ruleTexts.findIndex((text) => text?.includes('Tortilla —'))
    expect(tortillaIndex).toBeLessThan(panIndex)
  })
})
