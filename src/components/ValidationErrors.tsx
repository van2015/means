import type { RecipeError } from '@/domain/recipeStore'

function errorMessage(error: RecipeError): string {
  switch (error.code) {
    case 'NO_INPUTS':
      return 'Se requiere al menos una entrada'
    case 'NO_OUTPUTS':
      return 'Se requiere al menos una salida'
    case 'INVALID_QUANTITY':
      return `La cantidad de ${error.goodName} debe ser mayor que cero`
  }
}

export function ValidationErrors({ errors }: { errors: RecipeError[] }) {
  if (errors.length === 0) return null

  return (
    <ul role="list" aria-label="Errores de validación">
      {errors.map((error, index) => (
        <li key={index}>{errorMessage(error)}</li>
      ))}
    </ul>
  )
}
