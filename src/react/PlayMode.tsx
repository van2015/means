import type { Agent } from '@/domain/agent'
import type { Stores } from '@/domain/stores'
import { usePlayMode } from '@/presentation/usePlayMode'
import { PossessedAgentPanel } from './PossessedAgentPanel'

type PlayModeProps = {
  stores: Stores
}

/** Composition root of play mode: possession first, then the possessed agent. */
export function PlayMode({ stores }: PlayModeProps) {
  const play = usePlayMode(stores)
  const possessed = play.possessedAgent

  return (
    <div>
      <h2>Modo juego</h2>
      <PossessionSection
        agents={play.agents}
        possessedAgentId={play.possessedAgentId}
        possessed={possessed}
        error={play.error}
        onPossess={play.possess}
        onRelease={play.release}
      />
      {possessed && (
        <PossessedAgentPanel
          agent={possessed}
          catalogRecipes={play.catalogRecipes}
          goodName={play.goodName}
          recipeLabel={play.recipeLabel}
          priorityDraft={play.priorityDraft}
          onPriorityChange={play.setPriorityDraft}
          onSubmitPriority={play.submitPriority}
          onProduce={play.produce}
        />
      )}
    </div>
  )
}

type PossessionSectionProps = {
  agents: Agent[]
  possessedAgentId: string | null
  possessed: Agent | null
  error: string | null
  onPossess: (agentId: string) => void
  onRelease: () => void
}

function PossessionSection({
  agents,
  possessedAgentId,
  possessed,
  error,
  onPossess,
  onRelease,
}: PossessionSectionProps) {
  return (
    <section>
      <h3>Agentes disponibles</h3>
      {agents.length === 0 ? (
        <p>No hay agentes disponibles. Crea agentes en el modo diseño.</p>
      ) : (
        <ul aria-label="Agentes disponibles">
          {agents.map((agent) => (
            <li key={agent.id}>
              {agent.name}
              {possessedAgentId === agent.id ? (
                <span> Poseído</span>
              ) : (
                <button type="button" onClick={() => onPossess(agent.id)}>
                  Poseer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>{possessed ? `Poseído: ${possessed.name}` : 'No posees a ningún agente'}</p>
      {possessed && (
        <button type="button" onClick={onRelease}>
          Dejar de poseer
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
