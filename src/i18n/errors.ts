import type { AgentError, RuleError } from '@/domain/agent'
import type { RecipeError } from '@/domain/recipe'

type ValidationError = RecipeError | AgentError | RuleError

export function errorMessage(error: ValidationError): string {
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
    case 'NO_RECIPE':
      return 'Se requiere una receta'
    case 'NO_CONDITION_GOOD':
      return 'Se requiere un bien para la condición'
    case 'INVALID_CONDITION_QUANTITY':
      return 'La cantidad de la condición debe ser mayor que cero'
  }
}
