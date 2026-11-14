import type { AgentError } from '@/domain/agent'
import type { Good } from '@/domain/good'
import type { LineDraft, LineDraftField } from '@/presentation/lineDraft'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

type AgentFormProps = {
  name: string
  inventory: LineDraft[]
  recipesPerAction: string
  errors: AgentError[]
  goods: Good[]
  onNameChange: (name: string) => void
  onRecipesPerActionChange: (value: string) => void
  onAddLine: () => void
  onUpdateLine: (index: number, field: LineDraftField, value: string) => void
  onRemoveLine: (index: number) => void
  onSubmit: () => void
}

/** Creates an agent with its initial inventory and its action rhythm. */
export function AgentForm({
  name,
  inventory,
  recipesPerAction,
  errors,
  goods,
  onNameChange,
  onRecipesPerActionChange,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onSubmit,
}: AgentFormProps) {
  return (
    <section>
      <h3>Crear agente</h3>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label>
          Nombre del agente
          <input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label>
          Recetas por acción
          <input
            type="number"
            min={1}
            step={1}
            value={recipesPerAction}
            onChange={(event) => onRecipesPerActionChange(event.target.value)}
          />
        </label>
        <RecipeLineForm
          legend="Inventario inicial"
          lineLabel="bien"
          addButtonLabel="línea de inventario"
          listId="goods-list-agent"
          lines={inventory}
          goods={goods}
          onAdd={onAddLine}
          onUpdate={onUpdateLine}
          onRemove={onRemoveLine}
        />
        <button type="submit">Crear agente</button>
      </form>
      <ValidationErrors errors={errors} />
    </section>
  )
}
