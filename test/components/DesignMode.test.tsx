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

  it('shows validation errors on invalid submit', async () => {
    const user = userEvent.setup()
    render(<DesignMode />)

    await user.click(screen.getByRole('button', { name: /guardar receta/i }))

    expect(screen.getByText(/se requiere al menos una entrada/i)).toBeInTheDocument()
    expect(screen.getByText(/se requiere al menos una salida/i)).toBeInTheDocument()
  })
})
