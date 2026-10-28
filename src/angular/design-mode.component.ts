import { ChangeDetectorRef, Component, type OnDestroy, type OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { createStores, type Stores } from '@/domain/stores'
import { GoodPresenter } from '@/presentation/goodPresenter'
import { RecipePresenter } from '@/presentation/recipePresenter'
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

      <form novalidate (ngSubmit)="recipePresenter.submit()">
        <label>
          Nombre
          <input
            [ngModel]="recipePresenter.name"
            (ngModelChange)="recipePresenter.setName($event)"
            name="recipeName"
          />
        </label>

        <app-recipe-line-form
          legend="Entradas"
          lineLabel="insumo"
          addButtonLabel="entrada"
          listId="goods-list-inputs"
          [lines]="recipePresenter.inputs"
          [goods]="recipePresenter.goods"
          (add)="recipePresenter.addInput()"
          (update)="recipePresenter.updateInput($event.index, $event.field, $event.value)"
        />

        <app-recipe-line-form
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          listId="goods-list-outputs"
          [lines]="recipePresenter.outputs"
          [goods]="recipePresenter.goods"
          (add)="recipePresenter.addOutput()"
          (update)="recipePresenter.updateOutput($event.index, $event.field, $event.value)"
        />

        <button type="submit">Guardar receta</button>
      </form>

      <app-validation-errors [errors]="recipePresenter.errors" />

      <app-recipe-catalog
        [recipes]="recipePresenter.recipes"
        [goods]="recipePresenter.goods"
        (edit)="recipePresenter.startEdit($event)"
        (delete)="recipePresenter.deleteRecipe($event)"
      />

      <app-goods-catalog
        [goodName]="goodPresenter.goodName"
        [goods]="goodPresenter.goods"
        [goodError]="goodPresenter.goodError"
        (goodNameChange)="goodPresenter.setGoodName($event)"
        (register)="goodPresenter.registerGood()"
      />
    </div>
  `,
})
export class DesignModeComponent implements OnInit, OnDestroy {
  private stores: Stores
  recipePresenter: RecipePresenter
  goodPresenter: GoodPresenter
  private unsubscribe: (() => void) | null = null
  private changeDetector: ChangeDetectorRef

  constructor(changeDetector: ChangeDetectorRef) {
    this.changeDetector = changeDetector
    this.stores = createStores()
    this.recipePresenter = new RecipePresenter(this.stores)
    this.goodPresenter = new GoodPresenter(this.stores)
  }

  ngOnInit(): void {
    const notify = () => {
      this.changeDetector.detectChanges()
    }
    const unsubscribeRecipe = this.recipePresenter.subscribe(notify)
    const unsubscribeGood = this.goodPresenter.subscribe(notify)
    this.unsubscribe = () => {
      unsubscribeRecipe()
      unsubscribeGood()
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.()
  }
}
