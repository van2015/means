import { Agent, validateAgent } from './agent'
import type { AgentDraft, AgentResult } from './agent'
import type { GoodStore } from './goodStore'
import { goodStore } from './goodStore'

export class AgentStore {
  private agents: Agent[] = []
  private goodStore: GoodStore

  constructor(goodStore: GoodStore) {
    this.goodStore = goodStore
  }

  reset(): void {
    this.agents = []
  }

  count(): number {
    return this.agents.length
  }

  all(): Agent[] {
    return this.agents
  }

  findByName(name: string): Agent | undefined {
    return this.agents.find((a) => a.name === name)
  }

  create(draft: AgentDraft): AgentResult {
    const errors = validateAgent(draft.name, draft.inventory)

    if (errors.length > 0) {
      return { ok: false, errors }
    }

    const agent = new Agent(
      generateId(),
      draft.name,
      draft.inventory.map((line) => ({
        goodId: this.goodStore.resolve(line.goodName).id,
        quantity: line.quantity,
      })),
    )
    this.agents.push(agent)
    return { ok: true, agent }
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2)
}

export const agentStore = new AgentStore(goodStore)

export type { Agent, AgentDraft, AgentError } from './agent'
