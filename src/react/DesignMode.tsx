import { createStores, type Stores } from '@/domain/stores'
import { useDesignMode } from '@/presentation/useDesignMode'
import { AgentCatalog } from './AgentCatalog'
import { RecipeCatalog } from './RecipeCatalog'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

type DesignModeProps = {
  stores?: Stores
}

export function DesignMode({ stores = createStores() }: DesignModeProps) {
  const presenter = useDesignMode(stores)

  return (
    <div>
      <h2>Modo diseño</h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          presenter.submit()
        }}
      >
        <label>
          Nombre
          <input
            value={presenter.name}
            onChange={(event) => presenter.setName(event.target.value)}
          />
        </label>
        <RecipeLineForm
          legend="Entradas"
          lineLabel="insumo"
          addButtonLabel="entrada"
          listId="goods-list-inputs"
          lines={presenter.inputs}
          goods={presenter.goods}
          onAdd={presenter.addInput}
          onUpdate={presenter.updateInput}
          onRemove={presenter.removeInput}
        />
        <RecipeLineForm
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          listId="goods-list-outputs"
          lines={presenter.outputs}
          goods={presenter.goods}
          onAdd={presenter.addOutput}
          onUpdate={presenter.updateOutput}
          onRemove={presenter.removeOutput}
        />
        <button type="submit">Guardar receta</button>
      </form>
      <ValidationErrors errors={presenter.errors} />
      <RecipeCatalog
        recipes={presenter.recipes}
        goods={presenter.goods}
        onEdit={presenter.startEdit}
        onDelete={presenter.deleteRecipe}
      />
      <section>
        <h3>Catálogo de bienes y servicios</h3>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            presenter.registerGood()
          }}
        >
          <label>
            Bien o servicio
            <input
              value={presenter.goodName}
              onChange={(event) => presenter.setGoodName(event.target.value)}
            />
          </label>
          <button type="submit">Registrar bien o servicio</button>
        </form>
        {presenter.goodError && <p>{presenter.goodError}</p>}
        <ul>
          {presenter.goods.map((good) => (
            <li key={good.id}>{good.name}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Crear agente</h3>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            presenter.submitAgent()
          }}
        >
          <label>
            Nombre del agente
            <input
              value={presenter.agentName}
              onChange={(event) => presenter.setAgentName(event.target.value)}
            />
          </label>
          <RecipeLineForm
            legend="Inventario inicial"
            lineLabel="bien"
            addButtonLabel="línea de inventario"
            listId="goods-list-agent"
            lines={presenter.agentInventory}
            goods={presenter.goods}
            onAdd={presenter.addAgentInventoryLine}
            onUpdate={presenter.updateAgentInventoryLine}
            onRemove={presenter.removeAgentInventoryLine}
          />
          <button type="submit">Crear agente</button>
        </form>
        <ValidationErrors errors={presenter.agentErrors} />
      </section>
      <AgentCatalog
        agents={presenter.agents}
        goods={presenter.goods}
        catalogRecipes={presenter.catalogRecipes}
        selectedAgentId={presenter.selectedAgentId}
        selectedAgentView={presenter.selectedAgentView}
        onSelectAgent={presenter.selectAgent}
        onSelectAgentRules={presenter.selectAgentRules}
        onEditRecipe={presenter.startEditAgentRecipe}
        onDeleteRecipe={presenter.deleteAgentRecipe}
        onEditRule={presenter.startEditAgentRule}
        onDeleteRule={presenter.deleteAgentRule}
      />
      {presenter.selectedAgentId && presenter.selectedAgentView === 'recipes' && (
        <section>
          <h3>Receta propia del agente</h3>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              presenter.submitAgentRecipe()
            }}
          >
            <label>
              Nombre de la receta del agente
              <input
                value={presenter.agentRecipeName}
                onChange={(event) => presenter.setAgentRecipeName(event.target.value)}
              />
            </label>
            <RecipeLineForm
              legend="Entradas"
              lineLabel="insumo de receta del agente"
              addButtonLabel="entrada de receta del agente"
              listId="goods-list-agent-recipe-inputs"
              lines={presenter.agentRecipeInputs}
              goods={presenter.goods}
              onAdd={presenter.addAgentRecipeInput}
              onUpdate={presenter.updateAgentRecipeInput}
            />
            <RecipeLineForm
              legend="Salidas"
              lineLabel="producto de receta del agente"
              addButtonLabel="salida de receta del agente"
              listId="goods-list-agent-recipe-outputs"
              lines={presenter.agentRecipeOutputs}
              goods={presenter.goods}
              onAdd={presenter.addAgentRecipeOutput}
              onUpdate={presenter.updateAgentRecipeOutput}
            />
            <button type="submit">Guardar receta del agente</button>
          </form>
          <ValidationErrors errors={presenter.agentRecipeErrors} />
        </section>
      )}
      {presenter.selectedAgentId && presenter.selectedAgentView === 'rules' && (
        <section>
          <h3>Regla automática del agente</h3>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              presenter.submitAgentRule()
            }}
          >
            <label>
              Receta de la regla
              <select
                value={`${presenter.agentRuleRecipeRef.source}:${presenter.agentRuleRecipeRef.recipeId}`}
                onChange={(event) => {
                  const [source, recipeId] = event.target.value.split(':') as [
                    'catalog' | 'agent',
                    string,
                  ]
                  presenter.setAgentRuleRecipeRef({ source, recipeId })
                }}
              >
                <option value="">Seleccionar receta</option>
                <optgroup label="Catálogo general">
                  {presenter.catalogRecipes.map((recipe) => (
                    <option key={recipe.id} value={`catalog:${recipe.id}`}>
                      {recipe.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Recetas propias del agente">
                  {presenter.agents
                    .find((agent) => agent.id === presenter.selectedAgentId)
                    ?.recipes.map((recipe) => (
                      <option key={recipe.id} value={`agent:${recipe.id}`}>
                        {recipe.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
            <label>
              Bien de la condición
              <select
                value={presenter.agentRuleConditionGoodId}
                onChange={(event) => presenter.setAgentRuleConditionGoodId(event.target.value)}
              >
                <option value="">Seleccionar bien</option>
                {presenter.goods.map((good) => (
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
                value={presenter.agentRuleConditionQuantity}
                onChange={(event) => presenter.setAgentRuleConditionQuantity(event.target.value)}
              />
            </label>
            <label>
              Operador de la condición
              <select
                value={presenter.agentRuleConditionOperator}
                onChange={(event) =>
                  presenter.setAgentRuleConditionOperator(
                    event.target.value as 'AT_LEAST' | 'LESS_THAN',
                  )
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
                value={presenter.agentRulePriority}
                onChange={(event) => presenter.setAgentRulePriority(event.target.value)}
              />
            </label>
            <button type="submit">Guardar regla</button>
          </form>
          <ValidationErrors errors={presenter.agentRuleErrors} />
        </section>
      )}
    </div>
  )
}
