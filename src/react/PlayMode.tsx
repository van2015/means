import type { Stores } from '@/domain/stores'
import { usePlayMode } from '@/presentation/usePlayMode'
import { goodName, operatorLabel, recipeName } from './catalogHelpers'

type PlayModeProps = {
  stores: Stores
}

export function PlayMode({ stores }: PlayModeProps) {
  const play = usePlayMode(stores)
  const possessed = play.possessedAgent

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
        <p>{possessed ? `Poseído: ${possessed.name}` : 'No posees a ningún agente'}</p>
        {possessed && (
          <button type="button" onClick={play.release}>
            Dejar de poseer
          </button>
        )}
        {play.error && <p role="alert">{play.error}</p>}
      </section>
      {possessed && (
        <section>
          <h3>Inventario de {possessed.name}</h3>
          {possessed.inventory.length === 0 ? (
            <p>El inventario está vacío.</p>
          ) : (
            <ul aria-label="Inventario del agente poseído">
              {possessed.inventory.map((line, index) => (
                <li key={`${line.goodId}-${index}`}>
                  {goodName(play.goods, line.goodId)}: {line.quantity}
                </li>
              ))}
            </ul>
          )}
          <h3>Recetas de {possessed.name}</h3>
          {possessed.recipes.length === 0 ? (
            <p>Este agente no tiene recetas propias.</p>
          ) : (
            <ul aria-label="Recetas del agente poseído">
              {possessed.recipes.map((recipe) => (
                <li key={recipe.id}>
                  {recipe.name}
                  <ul>
                    {recipe.inputs.map((line, index) => (
                      <li key={`${line.goodId}-${index}`}>
                        Insumo: {goodName(play.goods, line.goodId)}: {line.quantity}
                      </li>
                    ))}
                    {recipe.outputs.map((line, index) => (
                      <li key={`${line.goodId}-${index}`}>
                        Producto: {goodName(play.goods, line.goodId)}: {line.quantity}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <h3>Reglas de {possessed.name}</h3>
          {possessed.rules.length === 0 ? (
            <p>Este agente no tiene reglas automáticas.</p>
          ) : (
            <ul aria-label="Reglas del agente poseído">
              {possessed.rules.map((rule, index) => (
                <li key={rule.id}>
                  {recipeName(rule.recipeRef, play.catalogRecipes, possessed.recipes)} —{' '}
                  {operatorLabel(rule.condition.operator)} {rule.condition.quantity}{' '}
                  {goodName(play.goods, rule.condition.goodId)} (prioridad: {rule.priority})
                  <label>
                    Prioridad de la regla {index + 1}
                    <input
                      type="number"
                      value={play.priorityDraft(rule.id, rule.priority)}
                      onChange={(event) => play.setPriorityDraft(rule.id, event.target.value)}
                    />
                  </label>
                  <button type="button" onClick={() => play.submitPriority(rule.id)}>
                    Guardar prioridad
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
