import { useCallback, useMemo, useState } from 'react'
import type { Rule, RuleRecipeRef } from '@/domain/agent'
import type { Stores } from '@/domain/stores'
import { AgentPresenter } from './agentPresenter'
import { AgentRecipePresenter } from './agentRecipePresenter'
import { AgentRulePresenter } from './agentRulePresenter'
import { GoodPresenter } from './goodPresenter'
import type { LineDraftField } from './lineDraft'
import { RecipePresenter } from './recipePresenter'
import { usePresenterSync } from './usePresenterSync'
import { WorldTransferPresenter } from './worldTransferPresenter'

type DesignPresenters = {
  recipe: RecipePresenter
  good: GoodPresenter
  agent: AgentPresenter
  agentRecipe: AgentRecipePresenter
  agentRule: AgentRulePresenter
  transfer: WorldTransferPresenter
}

function createPresenters(stores: Stores): DesignPresenters {
  return {
    recipe: new RecipePresenter(stores),
    good: new GoodPresenter(stores),
    agent: new AgentPresenter({ agentStore: stores.agentStore }),
    agentRecipe: new AgentRecipePresenter(stores),
    agentRule: new AgentRulePresenter(stores),
    transfer: new WorldTransferPresenter(stores),
  }
}

function recipeApi(p: RecipePresenter) {
  return {
    name: p.name,
    inputs: p.inputs,
    outputs: p.outputs,
    recipes: p.recipes,
    errors: p.errors,
    setName: (name: string) => p.setName(name),
    addInput: () => p.addInput(),
    updateInput: (index: number, field: LineDraftField, value: string) =>
      p.updateInput(index, field, value),
    removeInput: (index: number) => p.removeInput(index),
    addOutput: () => p.addOutput(),
    updateOutput: (index: number, field: LineDraftField, value: string) =>
      p.updateOutput(index, field, value),
    removeOutput: (index: number) => p.removeOutput(index),
    deleteRecipe: (id: string) => p.deleteRecipe(id),
    startEdit: (recipe: Parameters<RecipePresenter['startEdit']>[0]) => p.startEdit(recipe),
    submit: () => p.submit(),
  }
}

function goodApi(p: GoodPresenter) {
  return {
    goodName: p.goodName,
    goods: p.goods,
    goodError: p.goodError,
    setGoodName: (name: string) => p.setGoodName(name),
    registerGood: () => p.registerGood(),
  }
}

function agentApi(p: AgentPresenter) {
  return {
    agentName: p.name,
    agentInventory: p.inventory,
    agents: p.agents,
    agentErrors: p.errors,
    selectedAgentId: p.selectedAgentId,
    selectedAgentView: p.selectedAgentView,
    selectedAgentRecipes: p.selectedAgentRecipes,
    setAgentName: (name: string) => p.setName(name),
    addAgentInventoryLine: () => p.addInventoryLine(),
    updateAgentInventoryLine: (index: number, field: LineDraftField, value: string) =>
      p.updateInventoryLine(index, field, value),
    removeAgentInventoryLine: (index: number) => p.removeInventoryLine(index),
    submitAgent: () => p.submit(),
  }
}

function agentRecipeApi(p: AgentRecipePresenter) {
  return {
    agentRecipeName: p.name,
    agentRecipeInputs: p.inputs,
    agentRecipeOutputs: p.outputs,
    agentRecipeErrors: p.errors,
    agentRecipeEditingId: p.editingId,
    setAgentRecipeName: (name: string) => p.setName(name),
    addAgentRecipeInput: () => p.addInput(),
    updateAgentRecipeInput: (index: number, field: LineDraftField, value: string) =>
      p.updateInput(index, field, value),
    removeAgentRecipeInput: (index: number) => p.removeInput(index),
    addAgentRecipeOutput: () => p.addOutput(),
    updateAgentRecipeOutput: (index: number, field: LineDraftField, value: string) =>
      p.updateOutput(index, field, value),
    removeAgentRecipeOutput: (index: number) => p.removeOutput(index),
    submitAgentRecipe: () => p.submit(),
    startEditAgentRecipe: (recipe: Parameters<AgentRecipePresenter['startEdit']>[0]) =>
      p.startEdit(recipe),
    deleteAgentRecipe: (recipeId: string) => p.deleteRecipe(recipeId),
  }
}

