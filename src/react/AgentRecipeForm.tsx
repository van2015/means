import type { Good } from '@/domain/goodStore'
import type { RecipeError } from '@/domain/recipe'
import type { LineDraft, LineDraftField } from '@/presentation/lineDraft'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

type AgentRecipeFormProps = {
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

export function AgentRecipeForm({
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
}: AgentRecipeFormProps) {
  return (
    <section>
      <h3>Receta propia del agente</h3>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label>
          Nombre de la receta del agente
          <input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <RecipeLineForm
          legend="Entradas"
          lineLabel="insumo de receta del agente"
          addButtonLabel="entrada de receta del agente"
          listId="goods-list-agent-recipe-inputs"
          lines={inputs}
          goods={goods}
          onAdd={onAddInput}
          onUpdate={onUpdateInput}
          onRemove={onRemoveInput}
        />
        <RecipeLineForm
          legend="Salidas"
          lineLabel="producto de receta del agente"
          addButtonLabel="salida de receta del agente"
          listId="goods-list-agent-recipe-outputs"
          lines={outputs}
          goods={goods}
          onAdd={onAddOutput}
          onUpdate={onUpdateOutput}
          onRemove={onRemoveOutput}
        />
        <button type="submit">Guardar receta del agente</button>
      </form>
      <ValidationErrors errors={errors} />
    </section>
  )
}
