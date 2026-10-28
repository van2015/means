import { useState } from 'react'
import { createStores, type Stores } from '@/domain/stores'
import { DesignMode } from './DesignMode'
import { PlayMode } from './PlayMode'

type Mode = 'design' | 'play'

type AppProps = {
  stores?: Stores
}

export function App({ stores: providedStores }: AppProps) {
  const [stores] = useState(() => providedStores ?? createStores())
  const [mode, setMode] = useState<Mode>('design')

  return (
    <div className="app-shell">
      <button
        type="button"
        onClick={() => setMode((current) => (current === 'design' ? 'play' : 'design'))}
      >
        {mode === 'design' ? 'Cambiar a modo juego' : 'Cambiar a modo diseño'}
      </button>
      <main>
        {mode === 'design' ? <DesignMode stores={stores} /> : <PlayMode stores={stores} />}
      </main>
    </div>
  )
}
