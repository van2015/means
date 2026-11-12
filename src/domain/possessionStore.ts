import type { Agent } from './agent'
import type { AgentStore } from './agentStore'

export type PossessResult = { ok: true } | { ok: false; error: 'AGENT_NOT_FOUND' }

export class PossessionStore {
  private agentStore: AgentStore
  private possessedAgentIdValue: string | null = null

  constructor(agentStore: AgentStore) {
    this.agentStore = agentStore
  }

  reset(): void {
    this.possessedAgentIdValue = null
  }

  possessedAgentId(): string | null {
    return this.possessedAgentIdValue
  }

  possessed(): Agent | null {
    if (this.possessedAgentIdValue === null) return null
    const result = this.agentStore.findById(this.possessedAgentIdValue)
    return result.ok ? result.agent : null
  }

  possess(agentId: string): PossessResult {
    const result = this.agentStore.findById(agentId)
    if (!result.ok) {
      return { ok: false, error: 'AGENT_NOT_FOUND' }
    }
    this.possessedAgentIdValue = agentId
    return { ok: true }
  }

  release(): void {
    this.possessedAgentIdValue = null
  }
}
