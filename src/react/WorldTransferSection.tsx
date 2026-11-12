import { useRef } from 'react'
import type { Agent } from '@/domain/agentStore'
import type { Good } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'
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
      <fieldset className="line-form">
        <legend>Bienes y servicios</legend>
        {goods.length === 0 ? (
          <p>No hay bienes registrados.</p>
        ) : (
          <ul aria-label="Bienes exportables">
            {goods.map((good) => (
              <li key={good.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedGoods.includes(good.id)}
                    onChange={() => onToggleGood(good.id)}
                  />
                  {good.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <fieldset className="line-form">
        <legend>Recetas</legend>
        {recipes.length === 0 ? (
          <p>No hay recetas en el catálogo.</p>
        ) : (
          <ul aria-label="Recetas exportables">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedRecipes.includes(recipe.id)}
                    onChange={() => onToggleRecipe(recipe.id)}
                  />
                  {recipe.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <fieldset className="line-form">
        <legend>Agentes (con inventario, recetas propias y reglas)</legend>
        {agents.length === 0 ? (
          <p>No hay agentes creados.</p>
        ) : (
          <ul aria-label="Agentes exportables">
            {agents.map((agent) => (
              <li key={agent.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent.id)}
                    onChange={() => onToggleAgent(agent.id)}
                  />
                  {agent.name}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
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
