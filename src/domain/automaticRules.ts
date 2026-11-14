import type { Agent, Rule } from './agent'
import { applicableRules } from './ruleEngine'
import type { AgentStore } from './agentStore'

export type AutomaticProduction = { agentId: string; ruleId: string }

/**
 * Runs each agent's automatic rules up to its own `recipesPerAction` limit.
 * `excludeAgentId` skips the possessed agent (null ⇒ nobody is skipped).
 * Before every recipe the condition is re-evaluated against the fresh
 * inventory, so a rule that no longer applies yields to the next priority
 * and an agent with nothing executable stops early instead of looping.
 */
export function runAutomaticRules(
  store: AgentStore,
  excludeAgentId: string | null,
): AutomaticProduction[] {
  const executed: AutomaticProduction[] = []

  // iterate over a copy: produce() replaces elements of the store
  for (const agent of [...store.all()]) {
    if (agent.id === excludeAgentId) continue
    executed.push(...runAgentRules(store, agent))
  }

  return executed
}

/** Runs one agent's rules until its budget or its material runs out. */
function runAgentRules(store: AgentStore, agent: Agent): AutomaticProduction[] {
  const executed: AutomaticProduction[] = []
  let done = 0
  while (done < agent.recipesPerAction) {
    // produce() swaps the agent object: re-read it on every round
    const current = store.findById(agent.id)
    if (!current.ok) break

    const rule = runNextRule(store, current.agent)
    if (rule === null) break // no material, condition unmet or recipe deleted

    executed.push({ agentId: agent.id, ruleId: rule.id })
    done++
  }
  return executed
}

/** Executes the highest-priority applicable rule; null when none can run. */
function runNextRule(store: AgentStore, agent: Agent): Rule | null {
  for (const rule of applicableRules(agent)) {
    const result = store.produce(agent.id, rule.recipeRef)
    if (result.ok) return rule
    // insufficient material or a deleted recipe: silently try the next rule
  }
  return null
}
