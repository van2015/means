import { useEffect, useState } from 'react'
import type { RuleRecipeRef } from '@/domain/agentStore'
import type { Stores } from '@/domain/stores'
import { PlayModePresenter } from './playModePresenter'

export const PLAY_TICK_MS = 1000

export function usePlayMode(stores: Stores) {
  const [presenter] = useState(() => new PlayModePresenter(stores))
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const unsubscribe = presenter.subscribe(() => forceUpdate({}))
    return unsubscribe
  }, [presenter])

  // background economy: non-possessed agents run their automatic rules while
  // play mode is mounted; switching to design mode unmounts it and stops the loop
  useEffect(() => {
    const intervalId = setInterval(() => presenter.tick(), PLAY_TICK_MS)
    return () => clearInterval(intervalId)
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
    produce: (recipeRef: RuleRecipeRef) => presenter.produce(recipeRef),
  }
}
