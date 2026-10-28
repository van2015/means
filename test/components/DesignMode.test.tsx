import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DesignMode } from '@/react/DesignMode'
import { agentStore } from '@/domain/agentStore'
import { goodStore } from '@/domain/goodStore'
import { recipeStore } from '@/domain/recipeStore'
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
  recipeOutputGoodName,
  recipeOutputQuantity,
  registerGoodButton,
  ruleConditionGoodInput,
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
  beforeEach(() => {
    goodStore.reset()
    recipeStore.reset()
    agentStore.reset()
  })

  it('renders a recipe form with inputs, outputs and save', () => {
    render(<DesignMode />)

    expect(recipeNameInput()).toBeInTheDocument()
    expect(screen.getByText(/entradas/i)).toBeInTheDocument()
    expect(screen.getByText(/salidas/i)).toBeInTheDocument()
    expect(saveRecipeButton()).toBeInTheDocument()
  })

  it('saves a valid recipe and shows it in the catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

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

  it('loads a recipe into the form when clicking edit', async () => {
    recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(editButton())

    expect(recipeNameInput()).toHaveValue('Pan')
    expect(recipeInputGoodName(1)).toHaveValue('Harina')
    expect(recipeInputQuantity(1)).toHaveValue('2')
    expect(recipeOutputGoodName(1)).toHaveValue('Pan')
    expect(recipeOutputQuantity(1)).toHaveValue('1')
  })

  it('saves edited recipe and shows updated data in the catalog', async () => {
    recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(editButton())

    await userEvent.clear(recipeNameInput())
    await userEvent.type(recipeNameInput(), 'Pan integral')

    await userEvent.click(saveRecipeButton())

    expect(withinRecipeCatalog().getByText('Pan integral')).toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText('Pan')).not.toBeInTheDocument()
  })

  it('deletes a recipe and it disappears from the catalog', async () => {
    recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(deleteButton())

    expect(withinRecipeCatalog().queryByText('Pan')).not.toBeInTheDocument()
    expect(withinRecipeCatalog().queryByText(/harina: 2/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when editing an invalid recipe and does not update the catalog', async () => {
    recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

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
    render(<DesignMode />)

    await user.type(goodNameInput(), 'Harina')
    await user.click(registerGoodButton())

    expect(screen.getByRole('heading', { name: /bienes y servicios/i })).toBeInTheDocument()
    expect(screen.getByText('Harina')).toBeInTheDocument()
  })

  it('shows an error when registering a good with an empty name', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.click(registerGoodButton())

    expect(screen.getByText(/el nombre no puede estar vacío/i)).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: /harina/i })).not.toBeInTheDocument()
  })

  it('lets the user pick an existing good when adding a recipe line', async () => {
    const user = userEvent.setup()
    goodStore.create('Harina')

    render(<DesignMode />)

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

    const harinaGoods = goodStore.all().filter((good) => good.name === 'Harina')
    expect(harinaGoods).toHaveLength(1)
  })

  it('shows validation errors on invalid submit', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.click(saveRecipeButton())

    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
  })

  it('creates an agent with name and initial inventory and shows it in the catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.type(agentNameInput(), 'Panadero')

    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')

    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText('Panadero')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 10/i)).toBeInTheDocument()
  })

  it('displays existing agents with their name and initial inventory', () => {
    agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })

    render(<DesignMode />)

    const agentCatalog = withinAgentCatalog()
    expect(agentCatalog.getByText('Panadero')).toBeInTheDocument()
    expect(agentCatalog.getByText(/harina: 10/i)).toBeInTheDocument()
  })

  it('shows validation errors when creating an agent with empty name or invalid quantity', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

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
    render(<DesignMode />)

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
    render(<DesignMode />)

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
    render(<DesignMode />)

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
    render(<DesignMode />)

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
    render(<DesignMode />)

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
    const recipe = recipeStore.create({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    expect(recipe.ok).toBe(true)
    if (!recipe.ok) return

    const user = userEvent.setup()
    render(<DesignMode />)

    await user.type(agentNameInput(), 'Panadero')
    await user.click(addAgentInventoryLineButton())
    await user.type(agentInventoryGoodName(1), 'Harina')
    await user.type(agentInventoryQuantity(1), '10')
    await user.click(createAgentButton())

    const agentCatalog = withinAgentCatalog()
    await user.click(manageAgentRulesButton(agentCatalog))

    await user.selectOptions(ruleRecipeSelect(), `catalog:${recipe.recipe.id}`)
    await user.type(ruleConditionGoodInput(), 'Harina')
    await user.type(ruleConditionQuantityInput(), '2')
    await user.selectOptions(ruleConditionOperatorSelect(), 'AT_LEAST')
    await user.type(rulePriorityInput(), '1')
    await user.click(saveRuleButton())

    expect(agentCatalog.getByText(/Pan — al menos 2 Harina/i)).toBeInTheDocument()
    expect(agentCatalog.getByText(/prioridad: 1/i)).toBeInTheDocument()
  })

  it('shows validation errors when saving a rule without recipe or condition', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

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
    expect(screen.getByText(/la cantidad de la condición debe ser mayor que cero/i)).toBeInTheDocument()
    expect(agentCatalog.queryByText(/prioridad:/i)).not.toBeInTheDocument()
  })
})
