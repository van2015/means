import type { Agent, Rule } from '@/domain/agentStore'
import type { Good } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'
import { goodName } from './catalogHelpers'

type AgentCatalogProps = {
  agents: Agent[]
  goods: Good[]
  catalogRecipes: Recipe[]
  selectedAgentId: string | null
  selectedAgentView: 'recipes' | 'rules' | null
  onSelectAgent: (agentId: string) => void
  onSelectAgentRules: (agentId: string) => void
  onEditRecipe: (recipe: Recipe) => void
  onDeleteRecipe: (recipeId: string) => void
  onEditRule: (rule: Rule) => void
  onDeleteRule: (ruleId: string) => void
}

function recipeName(
  recipeRef: Rule['recipeRef'],
  catalogRecipes: Recipe[],
  agentRecipes: Recipe[],
): string {
  const recipes = recipeRef.source === 'catalog' ? catalogRecipes : agentRecipes
  return recipes.find((recipe) => recipe.id === recipeRef.recipeId)?.name ?? ''
}

function operatorLabel(operator: Rule['condition']['operator']): string {
  return operator === 'AT_LEAST' ? 'al menos' : 'menos de'
}

export function AgentCatalog({
  agents,
  goods,
  catalogRecipes,
  selectedAgentId,
  selectedAgentView,
  onSelectAgent,
  onSelectAgentRules,
  onEditRecipe,
  onDeleteRecipe,
  onEditRule,
  onDeleteRule,
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
            <button type="button" onClick={() => onSelectAgentRules(agent.id)}>
              Gestionar reglas
            </button>
            <ul>
              {agent.inventory.map((line, index) => (
                <li key={index}>
                  {goodName(goods, line.goodId)}: {line.quantity}
                </li>
              ))}
            </ul>
            {selectedAgentId === agent.id && selectedAgentView === 'recipes' && (
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
                      {recipe.inputs.map((line, index) => (
                        <li key={index}>
                          Insumo: {goodName(goods, line.goodId)}: {line.quantity}
                        </li>
                      ))}
                      {recipe.outputs.map((line, index) => (
                        <li key={index}>
                          Producto: {goodName(goods, line.goodId)}: {line.quantity}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            {selectedAgentId === agent.id && selectedAgentView === 'rules' && (
              <ul aria-label="Reglas del agente">
                {agent.rules.map((rule) => (
                  <li key={rule.id}>
                    {recipeName(rule.recipeRef, catalogRecipes, agent.recipes)} —{' '}
                    {operatorLabel(rule.condition.operator)} {rule.condition.quantity}{' '}
                    {goodName(goods, rule.condition.goodId)} (prioridad: {rule.priority})
                    <button type="button" onClick={() => onEditRule(rule)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => onDeleteRule(rule.id)}>
                      Eliminar
                    </button>
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
