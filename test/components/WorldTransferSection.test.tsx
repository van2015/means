import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStores, type Stores } from '@/domain/stores'
import { WorldTransferSection } from '@/react/WorldTransferSection'
import { useDesignMode } from '@/presentation/useDesignMode'

// harness: use the real design-mode wiring against real stores
function Harness({ stores }: { stores: Stores }) {
  const presenter = useDesignMode(stores)
  return (
    <WorldTransferSection
      goods={presenter.goods}
      recipes={presenter.recipes}
      agents={presenter.agents}
      selectedGoods={presenter.transferSelectedGoods}
      selectedRecipes={presenter.transferSelectedRecipes}
      selectedAgents={presenter.transferSelectedAgents}
      selectedCount={presenter.transferSelectedCount}
      canExport={presenter.transferCanExport}
      importErrors={presenter.transferImportErrors}
      importSummary={presenter.transferImportSummary}
      onToggleGood={presenter.toggleTransferGood}
      onToggleRecipe={presenter.toggleTransferRecipe}
      onToggleAgent={presenter.toggleTransferAgent}
      exportJson={presenter.exportTransferJson}
      onImport={presenter.importTransferJson}
    />
  )
}

describe('WorldTransferSection', () => {
  let stores: Stores

  beforeEach(() => {
    stores = createStores()
    stores.goodStore.create('Harina')
    stores.goodStore.create('Pan')
    stores.recipeStore.create({
      name: 'Pan de harina',
      inputs: [{ goodName: 'Harina', quantity: 2 }],
      outputs: [{ goodName: 'Pan', quantity: 1 }],
    })
    stores.agentStore.create({
      name: 'Panadero',
      inventory: [{ goodName: 'Harina', quantity: 10 }],
    })

    // jsdom has no URL.createObjectURL: capture the blob the app would download
    vi.stubGlobal(
      'URL',
      Object.assign(Object.create(URL), {
        createObjectURL: vi.fn(() => 'blob:mock'),
        revokeObjectURL: vi.fn(),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('lists goods, recipes and agents as checkboxes', () => {
    render(<Harness stores={stores} />)

    const goodsList = screen.getByRole('list', { name: /bienes exportables/i })
    expect(within(goodsList).getByText('Harina')).toBeInTheDocument()
    expect(within(goodsList).getByText('Pan')).toBeInTheDocument()

    const recipesList = screen.getByRole('list', { name: /recetas exportables/i })
    expect(within(recipesList).getByText('Pan de harina')).toBeInTheDocument()

    const agentsList = screen.getByRole('list', { name: /agentes exportables/i })
    expect(within(agentsList).getByText('Panadero')).toBeInTheDocument()
  })

  it('disables the export button until something is selected', async () => {
    const user = userEvent.setup()
    render(<Harness stores={stores} />)

    const button = screen.getByRole('button', { name: /exportar selección/i })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('(0)')

    const goodsList = screen.getByRole('list', { name: /bienes exportables/i })
    await user.click(within(goodsList).getByRole('checkbox', { name: 'Harina' }))

    expect(button).toBeEnabled()
    expect(button).toHaveTextContent('(1)')
  })

  it('exports the selection as a downloaded JSON file', async () => {
    const user = userEvent.setup()
    // jsdom does not implement downloads: skip the anchor navigation side effect
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    render(<Harness stores={stores} />)

    const recipesList = screen.getByRole('list', { name: /recetas exportables/i })
    await user.click(within(recipesList).getByRole('checkbox', { name: 'Pan de harina' }))
    await user.click(screen.getByRole('button', { name: /exportar selección/i }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.recipes.map((r: { name: string }) => r.name)).toEqual(['Pan de harina'])
    // dependency closure: the recipe's goods came along
    expect(parsed.goods.map((g: { name: string }) => g.name).sort()).toEqual(['Harina', 'Pan'])
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('imports a valid file and shows the summary', async () => {
    const user = userEvent.setup()
    render(<Harness stores={stores} />)

    const file = new File(
      [JSON.stringify({ version: 1, goods: [{ name: 'Madera' }], recipes: [], agents: [] })],
      'mundo.json',
      { type: 'application/json' },
    )
    const input = screen.getByLabelText(/importar archivo/i)
    await user.upload(input, file)

    expect(await screen.findByRole('status')).toHaveTextContent(/se importaron 1 elementos/i)
    expect(stores.goodStore.hasNamed('Madera')).toBe(true)
    // errors cleared
    expect(screen.queryByRole('list', { name: /errores de importación/i })).not.toBeInTheDocument()
  })

  it('shows import errors and leaves the world untouched', async () => {
    const user = userEvent.setup()
    render(<Harness stores={stores} />)

    const file = new File(['{broken'], 'mundo.json', { type: 'application/json' })
    const input = screen.getByLabelText(/importar archivo/i)
    await user.upload(input, file)

    const errors = await screen.findByRole('list', { name: /errores de importación/i })
    expect(within(errors).getByText(/no es un json válido/i)).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(stores.goodStore.hasNamed('Madera')).toBe(false)
    expect(stores.goodStore.all()).toHaveLength(2)
  })

  it('shows empty states for each catalog', () => {
    const empty = createStores()
    render(<Harness stores={empty} />)

    expect(screen.getByText(/no hay bienes registrados/i)).toBeInTheDocument()
    expect(screen.getByText(/no hay recetas en el catálogo/i)).toBeInTheDocument()
    expect(screen.getByText(/no hay agentes creados/i)).toBeInTheDocument()
  })

  it('reports omitted elements when re-importing the same file', async () => {
    const user = userEvent.setup()
    render(<Harness stores={stores} />)

    const json = JSON.stringify({
      version: 1,
      goods: [{ name: 'Harina' }],
      recipes: [],
      agents: [],
    })
    const file = new File([json], 'mundo.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/importar archivo/i), file)

    expect(await screen.findByRole('status')).toHaveTextContent(
      /se importaron 0 elementos y se omitieron 1 por ya existir/i,
    )
    expect(stores.goodStore.all()).toHaveLength(2) // no duplicate
  })
})
