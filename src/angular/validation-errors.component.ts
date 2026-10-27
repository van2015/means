import { Component, Input } from '@angular/core'
import type { RecipeError } from '@/domain/recipeStore'

@Component({
  selector: 'app-validation-errors',
  standalone: true,
  imports: [],
  template: `
    @if (errors.length > 0) {
      <ul aria-label="Errores de validación">
        @for (error of errors; track $index) {
          <li>{{ errorMessage(error) }}</li>
        }
      </ul>
    }
  `,
})
export class ValidationErrorsComponent {
  @Input() errors: RecipeError[] = []

  errorMessage(error: RecipeError): string {
    switch (error.code) {
      case 'NO_INPUTS':
        return 'Se requiere al menos una entrada'
      case 'NO_OUTPUTS':
        return 'Se requiere al menos una salida'
      case 'INVALID_QUANTITY':
        return `La cantidad de ${error.goodName} debe ser mayor que cero`
      case 'RECIPE_NOT_FOUND':
        return 'Receta no encontrada'
    }
  }
}
