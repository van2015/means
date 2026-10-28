import { Component, EventEmitter, Input, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { Good } from '@/domain/goodStore'

@Component({
  selector: 'app-goods-catalog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h3>Catálogo de bienes y servicios</h3>
      <form (ngSubmit)="register.emit()">
        <label>
          Bien o servicio
          <input
            [ngModel]="goodName"
            (ngModelChange)="goodNameChange.emit($event)"
            name="goodName"
          />
        </label>
        <button type="submit">Registrar bien o servicio</button>
      </form>
      @if (goodError) {
        <p>{{ goodError }}</p>
      }
      <ul>
        @for (good of goods; track good.id) {
          <li>{{ good.name }}</li>
        }
      </ul>
    </section>
  `,
})
export class GoodsCatalogComponent {
  @Input() goodName = ''
  @Input() goods: Good[] = []
  @Input() goodError: string | null = null
  @Output() goodNameChange = new EventEmitter<string>()
  @Output() register = new EventEmitter<void>()
}