function agentRuleApi(p: AgentRulePresenter) {
  return {
    agentRuleRecipeRef: p.recipeRef,
    agentRuleConditionGoodId: p.conditionGoodId,
    agentRuleConditionQuantity: p.conditionQuantity,
    agentRuleConditionOperator: p.conditionOperator,
    agentRulePriority: p.priority,
    agentRuleErrors: p.errors,
    agentRuleEditingId: p.editingId,
    catalogRecipes: p.catalogRecipes,
    setAgentRuleRecipeRef: (ref: RuleRecipeRef) => p.setRecipeRef(ref),
    setAgentRuleConditionGoodId: (goodId: string) => p.setConditionGoodId(goodId),
    setAgentRuleConditionQuantity: (value: string) => p.setConditionQuantity(value),
    setAgentRuleConditionOperator: (operator: 'AT_LEAST' | 'LESS_THAN') =>
      p.setConditionOperator(operator),
    setAgentRulePriority: (value: string) => p.setPriority(value),
    submitAgentRule: () => p.submit(),
    startEditAgentRule: (rule: Rule) => p.startEdit(rule),
    deleteAgentRule: (ruleId: string) => p.deleteRule(ruleId),
  }
}

function transferApi(p: WorldTransferPresenter) {
  return {
    transferSelectedGoods: p.selectedGoods,
    transferSelectedRecipes: p.selectedRecipes,
    transferSelectedAgents: p.selectedAgents,
    transferSelectedCount: p.selectedCount,
    transferCanExport: p.canExport,
    transferImportErrors: p.importErrors,
    transferImportSummary: p.importSummary,
    toggleTransferGood: (id: string) => p.toggleGood(id),
    toggleTransferRecipe: (id: string) => p.toggleRecipe(id),
    toggleTransferAgent: (id: string) => p.toggleAgent(id),
    exportTransferJson: (): string | null => p.exportJson(),
    importTransferJson: (json: string) => p.importJson(json),
    clearTransferResult: () => p.clearResult(),
  }
}

/**
 * Composes the design-mode presenters into the flat API consumed by the UI.
 * The API is grouped per feature: each builder owns one presenter, so adding a
 * field only touches its group instead of a single 100+ line object literal.
 */
export function useDesignMode(stores: Stores) {
  // Presenters are bound to the stores instance captured on the first render,
  // so persistence must target that same instance: a caller that rebuilds its
  // stores on later renders would otherwise save an empty world over the real one.
  const [binding] = useState(() => ({ presenters: createPresenters(stores), stores }))
  const { presenters } = binding
  const [, forceUpdate] = useState({})
  const rerender = useCallback(() => forceUpdate({}), [])
  const presenterList = useMemo(() => Object.values(presenters), [presenters])

  usePresenterSync(presenterList, binding.stores, rerender)

  // selection is coordinated: only one of the agent forms may be active
  const selectAgent = (agentId: string) => {
    presenters.agent.selectAgent(agentId)
    presenters.agentRecipe.setAgentId(agentId)
    presenters.agentRule.setAgentId(null)
  }

  const selectAgentRules = (agentId: string) => {
    presenters.agent.selectAgentRules(agentId)
    presenters.agentRecipe.setAgentId(null)
    presenters.agentRule.setAgentId(agentId)
  }

  return {
    ...recipeApi(presenters.recipe),
    ...goodApi(presenters.good),
    ...agentApi(presenters.agent),
    ...agentRecipeApi(presenters.agentRecipe),
    ...agentRuleApi(presenters.agentRule),
    ...transferApi(presenters.transfer),
    selectAgent,
    selectAgentRules,
  }
}
