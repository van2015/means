import type { AgentError, RuleError } from '@/domain/agent'
import type { RecipeError } from '@/domain/recipe'
import { errorMessage } from '@/i18n/errors'

type ValidationError = RecipeError | AgentError | RuleError

export function ValidationErrors({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null

  return (
    <ul role="list" aria-label="Errores de validación">
      {errors.map((error, index) => {
        const key =
          'goodName' in error ? `${error.code}-${error.goodName}` : `${error.code}-${index}`
        return <li key={key}>{errorMessage(error)}</li>
      })}
    </ul>
  )
}
