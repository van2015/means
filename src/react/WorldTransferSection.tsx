import { useRef } from 'react'
import type { Agent } from '@/domain/agent'
import type { Good } from '@/domain/good'
import type { Recipe } from '@/domain/recipe'
import type { ImportError, ImportSummary } from '@/domain/worldTransfer'
import { importErrorMessage } from '@/i18n/errors'
import { downloadJson } from './download'

type WorldTransferSectionProps = {
  goods: Good[]
  recipes: Recipe[]
  agents: Agent[]
  selectedGoods: string[]
  selectedRecipes: string[]
  selectedAgents: string[]
  selectedCount: number
  canExport: boolean
  importErrors: ImportError[]
  importSummary: ImportSummary | null
  onToggleGood: (id: string) => void
  onToggleRecipe: (id: string) => void
  onToggleAgent: (id: string) => void
  exportJson: () => string | null
  onImport: (json: string) => void
}

function summaryText(summary: ImportSummary): string {
  const added =
    summary.goods.added + summary.recipes.added + summary.agents.added + summary.rules.added
  const skipped =
    summary.goods.skipped + summary.recipes.skipped + summary.agents.skipped + summary.rules.skipped
  const base = `Se importaron ${added} elementos`
  return skipped > 0 ? `${base} y se omitieron ${skipped} por ya existir.` : `${base}.`
}

type CheckableItem = { id: string; name: string }

type TransferChecklistProps<T extends CheckableItem> = {
  legend: string
  emptyMessage: string
  ariaLabel: string
  items: T[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

/** One selectable catalog (goods, recipes or agents) of the export section. */
function TransferChecklist<T extends CheckableItem>({
  legend,
  emptyMessage,
  ariaLabel,
  items,
  selectedIds,
  onToggle,
}: TransferChecklistProps<T>) {
  return (
    <fieldset className="line-form">
      <legend>{legend}</legend>
      {items.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <ul aria-label={ariaLabel}>
          {items.map((item) => (
            <li key={item.id}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                />
                {item.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}

export function WorldTransferSection({
  goods,
  recipes,
  agents,
  selectedGoods,
  selectedRecipes,
  selectedAgents,
  selectedCount,
  canExport,
  importErrors,
  importSummary,
  onToggleGood,
  onToggleRecipe,
  onToggleAgent,
  exportJson,
  onImport,
}: WorldTransferSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const json = exportJson()
    if (json === null) return
    downloadJson('means-mundo.json', json)
  }

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    file.text().then((text) => {
      onImport(text)
      // reset so the same file can be imported again
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <section>
      <h3>Exportar / importar mundo</h3>
      <p>
        La exportación incluye las dependencias de lo seleccionado (bienes que usan las recetas,
        recetas que usan las reglas de los agentes, etc.).
      </p>
      <TransferChecklist
        legend="Bienes y servicios"
        emptyMessage="No hay bienes registrados."
        ariaLabel="Bienes exportables"
        items={goods}
        selectedIds={selectedGoods}
        onToggle={onToggleGood}
      />
      <TransferChecklist
        legend="Recetas"
        emptyMessage="No hay recetas en el catálogo."
        ariaLabel="Recetas exportables"
        items={recipes}
        selectedIds={selectedRecipes}
        onToggle={onToggleRecipe}
      />
      <TransferChecklist
        legend="Agentes (con inventario, recetas propias y reglas)"
        emptyMessage="No hay agentes creados."
        ariaLabel="Agentes exportables"
        items={agents}
        selectedIds={selectedAgents}
        onToggle={onToggleAgent}
      />
      <button type="button" disabled={!canExport} onClick={handleExport}>
        Exportar selección ({selectedCount})
      </button>
      <label>
        Importar archivo
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
        />
      </label>
      {importSummary && <p role="status">{summaryText(importSummary)}</p>}
      {importErrors.length > 0 && (
        <ul role="list" aria-label="Errores de importación">
          {importErrors.map((error, index) => (
            <li key={`${error.code}-${index}`}>{importErrorMessage(error)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
