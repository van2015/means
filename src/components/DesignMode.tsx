import { useState } from 'react'
import { recipeStore } from '@/domain/recipeStore'
import type { RecipeError } from '@/domain/recipeStore'
import { RecipeCatalog } from './RecipeCatalog'
import { RecipeLineForm, type LineDraft } from './RecipeLineForm'
import { ValidationErrors } from './ValidationErrors'

export function DesignMode() {
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

  function handleSubmit(event: React.FormEvent) {
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

  return (
    <div>
      <h2>Modo diseño</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <RecipeLineForm
          legend="Entradas"
          lineLabel="insumo"
          addButtonLabel="entrada"
          lines={inputs}
          onAdd={addInput}
          onUpdate={updateInput}
        />
        <RecipeLineForm
          legend="Salidas"
          lineLabel="producto"
          addButtonLabel="salida"
          lines={outputs}
          onAdd={addOutput}
          onUpdate={updateOutput}
        />
        <button type="submit">Guardar receta</button>
      </form>
      <ValidationErrors errors={errors} />
      <RecipeCatalog recipes={recipes} store={recipeStore} />
    </div>
  )
}
