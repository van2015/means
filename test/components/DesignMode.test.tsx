import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DesignMode } from '@/components/DesignMode'
import { recipeStore } from '@/domain/recipeStore'

describe('DesignMode', () => {
  beforeEach(() => {
    recipeStore.reset()
  })

  it('renders a recipe form with inputs, outputs and save', () => {
    render(<DesignMode />)

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByText(/entradas/i)).toBeInTheDocument()
    expect(screen.getByText(/salidas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar receta/i })).toBeInTheDocument()
  })

  it('saves a valid recipe and shows it in the catalog', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.type(screen.getByLabelText(/nombre/i), 'Pan')

    await user.click(screen.getByRole('button', { name: /agregar entrada/i }))
    await user.type(screen.getByLabelText(/nombre del insumo 1/i), 'Harina')
    await user.type(screen.getByLabelText(/cantidad del insumo 1/i), '2')

    await user.click(screen.getByRole('button', { name: /agregar salida/i }))
    await user.type(screen.getByLabelText(/nombre del producto 1/i), 'Pan')
    await user.type(screen.getByLabelText(/cantidad del producto 1/i), '1')

    await user.click(screen.getByRole('button', { name: /guardar receta/i }))

    expect(screen.getByRole('heading', { name: /catálogo de recetas/i })).toBeInTheDocument()
    expect(screen.getByText('Pan')).toBeInTheDocument()
    expect(screen.getByText(/harina: 2/i)).toBeInTheDocument()
    expect(screen.getByText(/pan: 1/i)).toBeInTheDocument()
  })

  it('loads a recipe into the form when clicking edit', async () => {
    recipeStore.createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Pan')
    expect(screen.getByLabelText(/nombre del insumo 1/i)).toHaveValue('Harina')
    expect(screen.getByLabelText(/cantidad del insumo 1/i)).toHaveValue('2')
    expect(screen.getByLabelText(/nombre del producto 1/i)).toHaveValue('Pan')
    expect(screen.getByLabelText(/cantidad del producto 1/i)).toHaveValue('1')
  })

  it('saves edited recipe and shows updated data in the catalog', async () => {
    recipeStore.createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    await userEvent.clear(screen.getByLabelText(/^nombre$/i))
    await userEvent.type(screen.getByLabelText(/^nombre$/i), 'Pan integral')

    await userEvent.click(screen.getByRole('button', { name: /guardar receta/i }))

    expect(screen.getByText('Pan integral')).toBeInTheDocument()
    expect(screen.queryByText('Pan')).not.toBeInTheDocument()
  })

  it('deletes a recipe and it disappears from the catalog', async () => {
    recipeStore.createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(screen.getByRole('button', { name: /eliminar/i }))

    expect(screen.queryByText('Pan')).not.toBeInTheDocument()
    expect(screen.queryByText(/harina: 2/i)).not.toBeInTheDocument()
  })

  it('shows validation errors when editing an invalid recipe and does not update the catalog', async () => {
    recipeStore.createRecipe({
      name: 'Pan',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })

    render(<DesignMode />)

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    await userEvent.clear(screen.getByLabelText(/^nombre$/i))
    await userEvent.type(screen.getByLabelText(/^nombre$/i), 'Pan invalido')

    await userEvent.clear(screen.getByLabelText(/cantidad del insumo 1/i))
    await userEvent.type(screen.getByLabelText(/cantidad del insumo 1/i), '0')

    await userEvent.click(screen.getByRole('button', { name: /guardar receta/i }))

    expect(screen.getByText(/la cantidad de harina debe ser mayor que cero/i)).toBeInTheDocument()
    expect(screen.getByText('Pan')).toBeInTheDocument()
    expect(screen.queryByText('Pan invalido')).not.toBeInTheDocument()
  })

  it('shows validation errors on invalid submit', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.click(screen.getByRole('button', { name: /guardar receta/i }))

    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
  })
})
