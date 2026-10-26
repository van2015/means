import { useState } from 'react'
import { recipeStore } from '@/domain/recipeStore'
import type { RecipeError } from '@/domain/recipeStore'
import type { LineDraft } from './RecipeLineForm'

export function useDesignMode() {
  const [name, setName] = useState('')
  const [inputs, setInputs] = useState<LineDraft[]>([])
  const [outputs, setOutputs] = useState<LineDraft[]>([])
  const [recipes, setRecipes] = useState(recipeStore.getRecipes())
  const [errors, setErrors] = useState<RecipeError[]>([])

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

  function submit(event: React.FormEvent) {
    event.preventDefault()

    const result = recipeStore.createRecipe({
      name,
      inputs: inputs.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
      outputs: outputs.map((line) => ({
        goodName: line.goodName,
        quantity: Number(line.quantity),
      })),
    })

    if (result.ok) {
      setRecipes(recipeStore.getRecipes())
      setName('')
      setInputs([])
      setOutputs([])
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
    submit,
  }
}
