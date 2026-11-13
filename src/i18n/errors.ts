import type { AgentError, ProductionError, RuleError } from '@/domain/agent'
import type { RecipeError } from '@/domain/recipe'
import type { ImportError } from '@/domain/worldTransfer'

type ValidationError = RecipeError | AgentError | RuleError | ProductionError

export function errorMessage(error: ValidationError): string {
  switch (error.code) {
    case 'NO_INPUTS':
      return 'Se requiere al menos una entrada'
    case 'NO_OUTPUTS':
      return 'Se requiere al menos una salida'
    case 'INVALID_QUANTITY':
      return `La cantidad de ${error.goodName} debe ser mayor que cero`
    case 'UNKNOWN_GOOD':
      return `El bien "${error.goodName}" no está registrado`
    case 'RECIPE_NAME_EXISTS':
      return 'Ya existe una receta con ese nombre'
    case 'RECIPE_NOT_FOUND':
      return 'Receta no encontrada'
    case 'EMPTY_NAME':
      return 'El nombre no puede estar vacío'
    case 'AGENT_NAME_EXISTS':
      return 'Ya existe un agente con ese nombre'
    case 'INVALID_RECIPES_PER_ACTION':
      return 'Las recetas por acción deben ser un número entero mayor que cero'
    case 'NO_RECIPE':
      return 'Se requiere una receta'
    case 'NO_CONDITION_GOOD':
      return 'Se requiere un bien para la condición'
    case 'UNKNOWN_CONDITION_GOOD':
      return 'El bien de la condición no está registrado'
    case 'INVALID_CONDITION_QUANTITY':
      return 'La cantidad de la condición debe ser mayor que cero'
    case 'INVALID_PRIORITY':
      return 'La prioridad debe ser un número válido'
    case 'AGENT_NOT_FOUND':
      return 'Agente no encontrado'
    case 'RULE_NOT_FOUND':
      return 'Regla no encontrada'
    case 'INSUFFICIENT_GOOD':
      return `Falta ${error.goodName}: necesitas ${error.required}, tienes ${error.available}`
  }
}

export function importErrorMessage(error: ImportError): string {
  switch (error.code) {
    case 'INVALID_JSON':
      return 'El archivo no es un JSON válido'
    case 'UNSUPPORTED_VERSION':
      return `Versión de archivo no soportada: ${JSON.stringify(error.version)}`
    case 'INVALID_STRUCTURE':
      return error.path === ''
        ? 'El archivo no tiene la estructura de un mundo exportado'
        : `Estructura inválida en "${error.path}"`
    case 'DUPLICATE_NAME':
      return `El archivo contiene ${error.kind}s duplicados: "${error.name}"`
    case 'MISSING_REFERENCE':
      return `El ${error.kind} "${error.name}" referenciado por ${error.source} "${error.sourceName}" no existe ni en el archivo ni en el mundo`
  }
}
