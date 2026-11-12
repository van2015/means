import type { Stores } from '@/domain/stores'
import { usePlayMode } from '@/presentation/usePlayMode'

type PlayModeProps = {
  stores: Stores
}

export function PlayMode({ stores }: PlayModeProps) {
  const play = usePlayMode(stores)

  return (
    <div>
      <h2>Modo juego</h2>
      <section>
        <h3>Agentes disponibles</h3>
        {play.agents.length === 0 ? (
          <p>No hay agentes disponibles. Crea agentes en el modo diseño.</p>
        ) : (
          <ul aria-label="Agentes disponibles">
            {play.agents.map((agent) => (
              <li key={agent.id}>
                {agent.name}
                {play.possessedAgentId === agent.id ? (
                  <span> Poseído</span>
                ) : (
                  <button type="button" onClick={() => play.possess(agent.id)}>
                    Poseer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p>
          {play.possessedAgent
            ? `Poseído: ${play.possessedAgent.name}`
            : 'No posees a ningún agente'}
        </p>
        {play.possessedAgent && (
          <button type="button" onClick={play.release}>
            Dejar de poseer
          </button>
        )}
        {play.error && <p role="alert">{play.error}</p>}
      </section>
    </div>
  )
}
