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
    possessedAgentId: presenter.possessedAgentId,
    possessedAgent: presenter.possessedAgent,
    error: presenter.error,
    possess: (agentId: string) => presenter.possess(agentId),
    release: () => presenter.release(),
  }
}
