import { useState } from 'react'
import { recipeStore } from '@/domain/recipeStore'
import type { Recipe, RecipeError } from '@/domain/recipeStore'
import type { LineDraft } from './RecipeLineForm'

export function useDesignMode() {
  const [name, setName] = useState('')
  const [inputs, setInputs] = useState<LineDraft[]>([])
  const [outputs, setOutputs] = useState<LineDraft[]>([])
  const [recipes, setRecipes] = useState(recipeStore.getRecipes())
  const [errors, setErrors] = useState<RecipeError[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [goodName, setGoodName] = useState('')
  const [goods, setGoods] = useState(recipeStore.getGoods())
  const [goodError, setGoodError] = useState<string | null>(null)

  function addInput() {
    setInputs([...inputs, { goodName: '', quantity: '' }])
  }

  function addOutput() {
    setOutputs([...outputs, { goodName: '', quantity: '' }])
  }

  function updateInput(index: number, field: keyof LineDraft, value: string) {
    const next = [...inputs]
    next[index][field] = value
    setInputs(next)
  }

  function updateOutput(index: number, field: keyof LineDraft, value: string) {
    const next = [...outputs]
    next[index][field] = value
    setOutputs(next)
  }

  function deleteRecipe(id: string) {
    recipeStore.deleteRecipe(id)
    setRecipes(recipeStore.getRecipes())
  }

  function registerGood(event: React.FormEvent) {
    event.preventDefault()
    const result = recipeStore.createGood(goodName)
    if (result.ok) {
      setGoods(recipeStore.getGoods())
      setGoodName('')
      setGoodError(null)
    } else {
      setGoodError('El nombre no puede estar vacío')
    }
  }

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id)
    setName(recipe.name)
    setInputs(
      recipe.inputs.map((line) => ({
        goodName: recipeStore.getGood(line.goodId)?.name ?? '',
        quantity: String(line.quantity),
      })),
    )
    setOutputs(
      recipe.outputs.map((line) => ({
        goodName: recipeStore.getGood(line.goodId)?.name ?? '',
        quantity: String(line.quantity),
      })),
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()

    const draft = {
      name,
      inputs: inputs.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
      outputs: outputs.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
    }

    const result = editingId
      ? recipeStore.updateRecipe(editingId, draft)
      : recipeStore.createRecipe(draft)

    if (result.ok) {
      setRecipes(recipeStore.getRecipes())
      setName('')
      setInputs([])
      setOutputs([])
      setEditingId(null)
      setErrors([])
    } else {
      setErrors(result.errors)
    }
  }

  return {
    name,
    setName,
    inputs,
    addInput,
    updateInput,
    outputs,
    addOutput,
    updateOutput,
    recipes,
    errors,
    deleteRecipe,
    startEdit,
    submit,
    goodName,
    setGoodName,
    goods,
    goodError,
    registerGood,
  }
}
