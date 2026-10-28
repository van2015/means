import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { Good } from '@/domain/goodStore'
import type { LineDraft } from '@/presentation/lineDraft'

@Component({
  selector: 'app-recipe-line-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <fieldset>
      <legend>{{ legend }}</legend>
      @for (line of lines; track $index; let i = $index) {
        <div>
          <label>
            Nombre del {{ lineLabel }} {{ i + 1 }}
            <input
              [attr.list]="listId"
              [ngModel]="line.goodName"
              (ngModelChange)="update.emit({ index: i, field: 'goodName', value: $event })"
              [name]="'lineGoodName' + i"
            />
          </label>
          <label>
            Cantidad del {{ lineLabel }} {{ i + 1 }}
            <input
              type="number"
              min="1"
              [ngModel]="line.quantity"
              (ngModelChange)="update.emit({ index: i, field: 'quantity', value: $event })"
              [name]="'lineQuantity' + i"
            />
          </label>
        </div>
      }
      <datalist [id]="listId">
        @for (good of goods; track good.id) {
          <option [value]="good.name"></option>
        }
      </datalist>
      <button type="button" (click)="add.emit()">Agregar {{ addButtonLabel }}</button>
    </fieldset>
  `,
})
export class RecipeLineFormComponent {
  @Input() legend = ''
  @Input() lineLabel = ''
  @Input() addButtonLabel = ''
  @Input() listId = ''
  @Input() lines: LineDraft[] = []
  @Input() goods: Good[] = []
  @Output() add = new EventEmitter<void>()
  @Output() update = new EventEmitter<{ index: number; field: keyof LineDraft; value: string }>()
}
