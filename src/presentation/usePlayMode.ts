import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RuleRecipeRef } from '@/domain/agent'
import type { Stores } from '@/domain/stores'
import type { ActivationStrategy } from '@/domain/strategyStore'
import { PlayModePresenter } from './playModePresenter'
import { usePresenterSync } from './usePresenterSync'

export const PLAY_TICK_MS = 1000

function playApi(presenter: PlayModePresenter) {
  return {
    agents: presenter.agents,
    catalogRecipes: presenter.catalogRecipes,
    possessedAgentId: presenter.possessedAgentId,
    possessedAgent: presenter.possessedAgent,
    error: presenter.error,
    strategy: presenter.strategy,
    // id -> name resolution stays in the presenter: the view never searches
    // the goods or recipe collections itself
    goodName: (goodId: string) => presenter.goodName(goodId),
    recipeLabel: (recipeRef: RuleRecipeRef) => presenter.recipeLabel(recipeRef),
    possess: (agentId: string) => presenter.possess(agentId),
    release: () => presenter.release(),
    setStrategy: (strategy: ActivationStrategy) => presenter.setStrategy(strategy),
    advance: () => presenter.advance(),
    priorityDraft: (ruleId: string, currentPriority: number) =>
      presenter.priorityDraft(ruleId, currentPriority),
    setPriorityDraft: (ruleId: string, value: string) => presenter.setPriorityDraft(ruleId, value),
    submitPriority: (ruleId: string) => presenter.submitPriority(ruleId),
    produce: (recipeRef: RuleRecipeRef) => presenter.produce(recipeRef),
  }
}

export function usePlayMode(stores: Stores) {
  // the presenter and the stores it mutates are captured together, so saving
  // always targets the instance the presenter actually writes to
  const [binding] = useState(() => ({ presenter: new PlayModePresenter(stores), stores }))
  const { presenter } = binding
  const [, forceUpdate] = useState({})
  const rerender = useCallback(() => forceUpdate({}), [])
  const presenterList = useMemo(() => [presenter], [presenter])

  usePresenterSync(presenterList, binding.stores, rerender)

  const strategy = presenter.strategy

  // background economy: the temporal strategy drives it with a loop while play
  // mode is mounted; the action-driven one waits for the player, and switching
  // to design mode unmounts this hook, which stops the loop either way
  useEffect(() => {
    if (strategy !== 'TEMPORAL') return
    const intervalId = setInterval(() => presenter.tick(), PLAY_TICK_MS)
    return () => clearInterval(intervalId)
  }, [presenter, strategy])

  return playApi(presenter)
}
