import { Component, EventEmitter, Input, Output } from '@angular/core'
import type { Good } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'

@Component({
  selector: 'app-recipe-catalog',
  standalone: true,
  imports: [],
  template: `
    <section>
      <h3>Catálogo de recetas</h3>
      <ul>
        @for (recipe of recipes; track recipe.id) {
          <li>
            {{ recipe.name }}
            <button type="button" (click)="edit.emit(recipe)">Editar</button>
            <button type="button" (click)="delete.emit(recipe.id)">Eliminar</button>
            <ul>
              @for (line of recipe.inputs; track $index) {
                <li>Insumo: {{ goodName(line.goodId) }}: {{ line.quantity }}</li>
              }
              @for (line of recipe.outputs; track $index) {
                <li>Producto: {{ goodName(line.goodId) }}: {{ line.quantity }}</li>
              }
            </ul>
          </li>
        }
      </ul>
    </section>
  `,
})
export class RecipeCatalogComponent {
  @Input() recipes: Recipe[] = []
  @Input() goods: Good[] = []
  @Output() edit = new EventEmitter<Recipe>()
  @Output() delete = new EventEmitter<string>()

  goodName(goodId: string): string {
    return this.goods.find((g) => g.id === goodId)?.name ?? ''
  }
}
