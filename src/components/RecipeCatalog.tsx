import type { Recipe, RecipeStore } from '@/domain/recipeStore'

type RecipeCatalogProps = {
  recipes: Recipe[]
  store: RecipeStore
}

export function RecipeCatalog({ recipes, store }: RecipeCatalogProps) {
  return (
    <section>
      <h3>Catálogo de recetas</h3>
      <ul>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            {recipe.name}
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
        ))}
      </ul>
    </section>
  )
}
