import { Component, Input } from '@angular/core'
import type { RecipeError } from '@/domain/recipe'
import { errorMessage } from '@/i18n/errors'

@Component({
  selector: 'app-validation-errors',
  standalone: true,
  imports: [],
  template: `
    @if (errors.length > 0) {
      <ul aria-label="Errores de validación">
        @for (error of errors; track error) {
          <li>{{ messageFor(error) }}</li>
        }
      </ul>
    }
  `,
})
export class ValidationErrorsComponent {
  @Input() errors: RecipeError[] = []

  messageFor(error: RecipeError): string {
    return errorMessage(error)
  }
}
