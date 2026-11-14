import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStores } from '@/domain/stores'
import { WORLD_STORAGE_KEY } from '@/persistence'
import { App } from '@/react/App'
import {
  agentNameInput,
  createAgentButton,
  goodNameInput,
  registerGoodButton,
  withinAgentCatalog,
  withinGoodsCatalog,
} from '../helpers/designModeQueries'

describe('App', () => {
  beforeEach(() => {
    // persistence writes on every presenter notification: isolate each test
    localStorage.removeItem(WORLD_STORAGE_KEY)
  })

  it('keeps the shared app shell when switching between modes', async () => {
    const user = userEvent.setup()
    render(<App stores={createStores()} />)

    const shell = screen.getByRole('main')
    expect(within(shell).getByRole('heading', { name: /modo diseño/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))

    expect(screen.getByRole('main')).toBe(shell)
    expect(within(shell).getByRole('heading', { name: /modo juego/i })).toBeInTheDocument()
  })

  it('switches from design mode to play mode', async () => {
    const user = userEvent.setup()
    render(<App stores={createStores()} />)

    expect(screen.getByRole('heading', { name: /modo diseño/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))

    expect(screen.getByRole('heading', { name: /modo juego/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /modo diseño/i })).not.toBeInTheDocument()
  })

  it('switches from play mode to design mode', async () => {
    const user = userEvent.setup()
    render(<App stores={createStores()} />)

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))
    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))

    expect(screen.getByRole('heading', { name: /modo diseño/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /modo juego/i })).not.toBeInTheDocument()
  })

  it('shares the same stores between modes', async () => {
    const user = userEvent.setup()
    render(<App stores={createStores()} />)

    await user.type(goodNameInput(), 'Harina')
    await user.click(registerGoodButton())

    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))

    // the agent created in design mode is available in play mode
    const agentsList = screen.getByRole('list', { name: /agentes disponibles/i })
    expect(within(agentsList).getByText('Panadero')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))

    expect(withinGoodsCatalog().getByText('Harina')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()
  })

  it('restores a world that was saved before the page reloaded', async () => {
    const user = userEvent.setup()

    // session 1: App owns its stores, edits get saved by the hooks
    const first = render(<App />)
    await user.type(goodNameInput(), 'Harina')
    await user.click(registerGoodButton())
    await user.type(agentNameInput(), 'Panadero')
    await user.click(createAgentButton())

    expect(localStorage.getItem(WORLD_STORAGE_KEY)).not.toBeNull()

    // simulate a reload: unmount everything, then a fresh App
    first.unmount()
    render(<App />)

    expect(withinGoodsCatalog().getByText('Harina')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()
  })

  it('restores a world seeded directly into localStorage', () => {
    localStorage.setItem(
      WORLD_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        goods: [{ name: 'Trigo' }],
        recipes: [],
        agents: [],
      }),
    )

    render(<App />)

    expect(withinGoodsCatalog().getByText('Trigo')).toBeInTheDocument()
  })

  it('starts empty and does not break when the saved world is corrupt', () => {
    localStorage.setItem(WORLD_STORAGE_KEY, '{broken json')

    render(<App />)

    expect(screen.getByRole('heading', { name: /modo diseño/i })).toBeInTheDocument()
    expect(withinGoodsCatalog().queryByRole('listitem')).not.toBeInTheDocument()
  })
})
