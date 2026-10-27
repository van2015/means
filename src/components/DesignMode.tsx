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
          listId="goods-list-inputs"
          lines={presenter.inputs}
          goods={presenter.goods}
          onAdd={presenter.addInput}
          onUpdate={presenter.updateInput}
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
      <section>
        <h3>Catálogo de bienes y servicios</h3>
        <form onSubmit={presenter.registerGood}>
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
    </div>
  )
}
