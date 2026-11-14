import { useState } from 'react'
import { createStores, type Stores } from '@/domain/stores'
import { useDesignMode } from '@/presentation/useDesignMode'
import { AgentCatalog } from './AgentCatalog'
import { AgentForm } from './AgentForm'
import { AgentRecipeForm } from './AgentRecipeForm'
import { AgentRuleForm } from './AgentRuleForm'
import { GoodsSection } from './GoodsSection'
import { RecipeCatalog } from './RecipeCatalog'
import { RecipeForm } from './RecipeForm'
import { WorldTransferSection } from './WorldTransferSection'

type DesignModeProps = {
  stores?: Stores
}

type DesignSectionId = 'recetas' | 'bienes' | 'agentes' | 'mundo'

const DESIGN_SECTIONS: { id: DesignSectionId; label: string }[] = [
  { id: 'recetas', label: 'Recetas' },
  { id: 'bienes', label: 'Bienes' },
  { id: 'agentes', label: 'Agentes' },
  { id: 'mundo', label: 'Mundo' },
]

/**
 * Composition root of design mode: wires the flat design-mode API into one
 * component per section. Sections own their markup; this file only routes
 * state and callbacks. The side menu picks which sections are mounted, so the
 * page stays short instead of stacking every panel at once.
 */
export function DesignMode({ stores = createStores() }: DesignModeProps) {
  const presenter = useDesignMode(stores)
  const [section, setSection] = useState<DesignSectionId>('recetas')
  const agentSelected = presenter.selectedAgentId !== null

  return (
    <div className="mode-layout design-layout">
      <h2>Modo diseño</h2>
      <nav className="side-nav" aria-label="Secciones del diseño">
        {DESIGN_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mode-content">
        {section === 'recetas' && (
          <>
            <RecipeForm
              name={presenter.name}
              inputs={presenter.inputs}
              outputs={presenter.outputs}
              errors={presenter.errors}
              goods={presenter.goods}
              onNameChange={presenter.setName}
              onAddInput={presenter.addInput}
              onUpdateInput={presenter.updateInput}
              onRemoveInput={presenter.removeInput}
              onAddOutput={presenter.addOutput}
              onUpdateOutput={presenter.updateOutput}
              onRemoveOutput={presenter.removeOutput}
              onSubmit={presenter.submit}
            />
            <RecipeCatalog
              recipes={presenter.recipes}
              goods={presenter.goods}
              onEdit={presenter.startEdit}
              onDelete={presenter.deleteRecipe}
            />
          </>
        )}

        {section === 'bienes' && (
          <GoodsSection
            goodName={presenter.goodName}
            goods={presenter.goods}
            error={presenter.goodError}
            onNameChange={presenter.setGoodName}
            onRegister={presenter.registerGood}
          />
        )}

        {section === 'agentes' && (
          <>
            <AgentForm
              name={presenter.agentName}
              inventory={presenter.agentInventory}
              recipesPerAction={presenter.agentRecipesPerAction}
              errors={presenter.agentErrors}
              goods={presenter.goods}
              onNameChange={presenter.setAgentName}
              onRecipesPerActionChange={presenter.setAgentRecipesPerAction}
              onAddLine={presenter.addAgentInventoryLine}
              onUpdateLine={presenter.updateAgentInventoryLine}
              onRemoveLine={presenter.removeAgentInventoryLine}
              onSubmit={presenter.submitAgent}
            />
            <AgentCatalog
              agents={presenter.agents}
              goods={presenter.goods}
              catalogRecipes={presenter.catalogRecipes}
              selectedAgentId={presenter.selectedAgentId}
              selectedAgentView={presenter.selectedAgentView}
              onSelectAgent={presenter.selectAgent}
              onSelectAgentRules={presenter.selectAgentRules}
              onEditRecipe={presenter.startEditAgentRecipe}
              onDeleteRecipe={presenter.deleteAgentRecipe}
              onEditRule={presenter.startEditAgentRule}
              onDeleteRule={presenter.deleteAgentRule}
            />
            {agentSelected && presenter.selectedAgentView === 'recipes' && (
              <AgentRecipeForm
                name={presenter.agentRecipeName}
                inputs={presenter.agentRecipeInputs}
                outputs={presenter.agentRecipeOutputs}
                errors={presenter.agentRecipeErrors}
                goods={presenter.goods}
                onNameChange={presenter.setAgentRecipeName}
                onAddInput={presenter.addAgentRecipeInput}
                onUpdateInput={presenter.updateAgentRecipeInput}
                onRemoveInput={presenter.removeAgentRecipeInput}
                onAddOutput={presenter.addAgentRecipeOutput}
                onUpdateOutput={presenter.updateAgentRecipeOutput}
                onRemoveOutput={presenter.removeAgentRecipeOutput}
                onSubmit={presenter.submitAgentRecipe}
              />
            )}
            {agentSelected && presenter.selectedAgentView === 'rules' && (
              <AgentRuleForm
                recipeRef={presenter.agentRuleRecipeRef}
                conditionGoodId={presenter.agentRuleConditionGoodId}
                conditionQuantity={presenter.agentRuleConditionQuantity}
                conditionOperator={presenter.agentRuleConditionOperator}
                priority={presenter.agentRulePriority}
                errors={presenter.agentRuleErrors}
                catalogRecipes={presenter.catalogRecipes}
                ownRecipes={presenter.selectedAgentRecipes}
                goods={presenter.goods}
                onRecipeRefChange={presenter.setAgentRuleRecipeRef}
                onConditionGoodIdChange={presenter.setAgentRuleConditionGoodId}
                onConditionQuantityChange={presenter.setAgentRuleConditionQuantity}
                onConditionOperatorChange={presenter.setAgentRuleConditionOperator}
                onPriorityChange={presenter.setAgentRulePriority}
                onSubmit={presenter.submitAgentRule}
              />
            )}
          </>
        )}

        {section === 'mundo' && (
          <WorldTransferSection
            goods={presenter.goods}
            recipes={presenter.recipes}
            agents={presenter.agents}
            selectedGoods={presenter.transferSelectedGoods}
            selectedRecipes={presenter.transferSelectedRecipes}
            selectedAgents={presenter.transferSelectedAgents}
            selectedCount={presenter.transferSelectedCount}
            canExport={presenter.transferCanExport}
            importErrors={presenter.transferImportErrors}
            importSummary={presenter.transferImportSummary}
            onToggleGood={presenter.toggleTransferGood}
            onToggleRecipe={presenter.toggleTransferRecipe}
            onToggleAgent={presenter.toggleTransferAgent}
            exportJson={presenter.exportTransferJson}
            onImport={presenter.importTransferJson}
          />
        )}
      </div>
    </div>
  )
}
