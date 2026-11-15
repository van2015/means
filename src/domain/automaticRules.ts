import type { Agent, Rule } from './agent'

export type AutomaticProduction = { agentId: string; ruleId: string }

/**
 * The store operations the automatic-rule pass needs. Declared here instead of
 * importing `AgentStore`, so the store can depend on this orchestrator without
 * the two modules depending on each other. `AgentStore` satisfies it.
 */
export type RuleRunner = {
  /** Every stored agent but the excluded one, snapshotted for this pass. */
  runnableAgents(excludeAgentId: string | null): Agent[]
  /** Executes the agent's highest-priority applicable rule; null when none runs. */
  runNextRule(agentId: string): Rule | null
}

/**
 * Runs each agent's automatic rules up to its own `recipesPerAction` limit.
 * `excludeAgentId` skips the possessed agent (null ⇒ nobody is skipped).
 * Before every recipe the condition is re-evaluated against the fresh
 * inventory, so a rule that no longer applies yields to the next priority
 * and an agent with nothing executable stops early instead of looping.
 */
export function runAutomaticRules(
  runner: RuleRunner,
  excludeAgentId: string | null,
): AutomaticProduction[] {
  const executed: AutomaticProduction[] = []

  for (const agent of runner.runnableAgents(excludeAgentId)) {
    executed.push(...runAgentRules(runner, agent))
  }

  return executed
}

/** Runs one agent's rules until its budget or its material runs out. */
function runAgentRules(runner: RuleRunner, agent: Agent): AutomaticProduction[] {
  const executed: AutomaticProduction[] = []

  for (let done = 0; done < agent.recipesPerAction; done++) {
    const rule = runner.runNextRule(agent.id)
    if (rule === null) break // no material, condition unmet or recipe deleted
    executed.push({ agentId: agent.id, ruleId: rule.id })
  }

  return executed
}
