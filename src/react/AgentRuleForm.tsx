import type { RuleError, RuleRecipeRef } from '@/domain/agent'
import type { Good } from '@/domain/good'
import type { Recipe } from '@/domain/recipe'
import { ValidationErrors } from './ValidationErrors'

type RuleRecipeSelectProps = {
  recipeRef: RuleRecipeRef
  catalogRecipes: Recipe[]
  ownRecipes: Recipe[]
  onChange: (ref: RuleRecipeRef) => void
}

/**
 * A rule recipe can come from the general catalog or from the selected
 * agent's own recipes, so the two sources are optgroups of the same select.
 */
function RuleRecipeSelect({
  recipeRef,
  catalogRecipes,
  ownRecipes,
  onChange,
}: RuleRecipeSelectProps) {
  return (
    <label>
      Receta de la regla
      <select
        value={`${recipeRef.source}:${recipeRef.recipeId}`}
        onChange={(event) => {
          const [source, recipeId] = event.target.value.split(':') as ['catalog' | 'agent', string]
          onChange({ source, recipeId })
        }}
      >
        <option value="">Seleccionar receta</option>
        <optgroup label="Catálogo general">
          {catalogRecipes.map((recipe) => (
            <option key={recipe.id} value={`catalog:${recipe.id}`}>
              {recipe.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Recetas propias del agente">
          {ownRecipes.map((recipe) => (
            <option key={recipe.id} value={`agent:${recipe.id}`}>
              {recipe.name}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}

type AgentRuleFormProps = {
  recipeRef: RuleRecipeRef
  conditionGoodId: string
  conditionQuantity: string
  conditionOperator: 'AT_LEAST' | 'LESS_THAN'
  priority: string
  errors: RuleError[]
  catalogRecipes: Recipe[]
  ownRecipes: Recipe[]
  goods: Good[]
  onRecipeRefChange: (ref: RuleRecipeRef) => void
  onConditionGoodIdChange: (goodId: string) => void
  onConditionQuantityChange: (value: string) => void
  onConditionOperatorChange: (operator: 'AT_LEAST' | 'LESS_THAN') => void
  onPriorityChange: (value: string) => void
  onSubmit: () => void
}

export function AgentRuleForm({
  recipeRef,
  conditionGoodId,
  conditionQuantity,
  conditionOperator,
  priority,
  errors,
  catalogRecipes,
  ownRecipes,
  goods,
  onRecipeRefChange,
  onConditionGoodIdChange,
  onConditionQuantityChange,
  onConditionOperatorChange,
  onPriorityChange,
  onSubmit,
}: AgentRuleFormProps) {
  return (
    <section>
      <h3>Regla automática del agente</h3>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <RuleRecipeSelect
          recipeRef={recipeRef}
          catalogRecipes={catalogRecipes}
          ownRecipes={ownRecipes}
          onChange={onRecipeRefChange}
        />
        <label>
          Bien de la condición
          <select
            value={conditionGoodId}
            onChange={(event) => onConditionGoodIdChange(event.target.value)}
          >
            <option value="">Seleccionar bien</option>
            {goods.map((good) => (
              <option key={good.id} value={good.id}>
                {good.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cantidad de la condición
          <input
            type="number"
            min="1"
            value={conditionQuantity}
            onChange={(event) => onConditionQuantityChange(event.target.value)}
          />
        </label>
        <label>
          Operador de la condición
          <select
            value={conditionOperator}
            onChange={(event) =>
              onConditionOperatorChange(event.target.value as 'AT_LEAST' | 'LESS_THAN')
            }
          >
            <option value="AT_LEAST">al menos</option>
            <option value="LESS_THAN">menos de</option>
          </select>
        </label>
        <label>
          Prioridad de la regla
          <input
            type="number"
            value={priority}
            onChange={(event) => onPriorityChange(event.target.value)}
          />
        </label>
        <button type="submit">Guardar regla</button>
      </form>
      <ValidationErrors errors={errors} />
    </section>
  )
}
