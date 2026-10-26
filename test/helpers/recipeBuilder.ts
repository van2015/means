import type { RecipeDraft } from '@/domain/recipe'

export class RecipeBuilder {
  private name = 'Default recipe'
  private inputs: { goodName: string; quantity: number }[] = []
  private outputs: { goodName: string; quantity: number }[] = []

  static aRecipe(): RecipeBuilder {
    return new RecipeBuilder()
  }

  named(name: string): this {
    this.name = name
    return this
  }

  withInput(goodName: string, quantity: number): this {
    this.inputs.push({ goodName, quantity })
    return this
  }

  withOutput(goodName: string, quantity: number): this {
    this.outputs.push({ goodName, quantity })
    return this
  }

  build(): RecipeDraft {
    return {
      name: this.name,
      inputs: this.inputs,
      outputs: this.outputs,
    }
  }
}
