import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createStores } from '@/domain/stores'
import { App } from '@/react/App'
import {
  agentNameInput,
  createAgentButton,
  goodNameInput,
  registerGoodButton,
  withinAgentCatalog,
} from '../helpers/designModeQueries'

describe('App', () => {
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

    const goodsCatalog = screen
      .getByRole('heading', { name: /bienes y servicios/i })
      .closest('section')!
    expect(within(goodsCatalog).getByText('Harina')).toBeInTheDocument()
    expect(withinAgentCatalog().getByText('Panadero')).toBeInTheDocument()
  })
})
