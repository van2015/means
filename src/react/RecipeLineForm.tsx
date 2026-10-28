import type { Good } from '@/domain/goodStore'
import type { LineDraft } from '@/presentation/lineDraft'

type RecipeLineFormProps = {
  legend: string
  lineLabel: string
  addButtonLabel: string
  listId: string
  lines: LineDraft[]
  goods: Good[]
  onAdd: () => void
  onUpdate: (index: number, field: keyof LineDraft, value: string) => void
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
}: RecipeLineFormProps) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {lines.map((line, index) => (
        <div key={index}>
          <label>
            Nombre del {lineLabel} {index + 1}
            <input
              list={listId}
              value={line.goodName}
              onChange={(event) =>
                onUpdate(index, 'goodName', event.target.value)
              }
            />
          </label>
          <label>
            Cantidad del {lineLabel} {index + 1}
            <input
              value={line.quantity}
              onChange={(event) =>
                onUpdate(index, 'quantity', event.target.value)
              }
            />
          </label>
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
