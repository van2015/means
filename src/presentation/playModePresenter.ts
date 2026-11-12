import type { Agent, AgentStore } from '@/domain/agentStore'
import type { PossessionStore } from '@/domain/possessionStore'
import { Presenter } from './presenter'

export class PlayModePresenter extends Presenter {
  private agentStore: AgentStore
  private possessionStore: PossessionStore
  private errorValue: string | null = null

  constructor(stores: { agentStore: AgentStore; possessionStore: PossessionStore }) {
    super()
    this.agentStore = stores.agentStore
    this.possessionStore = stores.possessionStore
  }

  get agents(): Agent[] {
    return this.agentStore.all()
  }

  get possessedAgentId(): string | null {
    return this.possessionStore.possessedAgentId()
  }

  get possessedAgent(): Agent | null {
    return this.possessionStore.possessed()
  }

  get error(): string | null {
    return this.errorValue
  }

  possess(agentId: string): void {
    const result = this.possessionStore.possess(agentId)
    this.errorValue = result.ok ? null : 'Agente no encontrado'
    this.notify()
  }

  release(): void {
    this.possessionStore.release()
    this.errorValue = null
    this.notify()
  }
}
