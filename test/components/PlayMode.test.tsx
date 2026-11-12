import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { PlayMode } from '@/react/PlayMode'

describe('PlayMode', () => {
  let stores: Stores

  beforeEach(() => {
    stores = createStores()
  })

  it('shows an empty state when there are no agents', () => {
    render(<PlayMode stores={stores} />)

    expect(screen.getByText(/no hay agentes disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /poseer/i })).not.toBeInTheDocument()
  })

  it('lists the available agents', () => {
    stores.agentStore.create({ name: 'Panadero', inventory: [] })
    stores.agentStore.create({ name: 'Obrero', inventory: [] })

    render(<PlayMode stores={stores} />)

    const list = screen.getByRole('list', { name: /agentes disponibles/i })
    expect(within(list).getByText('Panadero')).toBeInTheDocument()
    expect(within(list).getByText('Obrero')).toBeInTheDocument()
    expect(within(list).getAllByRole('button', { name: /poseer/i })).toHaveLength(2)
    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()
  })

  it('possesses an agent when clicking its button', async () => {
    const user = userEvent.setup()
    stores.agentStore.create({ name: 'Panadero', inventory: [] })
    stores.agentStore.create({ name: 'Obrero', inventory: [] })

    render(<PlayMode stores={stores} />)

    const list = screen.getByRole('list', { name: /agentes disponibles/i })
    await user.click(within(list).getAllByRole('button', { name: /poseer/i })[0])

    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
    expect(screen.queryByText(/no posees a ningún agente/i)).not.toBeInTheDocument()

    const items = within(list).getAllByRole('listitem')
    expect(within(items[0]).getByText(/poseído/i)).toBeInTheDocument()
    expect(within(items[0]).queryByRole('button')).not.toBeInTheDocument()
  })

  it('switches possession when clicking another agent', async () => {
    const user = userEvent.setup()
    stores.agentStore.create({ name: 'Panadero', inventory: [] })
    stores.agentStore.create({ name: 'Obrero', inventory: [] })

    render(<PlayMode stores={stores} />)

    const list = screen.getByRole('list', { name: /agentes disponibles/i })
    await user.click(within(list).getAllByRole('button', { name: /^poseer$/i })[0])
    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()

    // the remaining agent keeps its button enabled and switches the possession
    const after = within(list).getAllByRole('button', { name: /^poseer$/i })
    expect(after).toHaveLength(1)
    expect(after[0]).toBeEnabled()
    await user.click(after[0])

    expect(screen.getByText(/poseído: obrero/i)).toBeInTheDocument()
    expect(screen.queryByText(/poseído: panadero/i)).not.toBeInTheDocument()
    expect(stores.possessionStore.possessed()?.name).toBe('Obrero')
  })

  it('releases the possessed agent with the "Dejar de poseer" button', async () => {
    const user = userEvent.setup()
    stores.agentStore.create({ name: 'Panadero', inventory: [] })

    render(<PlayMode stores={stores} />)

    // no possession yet: the release button is not shown
    expect(screen.queryByRole('button', { name: /dejar de poseer/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^poseer$/i }))
    expect(screen.getByRole('button', { name: /dejar de poseer/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dejar de poseer/i }))

    expect(screen.getByText(/no posees a ningún agente/i)).toBeInTheDocument()
    expect(screen.queryByText(/poseído: panadero/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dejar de poseer/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^poseer$/i })).toBeInTheDocument()
    expect(stores.possessionStore.possessedAgentId()).toBeNull()
  })

  it('can possess the only agent again after releasing it', async () => {
    const user = userEvent.setup()
    stores.agentStore.create({ name: 'Panadero', inventory: [] })

    render(<PlayMode stores={stores} />)

    await user.click(screen.getByRole('button', { name: /^poseer$/i }))
    await user.click(screen.getByRole('button', { name: /dejar de poseer/i }))
    await user.click(screen.getByRole('button', { name: /^poseer$/i }))

    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
    expect(stores.possessionStore.possessed()?.name).toBe('Panadero')
  })

  it('keeps the possession in the shared stores across remounts', async () => {
    const user = userEvent.setup()
    stores.agentStore.create({ name: 'Panadero', inventory: [] })

    const first = render(<PlayMode stores={stores} />)

    await user.click(screen.getByRole('button', { name: /poseer/i }))
    expect(stores.possessionStore.possessedAgentId()).not.toBeNull()

    // simulates leaving play mode and coming back: a fresh mount reads the same stores
    first.unmount()
    render(<PlayMode stores={stores} />)

    expect(screen.getByText(/poseído: panadero/i)).toBeInTheDocument()
  })

  describe('possessed agent details (inventory and recipes)', () => {
    it('hides the inventory and recipes sections when no agent is possessed', () => {
      stores.goodStore.create('Harina')
      stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })

      render(<PlayMode stores={stores} />)

      expect(screen.queryByRole('heading', { name: /inventario de/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /recetas de/i })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /inventario del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it('shows the inventory with resolved good names when possessing an agent', async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      stores.goodStore.create('Huevos')
      stores.agentStore.create({
        name: 'Panadero',
        inventory: [
          { goodName: 'Harina', quantity: 10 },
          { goodName: 'Huevos', quantity: 3 },
        ],
      })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
      expect(within(inventory).getByText('Harina: 10')).toBeInTheDocument()
      expect(within(inventory).getByText('Huevos: 3')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /inventario de panadero/i })).toBeInTheDocument()
    })

    it('shows an empty inventory message when the possessed agent has no items', async () => {
      const user = userEvent.setup()
      stores.agentStore.create({ name: 'Panadero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      expect(screen.getByText(/el inventario está vacío/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /inventario del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it("shows the possessed agent's recipes with their input and output lines", async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const agent = stores.agentStore.create({ name: 'Panadero', inventory: [] })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      stores.agentStore.addRecipe(agent.agent.id, {
        name: 'Horneado',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      const recipes = screen.getByRole('list', { name: /recetas del agente poseído/i })
      expect(within(recipes).getByText('Horneado')).toBeInTheDocument()
      expect(within(recipes).getByText(/insumo: harina: 2/i)).toBeInTheDocument()
      expect(within(recipes).getByText(/producto: pan: 1/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /recetas de panadero/i })).toBeInTheDocument()

      // read-only: no edit/delete buttons in play mode
      expect(within(recipes).queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
      expect(within(recipes).queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
    })

    it('shows a message when the possessed agent has no recipes', async () => {
      const user = userEvent.setup()
      stores.agentStore.create({ name: 'Panadero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      expect(screen.getByText(/este agente no tiene recetas propias/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /recetas del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it('updates the details when switching the possessed agent', async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      stores.agentStore.create({ name: 'Obrero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getAllByRole('button', { name: /^poseer$/i })[0])
      expect(screen.getByRole('heading', { name: /inventario de panadero/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      expect(screen.getByRole('heading', { name: /inventario de obrero/i })).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /inventario de panadero/i }),
      ).not.toBeInTheDocument()
      expect(screen.getByText(/el inventario está vacío/i)).toBeInTheDocument()
    })

    it('reads the same stores after a remount, reflecting design-mode changes', async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      const agent = stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return

      const first = render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))
      expect(screen.getByText('Harina: 10')).toBeInTheDocument()

      // simulate a design-mode edit on the shared store
      const lines = agent.agent.inventory
      lines[0] = { ...lines[0], quantity: 25 }

      // switching modes unmounts and remounts play mode
      first.unmount()
      render(<PlayMode stores={stores} />)

      expect(screen.getByText('Harina: 25')).toBeInTheDocument()
    })
  })
})
