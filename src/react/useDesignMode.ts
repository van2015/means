import { useEffect, useState } from 'react'
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
  }
}
