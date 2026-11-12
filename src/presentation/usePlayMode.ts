import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RuleRecipeRef } from '@/domain/agentStore'
import type { Stores } from '@/domain/stores'
import { PlayModePresenter } from './playModePresenter'
import { usePresenterSync } from './usePresenterSync'

export const PLAY_TICK_MS = 1000

export function usePlayMode(stores: Stores) {
  // the presenter and the stores it mutates are captured together, so saving
  // always targets the instance the presenter actually writes to
  const [binding] = useState(() => ({ presenter: new PlayModePresenter(stores), stores }))
  const { presenter } = binding
  const [, forceUpdate] = useState({})
  const rerender = useCallback(() => forceUpdate({}), [])
  const presenterList = useMemo(() => [presenter], [presenter])

  usePresenterSync(presenterList, binding.stores, rerender)

  // background economy: non-possessed agents run their automatic rules while
  // play mode is mounted; switching to design mode unmounts it and stops the loop
  useEffect(() => {
    const intervalId = setInterval(() => presenter.tick(), PLAY_TICK_MS)
    return () => clearInterval(intervalId)
  }, [presenter])

  return {
    agents: presenter.agents,
    catalogRecipes: presenter.catalogRecipes,
    possessedAgentId: presenter.possessedAgentId,
    possessedAgent: presenter.possessedAgent,
    error: presenter.error,
    // id -> name resolution stays in the presenter: the view never searches
    // the goods or recipe collections itself
    goodName: (goodId: string) => presenter.goodName(goodId),
    recipeLabel: (recipeRef: RuleRecipeRef) => presenter.recipeLabel(recipeRef),
    possess: (agentId: string) => presenter.possess(agentId),
    release: () => presenter.release(),
    priorityDraft: (ruleId: string, currentPriority: number) =>
      presenter.priorityDraft(ruleId, currentPriority),
    setPriorityDraft: (ruleId: string, value: string) => presenter.setPriorityDraft(ruleId, value),
    submitPriority: (ruleId: string) => presenter.submitPriority(ruleId),
    produce: (recipeRef: RuleRecipeRef) => presenter.produce(recipeRef),
  }
}
