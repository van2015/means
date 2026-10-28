import type { Rule, RuleError, RuleRecipeRef } from '@/domain/agent'
import type { AgentStore } from '@/domain/agentStore'
import type { Good, GoodStore } from '@/domain/goodStore'
import type { Recipe } from '@/domain/recipeStore'
import { RecipeStore } from '@/domain/recipeStore'
import { Presenter } from './presenter'

export class AgentRulePresenter extends Presenter {
  private agentStore: AgentStore
  private goodStore: GoodStore
  private recipeStore: RecipeStore
  private recipeRefValue: RuleRecipeRef = { source: 'catalog', recipeId: '' }
  private conditionGoodIdValue = ''
  private conditionQuantityValue = ''
  private conditionOperatorValue: 'AT_LEAST' | 'LESS_THAN' = 'AT_LEAST'
  private priorityValue = ''
  private errorsValue: RuleError[] = []
  private editingIdValue: string | null = null
  private agentIdValue: string | null = null

  constructor(stores: { agentStore: AgentStore; goodStore: GoodStore; recipeStore: RecipeStore }) {
    super()
    this.agentStore = stores.agentStore
    this.goodStore = stores.goodStore
    this.recipeStore = stores.recipeStore
  }

  get recipeRef(): RuleRecipeRef {
    return this.recipeRefValue
  }

  get conditionGoodId(): string {
    return this.conditionGoodIdValue
  }

  get conditionQuantity(): string {
    return this.conditionQuantityValue
  }

  get conditionOperator(): 'AT_LEAST' | 'LESS_THAN' {
    return this.conditionOperatorValue
  }

  get priority(): string {
    return this.priorityValue
  }

  get errors(): RuleError[] {
    return this.errorsValue
  }

  get editingId(): string | null {
    return this.editingIdValue
  }

  get goods(): Good[] {
    return this.goodStore.all()
  }

  get catalogRecipes(): Recipe[] {
    return this.recipeStore.all()
  }

  setRecipeRef(ref: RuleRecipeRef): void {
    this.recipeRefValue = ref
    this.notify()
  }

  setConditionGoodId(goodId: string): void {
    this.conditionGoodIdValue = goodId
    this.notify()
  }

  setConditionQuantity(value: string): void {
    this.conditionQuantityValue = value
    this.notify()
  }

  setConditionOperator(operator: 'AT_LEAST' | 'LESS_THAN'): void {
    this.conditionOperatorValue = operator
    this.notify()
  }

  setPriority(value: string): void {
    this.priorityValue = value
    this.notify()
  }

  setAgentId(agentId: string | null): void {
    this.agentIdValue = agentId
    if (agentId === null) {
      this.resetForm()
    }
    this.notify()
  }

  startEdit(rule: Rule): void {
    this.editingIdValue = rule.id
    this.recipeRefValue = rule.recipeRef
    this.conditionGoodIdValue = rule.condition.goodId
    this.conditionQuantityValue = String(rule.condition.quantity)
    this.conditionOperatorValue = rule.condition.operator
    this.priorityValue = String(rule.priority)
    this.errorsValue = []
    this.notify()
  }

  submit(): void {
    if (!this.agentIdValue) return

    const condition = {
      goodId: this.conditionGoodIdValue,
      quantity: Number(this.conditionQuantityValue),
      operator: this.conditionOperatorValue,
    }
    const priority = Number(this.priorityValue)

    const result = this.editingIdValue
      ? this.agentStore.updateRule(
          this.agentIdValue,
          this.editingIdValue,
          this.recipeRefValue,
          condition,
          priority,
        )
      : this.agentStore.addRule(this.agentIdValue, this.recipeRefValue, condition, priority)

    if (result.ok) {
      this.resetForm()
    } else {
      this.errorsValue = result.errors
    }

    this.notify()
  }

  deleteRule(ruleId: string): void {
    if (!this.agentIdValue) return
    this.agentStore.deleteRule(this.agentIdValue, ruleId)
    this.notify()
  }

  private resetForm(): void {
    this.recipeRefValue = { source: 'catalog', recipeId: '' }
    this.conditionGoodIdValue = ''
    this.conditionQuantityValue = ''
    this.conditionOperatorValue = 'AT_LEAST'
    this.priorityValue = ''
    this.errorsValue = []
    this.editingIdValue = null
  }
}
