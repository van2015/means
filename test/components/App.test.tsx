import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createStores } from '@/domain/stores'
import { App } from '@/react/App'
import { goodNameInput, registerGoodButton } from '../helpers/designModeQueries'

describe('App', () => {
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

    await user.click(screen.getByRole('button', { name: /cambiar a modo juego/i }))

    expect(screen.getByText(/bienes registrados: 1/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cambiar a modo diseño/i }))

    expect(screen.getByText('Harina')).toBeInTheDocument()
  })
})
