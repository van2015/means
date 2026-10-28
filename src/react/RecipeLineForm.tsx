import type { Good } from '@/domain/goodStore'
import type { LineDraft, LineDraftField } from '@/presentation/lineDraft'

type RecipeLineFormProps = {
  legend: string
  lineLabel: string
  addButtonLabel: string
  listId: string
  lines: LineDraft[]
  goods: Good[]
  onAdd: () => void
  onUpdate: (index: number, field: LineDraftField, value: string) => void
  onRemove?: (index: number) => void
}

export function RecipeLineForm({
  legend,
  lineLabel,
  addButtonLabel,
  listId,
  lines,
  goods,
  onAdd,
  onUpdate,
  onRemove,
}: RecipeLineFormProps) {
  return (
    <fieldset className="line-form">
      <legend>{legend}</legend>
      {lines.map((line, index) => (
        <div className="line-row" key={line.id}>
          <label>
            Nombre del {lineLabel} {index + 1}
            <input
              list={listId}
              value={line.goodName}
              onChange={(event) => onUpdate(index, 'goodName', event.target.value)}
            />
          </label>
          <label>
            Cantidad del {lineLabel} {index + 1}
            <input
              type="number"
              min="1"
              value={line.quantity}
              onChange={(event) => onUpdate(index, 'quantity', event.target.value)}
            />
          </label>
          {onRemove && (
            <button type="button" onClick={() => onRemove(index)}>
              Eliminar {lineLabel} {index + 1}
            </button>
          )}
        </div>
      ))}
      <datalist id={listId}>
        {goods.map((good) => (
          <option key={good.id} value={good.name} />
        ))}
      </datalist>
      <button type="button" onClick={onAdd}>
        Agregar {addButtonLabel}
      </button>
    </fieldset>
  )
}
