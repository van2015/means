import { recipeStore } from '@/domain/recipeStore'
import { RecipeCatalog } from './RecipeCatalog'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'
import { useDesignMode } from './useDesignMode'

export function DesignMode() {
  const presenter = useDesignMode()

  return (
    <div>
      <h2>Modo diseño</h2>
      <form onSubmit={presenter.submit}>
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
          lines={presenter.inputs}
          onAdd={presenter.addInput}
          onUpdate={presenter.updateInput}
        />
        <RecipeLineForm
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          lines={presenter.outputs}
          onAdd={presenter.addOutput}
          onUpdate={presenter.updateOutput}
        />
        <button type="submit">Guardar receta</button>
      </form>
      <ValidationErrors errors={presenter.errors} />
      <RecipeCatalog
        recipes={presenter.recipes}
        store={recipeStore}
        onEdit={presenter.startEdit}
        onDelete={presenter.deleteRecipe}
      />
    </div>
  )
}
