import type { Stores } from '@/domain/stores'
import type {
  ImportResult,
  ImportSummary,
  ImportError,
  WorldSelection,
} from '@/domain/worldTransfer'
import { buildExport, importWorld, serializeExport } from '@/domain/worldTransfer'
import { Presenter } from './presenter'

export class WorldTransferPresenter extends Presenter {
  private stores: Stores
  private selectedGoodIds = new Set<string>()
  private selectedRecipeIds = new Set<string>()
  private selectedAgentIds = new Set<string>()
  private importErrorsValue: ImportError[] = []
  private importSummaryValue: ImportSummary | null = null

  constructor(stores: Stores) {
    super()
    this.stores = stores
  }

  get selectedGoods(): string[] {
    return [...this.selectedGoodIds]
  }

  get selectedRecipes(): string[] {
    return [...this.selectedRecipeIds]
  }

  get selectedAgents(): string[] {
    return [...this.selectedAgentIds]
  }

  get selectedCount(): number {
    return this.selectedGoodIds.size + this.selectedRecipeIds.size + this.selectedAgentIds.size
  }

  get canExport(): boolean {
    return this.selectedCount > 0
  }

  get importErrors(): ImportError[] {
    return this.importErrorsValue
  }

  get importSummary(): ImportSummary | null {
    return this.importSummaryValue
  }

  toggleGood(id: string): void {
    this.toggle(this.selectedGoodIds, id)
  }

  toggleRecipe(id: string): void {
    this.toggle(this.selectedRecipeIds, id)
  }

  toggleAgent(id: string): void {
    this.toggle(this.selectedAgentIds, id)
  }

  exportJson(): string | null {
    if (!this.canExport) return null
    const selection: WorldSelection = {
      goodIds: this.selectedGoods,
      recipeIds: this.selectedRecipes,
      agentIds: this.selectedAgents,
    }
    return serializeExport(buildExport(this.stores, selection))
  }

  importJson(json: string): void {
    const result: ImportResult = importWorld(this.stores, json)
    if (result.ok) {
      this.importSummaryValue = result.summary
      this.importErrorsValue = []
    } else {
      this.importSummaryValue = null
      this.importErrorsValue = result.errors
    }
    this.notify()
  }

  clearResult(): void {
    this.importSummaryValue = null
    this.importErrorsValue = []
    this.notify()
  }

  private toggle(set: Set<string>, id: string): void {
    if (set.has(id)) {
      set.delete(id)
    } else {
      set.add(id)
    }
    this.notify()
  }
}
