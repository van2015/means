import type { Stores } from '@/domain/stores'

type PlayModeProps = {
  stores: Stores
}

export function PlayMode({ stores }: PlayModeProps) {
  return (
    <div>
      <h2>Modo juego</h2>
      <p>Bienes registrados: {stores.goodStore.all().length}</p>
    </div>
  )
}
