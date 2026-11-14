import type { Agent } from '@/domain/agent'
import type { Stores } from '@/domain/stores'
import { ACTIVATION_STRATEGIES, type ActivationStrategy } from '@/domain/strategyStore'
import { usePlayMode } from '@/presentation/usePlayMode'
import { PossessedAgentPanel } from './PossessedAgentPanel'

type PlayModeProps = {
  stores: Stores
}

const STRATEGY_LABELS: Record<ActivationStrategy, string> = {
  TEMPORAL: 'Temporal',
  POR_ACCIONES: 'Por acciones',
}

/** Composition root of play mode: possession first, then the possessed agent. */
export function PlayMode({ stores }: PlayModeProps) {
  const play = usePlayMode(stores)
  const possessed = play.possessedAgent

  return (
    <div className="mode-layout">
      <h2>Modo juego</h2>
      <div className="mode-content">
        <StrategySection strategy={play.strategy} onChange={play.setStrategy} />
        <PossessionSection
          agents={play.agents}
          possessedAgentId={play.possessedAgentId}
          possessed={possessed}
          error={play.error}
          onPossess={play.possess}
          onRelease={play.release}
        />
        {play.strategy === 'POR_ACCIONES' && !possessed && (
          <button type="button" onClick={play.advance}>
            Avanzar
          </button>
        )}
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
    </div>
  )
}

type StrategySectionProps = {
  strategy: ActivationStrategy
  onChange: (strategy: ActivationStrategy) => void
}

function StrategySection({ strategy, onChange }: StrategySectionProps) {
  return (
    <fieldset>
      <legend>Estrategia de activación</legend>
      {ACTIVATION_STRATEGIES.map((value) => (
        <label key={value}>
          <input
            type="radio"
            name="activation-strategy"
            value={value}
            checked={strategy === value}
            onChange={() => onChange(value)}
          />
          {STRATEGY_LABELS[value]}
        </label>
      ))}
    </fieldset>
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
