import { ChangeDetectorRef, Component, type OnDestroy, type OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DesignModePresenter } from '@/presentation/designModePresenter'
import { GoodsCatalogComponent } from './goods-catalog.component'
import { RecipeCatalogComponent } from './recipe-catalog.component'
import { RecipeLineFormComponent } from './recipe-line-form.component'
import { ValidationErrorsComponent } from './validation-errors.component'

@Component({
  selector: 'app-design-mode',
  standalone: true,
  imports: [
    FormsModule,
    GoodsCatalogComponent,
    RecipeCatalogComponent,
    RecipeLineFormComponent,
    ValidationErrorsComponent,
  ],
  template: `
    <div>
      <h2>Modo diseño (Angular)</h2>

      <form (ngSubmit)="presenter.submit()">
        <label>
          Nombre
          <input
            [ngModel]="presenter.name"
            (ngModelChange)="presenter.setName($event)"
            name="recipeName"
          />
        </label>

        <app-recipe-line-form
          legend="Entradas"
          lineLabel="insumo"
          addButtonLabel="entrada"
          listId="goods-list-inputs"
          [lines]="presenter.inputs"
          [goods]="presenter.goods"
          (add)="presenter.addInput()"
          (update)="presenter.updateInput($event.index, $event.field, $event.value)"
        />

        <app-recipe-line-form
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          listId="goods-list-outputs"
          [lines]="presenter.outputs"
          [goods]="presenter.goods"
          (add)="presenter.addOutput()"
          (update)="presenter.updateOutput($event.index, $event.field, $event.value)"
        />

        <button type="submit">Guardar receta</button>
      </form>

      <app-validation-errors [errors]="presenter.errors" />

      <app-recipe-catalog
        [recipes]="presenter.recipes"
        (edit)="presenter.startEdit($event)"
        (delete)="presenter.deleteRecipe($event)"
      />

      <app-goods-catalog
        [goodName]="presenter.goodName"
        [goods]="presenter.goods"
        [goodError]="presenter.goodError"
        (goodNameChange)="presenter.setGoodName($event)"
        (register)="presenter.registerGood()"
      />
    </div>
  `,
})
export class DesignModeComponent implements OnInit, OnDestroy {
  presenter = new DesignModePresenter()
  private unsubscribe: (() => void) | null = null
  private changeDetector: ChangeDetectorRef

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector
  }

  ngOnInit(): void {
    this.unsubscribe = this.presenter.subscribe(() => {
      this.changeDetector.detectChanges()
    })
  }

  ngOnDestroy(): void {
    this.unsubscribe?.()
  }
}
