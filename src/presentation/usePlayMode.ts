import { useEffect, useState } from 'react'
import type { Stores } from '@/domain/stores'
import { PlayModePresenter } from './playModePresenter'

export function usePlayMode(stores: Stores) {
  const [presenter] = useState(() => new PlayModePresenter(stores))
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const unsubscribe = presenter.subscribe(() => forceUpdate({}))
    return unsubscribe
  }, [presenter])

  return {
    agents: presenter.agents,
    goods: presenter.goods,
    catalogRecipes: presenter.catalogRecipes,
    possessedAgentId: presenter.possessedAgentId,
    possessedAgent: presenter.possessedAgent,
    error: presenter.error,
    possess: (agentId: string) => presenter.possess(agentId),
    release: () => presenter.release(),
    priorityDraft: (ruleId: string, currentPriority: number) =>
      presenter.priorityDraft(ruleId, currentPriority),
    setPriorityDraft: (ruleId: string, value: string) => presenter.setPriorityDraft(ruleId, value),
    submitPriority: (ruleId: string) => presenter.submitPriority(ruleId),
  }
}
