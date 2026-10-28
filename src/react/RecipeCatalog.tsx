import type { Good } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'
import { goodName } from './catalogHelpers'

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
