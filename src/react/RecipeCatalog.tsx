import type { Recipe } from '@/domain/recipeStore'
import type { Good } from '@/domain/goodStore'

type RecipeCatalogProps = {
  recipes: Recipe[]
  goods: Good[]
  onEdit: (recipe: Recipe) => void
  onDelete: (id: string) => void
}

type RecipeCatalogItemProps = {
  recipe: Recipe
  goods: Good[]
  onEdit: (recipe: Recipe) => void
  onDelete: (id: string) => void
}

function RecipeCatalogItem({ recipe, goods, onEdit, onDelete }: RecipeCatalogItemProps) {
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
  )
}

export function RecipeCatalog({ recipes, goods, onEdit, onDelete }: RecipeCatalogProps) {
  return (
    <section>
      <h3>Catálogo de recetas</h3>
      <ul>
        {recipes.map((recipe) => (
          <RecipeCatalogItem
            key={recipe.id}
            recipe={recipe}
            goods={goods}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}
