# AGENTS.md

## Project overview

**Means** is a crafting/economy simulation game application. A single user switches between a design mode and a play mode:

- **Design mode:** create and manage goods, services, recipes, agents, agent-specific recipes and automatic rules.
- **Play mode:** the player has no personal inventory; they own one agent at a time (or none) and manually control the possessed agent. The rest of the agents keep running their automatic rules in the background.
- **Import/Export:** users can export and import selections of world data.

The full backlog and detailed user stories live in [/docs/backlog.md](/docs/backlog.md).

## Stack

- **Language:** TypeScript
- **Frontend tooling:** Vite
- **Testing:** Vitest
- **Target full-stack stack:** React + Node.js + SQLite (see backlog)

## Architecture notes

- **Domain stores** are created with `createStores()` and injected into presenters/components. Avoid using module-level singleton stores in new code.
- **Presenters** are split by feature: `RecipePresenter`, `GoodPresenter`, `AgentPresenter`, `AgentRecipePresenter`, `AgentRulePresenter`. React's `useDesignMode` composes them and exposes a flat API to the UI.
- **Entry points:** `index.html` serves the React design-mode app (`src/react/main.tsx`). `angular.html` still serves the Angular design-mode app (`src/angular/main.ts`).
- **Rule engine:** a small `ruleEngine.ts` evaluates agent rules against inventory; it is the foundation for the upcoming play-mode loop.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check and build for production
- `npm run test` — run tests in watch mode
- `npm run test:run` — run tests once
