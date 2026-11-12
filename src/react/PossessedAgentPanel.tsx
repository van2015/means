import type { Agent, RuleRecipeRef } from '@/domain/agent'
import type { Recipe } from '@/domain/recipeStore'
import { operatorLabel } from '@/presentation/catalogHelpers'

type GoodName = (goodId: string) => string

type PossessedAgentPanelProps = {
  agent: Agent
  catalogRecipes: Recipe[]
  goodName: GoodName
  recipeLabel: (recipeRef: RuleRecipeRef) => string
  priorityDraft: (ruleId: string, currentPriority: number) => string
  onPriorityChange: (ruleId: string, value: string) => void
  onSubmitPriority: (ruleId: string) => void
  onProduce: (recipeRef: RuleRecipeRef) => void
}

/** Everything the player can see and do with the agent they possess. */
export function PossessedAgentPanel({
  agent,
  catalogRecipes,
  goodName,
  recipeLabel,
  priorityDraft,
  onPriorityChange,
  onSubmitPriority,
  onProduce,
}: PossessedAgentPanelProps) {
  return (
    <section>
      <InventorySection agent={agent} goodName={goodName} />
      <RecipesSection agent={agent} goodName={goodName} />
      <RulesSection
        agent={agent}
        goodName={goodName}
        recipeLabel={recipeLabel}
        priorityDraft={priorityDraft}
        onPriorityChange={onPriorityChange}
        onSubmitPriority={onSubmitPriority}
      />
      <ProduceSection
        agent={agent}
        catalogRecipes={catalogRecipes}
        goodName={goodName}
        onProduce={onProduce}
      />
    </section>
  )
}

function InventorySection({ agent, goodName }: { agent: Agent; goodName: GoodName }) {
  return (
    <>
      <h3>Inventario de {agent.name}</h3>
      {agent.inventory.length === 0 ? (
        <p>El inventario está vacío.</p>
      ) : (
        <ul aria-label="Inventario del agente poseído">
          {agent.inventory.map((line, index) => (
            <li key={`${line.goodId}-${index}`}>
              {goodName(line.goodId)}: {line.quantity}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function RecipesSection({ agent, goodName }: { agent: Agent; goodName: GoodName }) {
  return (
    <>
      <h3>Recetas de {agent.name}</h3>
      {agent.recipes.length === 0 ? (
        <p>Este agente no tiene recetas propias.</p>
      ) : (
        <ul aria-label="Recetas del agente poseído">
          {agent.recipes.map((recipe) => (
            <li key={recipe.id}>
              {recipe.name}
              <ul>
                {recipe.inputs.map((line, index) => (
                  <li key={`${line.goodId}-${index}`}>
                    Insumo: {goodName(line.goodId)}: {line.quantity}
                  </li>
                ))}
                {recipe.outputs.map((line, index) => (
                  <li key={`${line.goodId}-${index}`}>
                    Producto: {goodName(line.goodId)}: {line.quantity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

type RulesSectionProps = {
  agent: Agent
  goodName: GoodName
  recipeLabel: (recipeRef: RuleRecipeRef) => string
  priorityDraft: (ruleId: string, currentPriority: number) => string
  onPriorityChange: (ruleId: string, value: string) => void
  onSubmitPriority: (ruleId: string) => void
}

function RulesSection({
  agent,
  goodName,
  recipeLabel,
  priorityDraft,
  onPriorityChange,
  onSubmitPriority,
}: RulesSectionProps) {
  return (
    <>
      <h3>Reglas de {agent.name}</h3>
      {agent.rules.length === 0 ? (
        <p>Este agente no tiene reglas automáticas.</p>
      ) : (
        <ul aria-label="Reglas del agente poseído">
          {agent.rules.map((rule, index) => (
            <li key={rule.id}>
              {recipeLabel(rule.recipeRef)} — {operatorLabel(rule.condition.operator)}{' '}
              {rule.condition.quantity} {goodName(rule.condition.goodId)} (prioridad:{' '}
              {rule.priority})
              <label>
                Prioridad de la regla {index + 1}
                <input
                  type="number"
                  value={priorityDraft(rule.id, rule.priority)}
                  onChange={(event) => onPriorityChange(rule.id, event.target.value)}
                />
              </label>
              <button type="button" onClick={() => onSubmitPriority(rule.id)}>
                Guardar prioridad
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

type ProduceSectionProps = {
  agent: Agent
  catalogRecipes: Recipe[]
  goodName: GoodName
  onProduce: (recipeRef: RuleRecipeRef) => void
}

function ProduceSection({ agent, catalogRecipes, goodName, onProduce }: ProduceSectionProps) {
  return (
    <>
      <h3>Producir</h3>
      <ProduceList
        heading="Catálogo general"
        emptyMessage="No hay recetas en el catálogo."
        ariaLabel="Recetas del catálogo para producir"
        recipes={catalogRecipes}
        source="catalog"
        goodName={goodName}
        onProduce={onProduce}
      />
      <ProduceList
        heading="Recetas propias"
        emptyMessage="No hay recetas propias para producir."
        ariaLabel="Recetas del agente para producir"
        recipes={agent.recipes}
        source="agent"
        goodName={goodName}
        onProduce={onProduce}
      />
    </>
  )
}

type ProduceListProps = {
  heading: string
  emptyMessage: string
  ariaLabel: string
  recipes: Recipe[]
  source: 'catalog' | 'agent'
  goodName: GoodName
  onProduce: (recipeRef: RuleRecipeRef) => void
}

function ProduceList({
  heading,
  emptyMessage,
  ariaLabel,
  recipes,
  source,
  goodName,
  onProduce,
}: ProduceListProps) {
  return (
    <>
      <h4>{heading}</h4>
      {recipes.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul aria-label={ariaLabel}>
          {recipes.map((recipe) => (
            <ProduceRow
              key={recipe.id}
              recipe={recipe}
              goodName={goodName}
              onProduce={() => onProduce({ source, recipeId: recipe.id })}
            />
          ))}
        </ul>
      )}
    </>
  )
}

function ProduceRow({
  recipe,
  goodName,
  onProduce,
}: {
  recipe: Recipe
  goodName: GoodName
  onProduce: () => void
}) {
  return (
    <li>
      {recipe.name}
      <ul>
        {recipe.inputs.map((line, index) => (
          <li key={`${line.goodId}-${index}`}>
            Insumo: {goodName(line.goodId)}: {line.quantity}
          </li>
        ))}
        {recipe.outputs.map((line, index) => (
          <li key={`${line.goodId}-${index}`}>
            Producto: {goodName(line.goodId)}: {line.quantity}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onProduce}>
        Producir
      </button>
    </li>
  )
}
