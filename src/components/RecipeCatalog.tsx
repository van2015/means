import type { Recipe, RecipeStore } from '@/domain/recipeStore'

type RecipeCatalogProps = {
  recipes: Recipe[]
  store: RecipeStore
  onEdit: (recipe: Recipe) => void
  onDelete: (id: string) => void
}

type RecipeCatalogItemProps = {
  recipe: Recipe
  store: RecipeStore
  onEdit: (recipe: Recipe) => void
  onDelete: (id: string) => void
}

function RecipeCatalogItem({ recipe, store, onEdit, onDelete }: RecipeCatalogItemProps) {
  return (
    <li>
      {recipe.name}
      <button type="button" onClick={() => onEdit(recipe)}>
        Editar
      </button>
      <button type="button" onClick={() => onDelete(recipe.id)}>
        Eliminar
      </button>
      <ul>
        {recipe.inputs.map((line, index) => {
          const good = store.getGood(line.goodId)
          return (
            <li key={index}>
              Insumo: {good?.name}: {line.quantity}
            </li>
          )
        })}
        {recipe.outputs.map((line, index) => {
          const good = store.getGood(line.goodId)
          return (
            <li key={index}>
              Producto: {good?.name}: {line.quantity}
            </li>
          )
        })}
      </ul>
    </li>
  )
}

export function RecipeCatalog({ recipes, store, onEdit, onDelete }: RecipeCatalogProps) {
  return (
    <section>
      <h3>Catálogo de recetas</h3>
      <ul>
        {recipes.map((recipe) => (
          <RecipeCatalogItem
            key={recipe.id}
            recipe={recipe}
            store={store}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}
