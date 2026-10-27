import type { AgentError } from '@/domain/agent'
import type { RecipeError } from '@/domain/recipeStore'

type ValidationError = RecipeError | AgentError

function errorMessage(error: ValidationError): string {
  switch (error.code) {
    case 'NO_INPUTS':
      return 'Se requiere al menos una entrada'
    case 'NO_OUTPUTS':
      return 'Se requiere al menos una salida'
    case 'INVALID_QUANTITY':
      return `La cantidad de ${error.goodName} debe ser mayor que cero`
    case 'RECIPE_NOT_FOUND':
      return 'Receta no encontrada'
    case 'EMPTY_NAME':
      return 'El nombre no puede estar vacío'
  }
}

export function ValidationErrors({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null

  return (
    <ul role="list" aria-label="Errores de validación">
      {errors.map((error, index) => (
        <li key={index}>{errorMessage(error)}</li>
      ))}
    </ul>
  )
}
