import type { Agent } from '@/domain/agentStore'
import type { Good } from '@/domain/recipeStore'

type AgentCatalogProps = {
  agents: Agent[]
  goods: Good[]
}

export function AgentCatalog({ agents, goods }: AgentCatalogProps) {
  return (
    <section>
      <h3>Catálogo de agentes</h3>
      <ul>
        {agents.map((agent) => (
          <li key={agent.id}>
            {agent.name}
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
          </li>
        ))}
      </ul>
    </section>
  )
}
