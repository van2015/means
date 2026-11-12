import type { Good } from '@/domain/goodStore'
import type { RecipeError } from '@/domain/recipe'
import type { LineDraft, LineDraftField } from '@/presentation/lineDraft'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

type RecipeFormProps = {
  name: string
  inputs: LineDraft[]
  outputs: LineDraft[]
  errors: RecipeError[]
  goods: Good[]
  onNameChange: (name: string) => void
  onAddInput: () => void
  onUpdateInput: (index: number, field: LineDraftField, value: string) => void
  onRemoveInput: (index: number) => void
  onAddOutput: () => void
  onUpdateOutput: (index: number, field: LineDraftField, value: string) => void
  onRemoveOutput: (index: number) => void
  onSubmit: () => void
}

/** Creates or edits a catalog recipe. */
export function RecipeForm({
  name,
  inputs,
  outputs,
  errors,
  goods,
  onNameChange,
  onAddInput,
  onUpdateInput,
  onRemoveInput,
  onAddOutput,
  onUpdateOutput,
  onRemoveOutput,
  onSubmit,
}: RecipeFormProps) {
  return (
    <>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label>
          Nombre
          <input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <RecipeLineForm
          legend="Entradas"
          lineLabel="insumo"
          addButtonLabel="entrada"
          listId="goods-list-inputs"
          lines={inputs}
          goods={goods}
          onAdd={onAddInput}
          onUpdate={onUpdateInput}
          onRemove={onRemoveInput}
        />
        <RecipeLineForm
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          listId="goods-list-outputs"
          lines={outputs}
          goods={goods}
          onAdd={onAddOutput}
          onUpdate={onUpdateOutput}
          onRemove={onRemoveOutput}
        />
        <button type="submit">Guardar receta</button>
      </form>
      <ValidationErrors errors={errors} />
    </>
  )
}
