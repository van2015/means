import type { AgentError } from '@/domain/agent'
import type { Good } from '@/domain/goodStore'
import type { LineDraft, LineDraftField } from '@/presentation/lineDraft'
import { RecipeLineForm } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

type AgentFormProps = {
  name: string
  inventory: LineDraft[]
  errors: AgentError[]
  goods: Good[]
  onNameChange: (name: string) => void
  onAddLine: () => void
  onUpdateLine: (index: number, field: LineDraftField, value: string) => void
  onRemoveLine: (index: number) => void
  onSubmit: () => void
}

/** Creates an agent with its initial inventory. */
export function AgentForm({
  name,
  inventory,
  errors,
  goods,
  onNameChange,
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
