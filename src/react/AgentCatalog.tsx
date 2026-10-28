import type { Agent } from '@/domain/agentStore'
import type { Good } from '@/domain/recipeStore'
import type { Recipe } from '@/domain/recipeStore'

type AgentCatalogProps = {
  agents: Agent[]
  goods: Good[]
  selectedAgentId: string | null
  onSelectAgent: (agentId: string) => void
  onEditRecipe: (recipe: Recipe) => void
  onDeleteRecipe: (recipeId: string) => void
}

export function AgentCatalog({
  agents,
  goods,
  selectedAgentId,
  onSelectAgent,
  onEditRecipe,
  onDeleteRecipe,
}: AgentCatalogProps) {
  return (
    <section>
      <h3>Catálogo de agentes</h3>
      <ul>
        {agents.map((agent) => (
          <li key={agent.id}>
            {agent.name}
            <button type="button" onClick={() => onSelectAgent(agent.id)}>
              Gestionar recetas
            </button>
            <ul>
              {agent.inventory.map((line, index) => {
                const good = goods.find((g) => g.id === line.goodId)
                return (
                  <li key={index}>
                    {good?.name}: {line.quantity}
                  </li>
                )
              })}
            </ul>
            {selectedAgentId === agent.id && (
              <ul>
                {agent.recipes.map((recipe) => (
                  <li key={recipe.id}>
                    {recipe.name}
                    <button type="button" onClick={() => onEditRecipe(recipe)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => onDeleteRecipe(recipe.id)}>
                      Eliminar
                    </button>
                    <ul>
                      {recipe.inputs.map((line, index) => {
                        const good = goods.find((g) => g.id === line.goodId)
                        return (
                          <li key={index}>
                            Insumo: {good?.name}: {line.quantity}
                          </li>
                        )
                      })}
                      {recipe.outputs.map((line, index) => {
                        const good = goods.find((g) => g.id === line.goodId)
                        return (
                          <li key={index}>
                            Producto: {good?.name}: {line.quantity}
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
