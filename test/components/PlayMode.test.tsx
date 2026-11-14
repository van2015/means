import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { PLAY_TICK_MS } from '@/presentation/usePlayMode'
import { PlayMode } from '@/react/PlayMode'
import { openPlayTab } from '../helpers/playModeQueries'

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

      openPlayTab('Recetas')
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

      openPlayTab('Recetas')
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

  describe('possessed agent rules (priority editing)', () => {
    function createAgentWithRules(): { ruleLabels: RegExp[] } {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 1 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return { ruleLabels: [] }
      const good = stores.goodStore.findIdByName('Harina')
      expect(good.ok).toBe(true)
      if (!good.ok) return { ruleLabels: [] }

      const agent = stores.agentStore.create({ name: 'Panadero', inventory: [] })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return { ruleLabels: [] }

      const first = stores.agentStore.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: good.id, quantity: 2, operator: 'AT_LEAST' },
        1,
      )
      const second = stores.agentStore.addRule(
        agent.agent.id,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: good.id, quantity: 5, operator: 'LESS_THAN' },
        2,
      )
      expect(first.ok && second.ok).toBe(true)

      return {
        ruleLabels: [/al menos 2 harina/i, /menos de 5 harina/i],
      }
    }

    it('hides the rules section when no agent is possessed', () => {
      createAgentWithRules()

      render(<PlayMode stores={stores} />)

      expect(screen.queryByRole('heading', { name: /reglas de/i })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /reglas del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it('shows the rules ordered by priority when possessing an agent', async () => {
      const user = userEvent.setup()
      const { ruleLabels } = createAgentWithRules()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Reglas')
      expect(screen.getByRole('heading', { name: /reglas de panadero/i })).toBeInTheDocument()
      const rules = screen.getByRole('list', { name: /reglas del agente poseído/i })
      const items = within(rules).getAllByRole('listitem')
      expect(items).toHaveLength(2)
      expect(items[0].textContent).toMatch(ruleLabels[0])
      expect(items[1].textContent).toMatch(ruleLabels[1])
      expect(items[0].textContent).toContain('prioridad: 1')
      expect(items[1].textContent).toContain('prioridad: 2')
    })

    it('shows a message when the possessed agent has no rules', async () => {
      const user = userEvent.setup()
      stores.agentStore.create({ name: 'Panadero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Reglas')
      expect(screen.getByText(/este agente no tiene reglas automáticas/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /reglas del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it('reorders the rules after saving a new priority', async () => {
      const user = userEvent.setup()
      createAgentWithRules()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Reglas')
      // second rule (priority 2) becomes priority 0
      const inputs = screen.getAllByLabelText(/prioridad de la regla/i)
      expect(inputs).toHaveLength(2)
      await user.clear(inputs[1])
      await user.type(inputs[1], '0')
      await user.click(screen.getAllByRole('button', { name: /guardar prioridad/i })[1])

      const rules = screen.getByRole('list', { name: /reglas del agente poseído/i })
      const items = within(rules).getAllByRole('listitem')
      expect(items[0].textContent).toMatch(/menos de 5 harina/i)
      expect(items[0].textContent).toContain('prioridad: 0')
      expect(items[1].textContent).toMatch(/al menos 2 harina/i)
      expect(items[1].textContent).toContain('prioridad: 1')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('rejects an invalid priority with an alert and keeps the order', async () => {
      const user = userEvent.setup()
      createAgentWithRules()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Reglas')
      const inputs = screen.getAllByLabelText(/prioridad de la regla/i)
      await user.clear(inputs[0])
      await user.click(screen.getAllByRole('button', { name: /guardar prioridad/i })[0])

      expect(screen.getByRole('alert')).toHaveTextContent(/prioridad debe ser un número válido/i)

      const rules = screen.getByRole('list', { name: /reglas del agente poseído/i })
      const items = within(rules).getAllByRole('listitem')
      expect(items[0].textContent).toContain('prioridad: 1')
      expect(items[1].textContent).toContain('prioridad: 2')

      // the store was not modified
      const agent = stores.agentStore.findByName('Panadero')
      expect(agent.ok).toBe(true)
      if (agent.ok) expect(agent.agent.rules.map((rule) => rule.priority)).toEqual([1, 2])
    })

    it('shows the rules of the newly possessed agent', async () => {
      const user = userEvent.setup()
      createAgentWithRules()
      stores.agentStore.create({ name: 'Obrero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getAllByRole('button', { name: /^poseer$/i })[0])
      openPlayTab('Reglas')
      expect(screen.getByRole('list', { name: /reglas del agente poseído/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      expect(screen.getByText(/este agente no tiene reglas automáticas/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /reglas del agente poseído/i }),
      ).not.toBeInTheDocument()
    })

    it('shows the placeholder when the rule recipe was deleted (debt fix)', async () => {
      const user = userEvent.setup()
      createAgentWithRules()

      // delete the catalog recipe the rule points to
      const recipe = stores.recipeStore.findByName('Pan de harina')
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return
      stores.recipeStore.delete(recipe.recipe.id)

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Reglas')
      const rules = screen.getByRole('list', { name: /reglas del agente poseído/i })
      // both rules point at the same deleted recipe
      const placeholders = within(rules).getAllByText(/\(receta borrada\)/i)
      expect(placeholders).toHaveLength(2)
      expect(within(rules).queryByText(/^ —/i)).not.toBeInTheDocument()
    })
  })

  describe('production', () => {
    function setupProductionWorld() {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const agent = stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(agent.ok).toBe(true)
      if (!agent.ok) return
      stores.agentStore.addRecipe(agent.agent.id, {
        name: 'Horneado propio',
        inputs: [{ goodName: 'Harina', quantity: 4 }],
        outputs: [{ goodName: 'Pan', quantity: 2 }],
      })
    }

    it('hides the production section when no agent is possessed', () => {
      setupProductionWorld()

      render(<PlayMode stores={stores} />)

      expect(screen.queryByRole('heading', { name: /producir/i })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: /recetas del catálogo para producir/i }),
      ).not.toBeInTheDocument()
    })

    it('lists catalog and agent recipes with produce buttons', async () => {
      const user = userEvent.setup()
      setupProductionWorld()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Producir')
      expect(screen.getByRole('heading', { name: /^producir$/i })).toBeInTheDocument()
      const catalogList = screen.getByRole('list', { name: /recetas del catálogo para producir/i })
      expect(within(catalogList).getByText('Pan de harina')).toBeInTheDocument()
      expect(within(catalogList).getByRole('button', { name: /^producir$/i })).toBeInTheDocument()

      const agentList = screen.getByRole('list', { name: /recetas del agente para producir/i })
      expect(within(agentList).getByText('Horneado propio')).toBeInTheDocument()
      expect(within(agentList).getByRole('button', { name: /^producir$/i })).toBeInTheDocument()
    })

    it('produces with a catalog recipe and updates the inventory on screen', async () => {
      const user = userEvent.setup()
      setupProductionWorld()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Producir')
      const catalogList = screen.getByRole('list', { name: /recetas del catálogo para producir/i })
      await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))

      openPlayTab('Inventario')
      const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
      expect(within(inventory).getByText('Harina: 8')).toBeInTheDocument()
      expect(within(inventory).getByText('Pan: 1')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('produces with an agent-specific recipe', async () => {
      const user = userEvent.setup()
      setupProductionWorld()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Producir')
      const agentList = screen.getByRole('list', { name: /recetas del agente para producir/i })
      await user.click(within(agentList).getByRole('button', { name: /^producir$/i }))

      openPlayTab('Inventario')
      const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
      expect(within(inventory).getByText('Harina: 6')).toBeInTheDocument()
      expect(within(inventory).getByText('Pan: 2')).toBeInTheDocument()
    })

    it('shows an error when material is missing and keeps the inventory', async () => {
      const user = userEvent.setup()
      setupProductionWorld()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      // 10 flour: two agent-recipe productions (4 each) leave 2, the third needs 4
      openPlayTab('Producir')
      const agentList = screen.getByRole('list', { name: /recetas del agente para producir/i })
      const produceAgentRecipe = () =>
        within(agentList).getByRole('button', { name: /^producir$/i })
      await user.click(produceAgentRecipe())
      await user.click(produceAgentRecipe())
      // flour is 2 now; the agent recipe needs 4
      await user.click(produceAgentRecipe())

      expect(screen.getByRole('alert')).toHaveTextContent(/falta harina: necesitas 4, tienes 2/i)
      openPlayTab('Inventario')
      const inventory = screen.getByRole('list', { name: /inventario del agente poseído/i })
      expect(within(inventory).getByText('Harina: 2')).toBeInTheDocument()
      expect(within(inventory).getByText('Pan: 4')).toBeInTheDocument()
    })

    it('shows empty states for missing recipes', async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))

      openPlayTab('Producir')
      expect(screen.getByText(/no hay recetas en el catálogo/i)).toBeInTheDocument()
      expect(screen.getByText(/no hay recetas propias para producir/i)).toBeInTheDocument()
    })
  })

  describe('game loop (automatic rules in the background)', () => {
    let flourId: string
    let panId: string
    let bakerId: string

    beforeEach(() => {
      vi.useFakeTimers()

      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const flour = stores.goodStore.findIdByName('Harina')
      const pan = stores.goodStore.findIdByName('Pan')
      expect(flour.ok && pan.ok).toBe(true)
      if (!flour.ok || !pan.ok) return
      flourId = flour.id
      panId = pan.id

      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      bakerId = baker.agent.id

      stores.agentStore.addRule(
        bakerId,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: flourId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('produces for non-possessed agents after each tick', () => {
      render(<PlayMode stores={stores} />)

      act(() => {
        vi.advanceTimersByTime(PLAY_TICK_MS)
      })

      const baker = stores.agentStore.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      expect(baker.agent.quantityOf(flourId)).toBe(8)
      expect(baker.agent.quantityOf(panId)).toBe(1)

      act(() => {
        vi.advanceTimersByTime(PLAY_TICK_MS)
      })

      const after = stores.agentStore.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      expect(after.agent.quantityOf(flourId)).toBe(6)
      expect(after.agent.quantityOf(panId)).toBe(2)
    })

    it('does not run rules for the possessed agent', () => {
      const possessed = stores.possessionStore.possess(bakerId)
      expect(possessed.ok).toBe(true)

      render(<PlayMode stores={stores} />)

      act(() => {
        vi.advanceTimersByTime(PLAY_TICK_MS * 3)
      })

      const baker = stores.agentStore.findById(bakerId)
      expect(baker.ok).toBe(true)
      if (!baker.ok) return
      expect(baker.agent.quantityOf(flourId)).toBe(10)
      expect(baker.agent.quantityOf(panId)).toBe(0)
    })

    it('stops the loop when play mode unmounts', () => {
      const { unmount } = render(<PlayMode stores={stores} />)

      act(() => {
        vi.advanceTimersByTime(PLAY_TICK_MS)
      })

      const before = stores.agentStore.findById(bakerId)
      expect(before.ok).toBe(true)
      if (!before.ok) return
      expect(before.agent.quantityOf(flourId)).toBe(8)

      unmount()
      act(() => {
        vi.advanceTimersByTime(PLAY_TICK_MS * 3)
      })

      const after = stores.agentStore.findById(bakerId)
      expect(after.ok).toBe(true)
      if (!after.ok) return
      // no further production after unmount
      expect(after.agent.quantityOf(flourId)).toBe(8)
      expect(after.agent.quantityOf(panId)).toBe(1)
    })
  })

  describe('activation strategy', () => {
    let flourId: string
    let panId: string
    let bakerId: string
    let playerId: string

    /** A background baker limited to 2 rounds and a player with flour. */
    function setupEconomy() {
      stores.goodStore.create('Harina')
      stores.goodStore.create('Pan')
      const flour = stores.goodStore.findIdByName('Harina')
      const pan = stores.goodStore.findIdByName('Pan')
      expect(flour.ok && pan.ok).toBe(true)
      if (!flour.ok || !pan.ok) return
      flourId = flour.id
      panId = pan.id

      const recipe = stores.recipeStore.create({
        name: 'Pan de harina',
        inputs: [{ goodName: 'Harina', quantity: 2 }],
        outputs: [{ goodName: 'Pan', quantity: 1 }],
      })
      expect(recipe.ok).toBe(true)
      if (!recipe.ok) return

      const baker = stores.agentStore.create({
        name: 'Panadero',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
        recipesPerAction: 2,
      })
      const player = stores.agentStore.create({
        name: 'Jugador',
        inventory: [{ goodName: 'Harina', quantity: 10 }],
      })
      expect(baker.ok && player.ok).toBe(true)
      if (!baker.ok || !player.ok) return
      bakerId = baker.agent.id
      playerId = player.agent.id

      const rule = stores.agentStore.addRule(
        bakerId,
        { source: 'catalog', recipeId: recipe.recipe.id },
        { goodId: flourId, quantity: 5, operator: 'AT_LEAST' },
        1,
      )
      expect(rule.ok).toBe(true)
    }

    function flourOf(agentId: string) {
      const agent = stores.agentStore.findById(agentId)
      expect(agent.ok).toBe(true)
      if (!agent.ok) return -1
      return agent.agent.quantityOf(flourId)
    }

    function panOf(agentId: string) {
      const agent = stores.agentStore.findById(agentId)
      expect(agent.ok).toBe(true)
      if (!agent.ok) return -1
      return agent.agent.quantityOf(panId)
    }

    function agentButtons() {
      const list = screen.getByRole('list', { name: /agentes disponibles/i })
      return within(list).getAllByRole('button', { name: /^poseer$/i })
    }

    it('starts with the temporal strategy selected', () => {
      setupEconomy()

      render(<PlayMode stores={stores} />)

      expect(screen.getByRole('group', { name: /estrategia de activación/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Temporal')).toBeChecked()
      expect(screen.getByLabelText('Por acciones')).not.toBeChecked()
      expect(screen.queryByRole('button', { name: /^avanzar$/i })).not.toBeInTheDocument()
    })

    it('switches to the action-driven strategy', async () => {
      const user = userEvent.setup()
      setupEconomy()

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByLabelText('Por acciones'))

      expect(screen.getByLabelText('Por acciones')).toBeChecked()
      expect(screen.getByLabelText('Temporal')).not.toBeChecked()
      expect(stores.strategyStore.get()).toBe('POR_ACCIONES')
    })

    it('offers Avanzar only without possession under the action-driven strategy', async () => {
      const user = userEvent.setup()
      setupEconomy()
      stores.strategyStore.set('POR_ACCIONES')

      render(<PlayMode stores={stores} />)
      expect(screen.getByRole('button', { name: /^avanzar$/i })).toBeInTheDocument()

      await user.click(agentButtons()[0])
      expect(screen.queryByRole('button', { name: /^avanzar$/i })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /dejar de poseer/i }))
      expect(screen.getByRole('button', { name: /^avanzar$/i })).toBeInTheDocument()
    })

    it('moves the whole economy forward when clicking Avanzar', async () => {
      const user = userEvent.setup()
      setupEconomy()
      stores.strategyStore.set('POR_ACCIONES')

      render(<PlayMode stores={stores} />)
      await user.click(screen.getByRole('button', { name: /^avanzar$/i }))

      // nobody is possessed: the baker uses its 2 rounds, the player has no rules
      expect(flourOf(bakerId)).toBe(6)
      expect(panOf(bakerId)).toBe(2)
      expect(flourOf(playerId)).toBe(10)
    })

    it('drives the background agents with a manual action', async () => {
      const user = userEvent.setup()
      setupEconomy()
      stores.strategyStore.set('POR_ACCIONES')

      render(<PlayMode stores={stores} />)
      // second agent in the list: the player, so the baker stays in the background
      await user.click(agentButtons()[1])

      openPlayTab('Producir')
      const catalogList = screen.getByRole('list', { name: /recetas del catálogo para producir/i })
      await user.click(within(catalogList).getByRole('button', { name: /^producir$/i }))

      // one manual action for the player, two automatic rounds for the baker
      expect(flourOf(playerId)).toBe(8)
      expect(panOf(playerId)).toBe(1)
      expect(flourOf(bakerId)).toBe(6)
      expect(panOf(bakerId)).toBe(2)
    })

    describe('with the game loop', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      it('keeps the loop stopped until the temporal strategy is selected again', () => {
        setupEconomy()
        stores.strategyStore.set('POR_ACCIONES')

        render(<PlayMode stores={stores} />)
        act(() => {
          vi.advanceTimersByTime(PLAY_TICK_MS * 3)
        })
        expect(flourOf(bakerId)).toBe(10)

        fireEvent.click(screen.getByLabelText('Temporal'))

        act(() => {
          vi.advanceTimersByTime(PLAY_TICK_MS)
        })
        // one tick runs the baker's 2 configured rounds
        expect(flourOf(bakerId)).toBe(6)
        expect(panOf(bakerId)).toBe(2)
      })

      it('stops the loop when the action-driven strategy is selected', () => {
        setupEconomy()

        render(<PlayMode stores={stores} />)
        act(() => {
          vi.advanceTimersByTime(PLAY_TICK_MS)
        })
        expect(flourOf(bakerId)).toBe(6)

        fireEvent.click(screen.getByLabelText('Por acciones'))

        act(() => {
          vi.advanceTimersByTime(PLAY_TICK_MS * 3)
        })
        expect(flourOf(bakerId)).toBe(6)
        expect(panOf(bakerId)).toBe(2)
      })
    })
  })

  describe('possessed agent panel tabs', () => {
    it('shows one tab at a time and keeps it when the possessed agent changes', async () => {
      const user = userEvent.setup()
      stores.goodStore.create('Harina')
      stores.agentStore.create({ name: 'Panadero', inventory: [] })
      stores.agentStore.create({ name: 'Obrero', inventory: [] })

      render(<PlayMode stores={stores} />)
      await user.click(screen.getAllByRole('button', { name: /^poseer$/i })[0])

      const tablist = screen.getByRole('tablist', { name: /secciones del agente poseído/i })
      expect(within(tablist).getAllByRole('tab')).toHaveLength(4)
      expect(within(tablist).getByRole('tab', { name: 'Inventario' })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      // only the inventory block is on screen
      expect(screen.getByRole('heading', { name: /inventario de panadero/i })).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /recetas de panadero/i }),
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /^producir$/i })).not.toBeInTheDocument()

      await user.click(within(tablist).getByRole('tab', { name: 'Reglas' }))

      expect(screen.getByText(/este agente no tiene reglas automáticas/i)).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: /inventario de panadero/i }),
      ).not.toBeInTheDocument()
      expect(within(tablist).getByRole('tab', { name: 'Reglas' })).toHaveAttribute(
        'aria-selected',
        'true',
      )

      // the open tab survives switching the possessed agent
      await user.click(screen.getByRole('button', { name: /^poseer$/i }))
      expect(
        screen.getByRole('tablist', { name: /secciones del agente poseído/i }),
      ).toBeInTheDocument()
      expect(screen.getByText(/este agente no tiene reglas automáticas/i)).toBeInTheDocument()
    })
  })
})
