import { useEffect, useState } from 'react'
import type { Rule, RuleRecipeRef } from '@/domain/agent'
import type { Recipe } from '@/domain/recipeStore'
import { DesignModePresenter } from '@/presentation/designModePresenter'
import type { LineDraft } from '@/presentation/designModePresenter'

export function useDesignMode() {
  const [presenter] = useState(() => new DesignModePresenter())
  const [, forceUpdate] = useState({})

  useEffect(() => {
    return presenter.subscribe(() => forceUpdate({}))
  }, [presenter])

  return {
    name: presenter.name,
    inputs: presenter.inputs,
    outputs: presenter.outputs,
    recipes: presenter.recipes,
    errors: presenter.errors,
    goodName: presenter.goodName,
    goods: presenter.goods,
    goodError: presenter.goodError,
    agentName: presenter.agentName,
    agentInventory: presenter.agentInventory,
    agents: presenter.agents,
    agentErrors: presenter.agentErrors,
    selectedAgentId: presenter.selectedAgentId,
    selectedAgentView: presenter.selectedAgentView,
    agentRecipeName: presenter.agentRecipeName,
    agentRecipeInputs: presenter.agentRecipeInputs,
    agentRecipeOutputs: presenter.agentRecipeOutputs,
    agentRecipeErrors: presenter.agentRecipeErrors,
    agentRecipeEditingId: presenter.agentRecipeEditingId,
    agentRuleRecipeRef: presenter.agentRuleRecipeRef,
    agentRuleConditionGoodName: presenter.agentRuleConditionGoodName,
    agentRuleConditionQuantity: presenter.agentRuleConditionQuantity,
    agentRuleConditionOperator: presenter.agentRuleConditionOperator,
    agentRulePriority: presenter.agentRulePriority,
    agentRuleErrors: presenter.agentRuleErrors,
    agentRuleEditingId: presenter.agentRuleEditingId,
    setName: (name: string) => presenter.setName(name),
    addInput: () => presenter.addInput(),
    updateInput: (index: number, field: keyof LineDraft, value: string) =>
      presenter.updateInput(index, field, value),
    addOutput: () => presenter.addOutput(),
    updateOutput: (index: number, field: keyof LineDraft, value: string) =>
      presenter.updateOutput(index, field, value),
    deleteRecipe: (id: string) => presenter.deleteRecipe(id),
    startEdit: (recipe: Recipe) => presenter.startEdit(recipe),
    submit: () => presenter.submit(),
    setGoodName: (name: string) => presenter.setGoodName(name),
    registerGood: () => presenter.registerGood(),
    setAgentName: (name: string) => presenter.setAgentName(name),
    addAgentInventoryLine: () => presenter.addAgentInventoryLine(),
    updateAgentInventoryLine: (index: number, field: keyof LineDraft, value: string) =>
      presenter.updateAgentInventoryLine(index, field, value),
    submitAgent: () => presenter.submitAgent(),
    selectAgent: (agentId: string) => presenter.selectAgent(agentId),
    selectAgentRules: (agentId: string) => presenter.selectAgentRules(agentId),
    setAgentRecipeName: (name: string) => presenter.setAgentRecipeName(name),
    addAgentRecipeInput: () => presenter.addAgentRecipeInput(),
    updateAgentRecipeInput: (index: number, field: keyof LineDraft, value: string) =>
      presenter.updateAgentRecipeInput(index, field, value),
    addAgentRecipeOutput: () => presenter.addAgentRecipeOutput(),
    updateAgentRecipeOutput: (index: number, field: keyof LineDraft, value: string) =>
      presenter.updateAgentRecipeOutput(index, field, value),
    submitAgentRecipe: () => presenter.submitAgentRecipe(),
    startEditAgentRecipe: (recipe: Recipe) => presenter.startEditAgentRecipe(recipe),
    deleteAgentRecipe: (recipeId: string) => presenter.deleteAgentRecipe(recipeId),
    setAgentRuleRecipeRef: (ref: RuleRecipeRef) => presenter.setAgentRuleRecipeRef(ref),
    setAgentRuleConditionGoodName: (name: string) => presenter.setAgentRuleConditionGoodName(name),
    setAgentRuleConditionQuantity: (value: string) => presenter.setAgentRuleConditionQuantity(value),
    setAgentRuleConditionOperator: (operator: 'AT_LEAST' | 'LESS_THAN') =>
      presenter.setAgentRuleConditionOperator(operator),
    setAgentRulePriority: (value: string) => presenter.setAgentRulePriority(value),
    submitAgentRule: () => presenter.submitAgentRule(),
    startEditAgentRule: (rule: Rule) => presenter.startEditAgentRule(rule),
    deleteAgentRule: (ruleId: string) => presenter.deleteAgentRule(ruleId),
  }
}
