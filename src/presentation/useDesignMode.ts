import { useEffect, useState } from 'react'
import type { Rule, RuleRecipeRef } from '@/domain/agent'
import type { Stores } from '@/domain/stores'
import { AgentPresenter } from './agentPresenter'
import { AgentRecipePresenter } from './agentRecipePresenter'
import { AgentRulePresenter } from './agentRulePresenter'
import { GoodPresenter } from './goodPresenter'
import type { LineDraft } from './lineDraft'
import { RecipePresenter } from './recipePresenter'

export function useDesignMode(stores: Stores) {
  const [recipePresenter] = useState(() => new RecipePresenter(stores))
  const [goodPresenter] = useState(() => new GoodPresenter(stores))
  const [agentPresenter] = useState(() => new AgentPresenter({ agentStore: stores.agentStore }))
  const [agentRecipePresenter] = useState(() => new AgentRecipePresenter(stores))
  const [agentRulePresenter] = useState(() => new AgentRulePresenter(stores))
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const presenters = [
      recipePresenter,
      goodPresenter,
      agentPresenter,
      agentRecipePresenter,
      agentRulePresenter,
    ]
    const unsubscribes = presenters.map((presenter) => presenter.subscribe(() => forceUpdate({})))
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [recipePresenter, goodPresenter, agentPresenter, agentRecipePresenter, agentRulePresenter])

  const selectAgent = (agentId: string) => {
    agentPresenter.selectAgent(agentId)
    agentRecipePresenter.setAgentId(agentId)
    agentRulePresenter.setAgentId(null)
  }

  const selectAgentRules = (agentId: string) => {
    agentPresenter.selectAgentRules(agentId)
    agentRecipePresenter.setAgentId(null)
    agentRulePresenter.setAgentId(agentId)
  }

  return {
    name: recipePresenter.name,
    inputs: recipePresenter.inputs,
    outputs: recipePresenter.outputs,
    recipes: recipePresenter.recipes,
    errors: recipePresenter.errors,
    goodName: goodPresenter.goodName,
    goods: goodPresenter.goods,
    goodError: goodPresenter.goodError,
    agentName: agentPresenter.name,
    agentInventory: agentPresenter.inventory,
    agents: agentPresenter.agents,
    agentErrors: agentPresenter.errors,
    selectedAgentId: agentPresenter.selectedAgentId,
    selectedAgentView: agentPresenter.selectedAgentView,
    agentRecipeName: agentRecipePresenter.name,
    agentRecipeInputs: agentRecipePresenter.inputs,
    agentRecipeOutputs: agentRecipePresenter.outputs,
    agentRecipeErrors: agentRecipePresenter.errors,
    agentRecipeEditingId: agentRecipePresenter.editingId,
    agentRuleRecipeRef: agentRulePresenter.recipeRef,
    agentRuleConditionGoodId: agentRulePresenter.conditionGoodId,
    agentRuleConditionQuantity: agentRulePresenter.conditionQuantity,
    agentRuleConditionOperator: agentRulePresenter.conditionOperator,
    agentRulePriority: agentRulePresenter.priority,
    agentRuleErrors: agentRulePresenter.errors,
    agentRuleEditingId: agentRulePresenter.editingId,
    setName: (name: string) => recipePresenter.setName(name),
    addInput: () => recipePresenter.addInput(),
    updateInput: (index: number, field: keyof LineDraft, value: string) =>
      recipePresenter.updateInput(index, field, value),
    removeInput: (index: number) => recipePresenter.removeInput(index),
    addOutput: () => recipePresenter.addOutput(),
    updateOutput: (index: number, field: keyof LineDraft, value: string) =>
      recipePresenter.updateOutput(index, field, value),
    removeOutput: (index: number) => recipePresenter.removeOutput(index),
    deleteRecipe: (id: string) => recipePresenter.deleteRecipe(id),
    startEdit: (recipe: Parameters<RecipePresenter['startEdit']>[0]) =>
      recipePresenter.startEdit(recipe),
    submit: () => recipePresenter.submit(),
    setGoodName: (name: string) => goodPresenter.setGoodName(name),
    registerGood: () => goodPresenter.registerGood(),
    setAgentName: (name: string) => agentPresenter.setName(name),
    addAgentInventoryLine: () => agentPresenter.addInventoryLine(),
    updateAgentInventoryLine: (index: number, field: keyof LineDraft, value: string) =>
      agentPresenter.updateInventoryLine(index, field, value),
    submitAgent: () => agentPresenter.submit(),
    selectAgent,
    selectAgentRules,
    setAgentRecipeName: (name: string) => agentRecipePresenter.setName(name),
    addAgentRecipeInput: () => agentRecipePresenter.addInput(),
    updateAgentRecipeInput: (index: number, field: keyof LineDraft, value: string) =>
      agentRecipePresenter.updateInput(index, field, value),
    addAgentRecipeOutput: () => agentRecipePresenter.addOutput(),
    updateAgentRecipeOutput: (index: number, field: keyof LineDraft, value: string) =>
      agentRecipePresenter.updateOutput(index, field, value),
    submitAgentRecipe: () => agentRecipePresenter.submit(),
    startEditAgentRecipe: (recipe: Parameters<AgentRecipePresenter['startEdit']>[0]) =>
      agentRecipePresenter.startEdit(recipe),
    deleteAgentRecipe: (recipeId: string) => agentRecipePresenter.deleteRecipe(recipeId),
    setAgentRuleRecipeRef: (ref: RuleRecipeRef) => agentRulePresenter.setRecipeRef(ref),
    setAgentRuleConditionGoodId: (goodId: string) => agentRulePresenter.setConditionGoodId(goodId),
    setAgentRuleConditionQuantity: (value: string) =>
      agentRulePresenter.setConditionQuantity(value),
    setAgentRuleConditionOperator: (operator: 'AT_LEAST' | 'LESS_THAN') =>
      agentRulePresenter.setConditionOperator(operator),
    setAgentRulePriority: (value: string) => agentRulePresenter.setPriority(value),
    submitAgentRule: () => agentRulePresenter.submit(),
    startEditAgentRule: (rule: Rule) => agentRulePresenter.startEdit(rule),
    deleteAgentRule: (ruleId: string) => agentRulePresenter.deleteRule(ruleId),
    catalogRecipes: agentRulePresenter.catalogRecipes,
  }
}
