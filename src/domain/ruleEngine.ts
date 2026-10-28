import type { Agent } from './agent'
import type { Rule } from './agent'

export function evaluateRule(agent: Agent, rule: Rule): boolean {
  const quantity = agent.quantityOf(rule.condition.goodId)
  const threshold = rule.condition.quantity

  switch (rule.condition.operator) {
    case 'AT_LEAST':
      return quantity >= threshold
    case 'LESS_THAN':
      return quantity < threshold
  }
}

export function applicableRules(agent: Agent): Rule[] {
  return agent.rules.filter((rule) => evaluateRule(agent, rule))
}
