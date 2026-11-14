# AGENTS.md

## Project overview

**Means** is a crafting/economy simulation game application. A single user switches between a design mode and a play mode:

- **Design mode:** create and manage goods, services, recipes, agents, agent-specific recipes and automatic rules.
- **Play mode:** the player has no personal inventory; they own one agent at a time (or none) and manually control the possessed agent. The rest of the agents keep running their automatic rules in the background. The activation strategy is selectable per session: **temporal** (a 1 s loop, default) or **by actions** (each recipe the player runs — or the `Avanzar` button when nobody is possessed — moves the other agents forward).
- **Import/Export:** users can export and import selections of world data.

The full backlog and detailed user stories live in [/docs/backlog.md](/docs/backlog.md).

## Stack

- **Language:** TypeScript
- **Frontend tooling:** Vite
- **Testing:** Vitest
- **UI framework:** React
- **Target full-stack stack:** React + Node.js + SQLite (see backlog)

## Architecture notes

- **Domain stores** are created with `createStores()` and injected into presenters/components. Avoid using module-level singleton stores in new code.
- **Presenters** are split by feature: `RecipePresenter`, `GoodPresenter`, `AgentPresenter`, `AgentRecipePresenter`, `AgentRulePresenter`. React's `useDesignMode` composes them and exposes a flat API to the UI.
- **Entry point:** `index.html` serves the React design-mode app (`src/react/main.tsx`).
- **Rule engine:** a small `ruleEngine.ts` evaluates agent rules against inventory; `AgentStore.runAutomaticRules()` applies them per trigger (tick or player action), up to each agent's `recipesPerAction` (default 1), always excluding the possessed agent.
- **Goods registration:** recipes and agent inventories no longer auto-create goods. Register goods explicitly before referencing them; otherwise validation returns `UNKNOWN_GOOD`.
- **Unique names:** goods, recipes and agents must have unique names within their own catalogs. Duplicate names return `DUPLICATE_NAME`, `RECIPE_NAME_EXISTS` or `AGENT_NAME_EXISTS`.
- **Section navigation:** design mode mounts one section at a time behind a side menu (`DesignMode`), and the possessed agent panel shows one block at a time in tabs (`PossessedAgentPanel`). Tests reveal them through the `openDesignSection` / `openPlayTab` helpers.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check and build for production
- `npm run test` — run tests in watch mode
- `npm run test:run` — run tests once
- `npm run lint` — run ESLint
- `npm run lint:fix` — run ESLint with auto-fix
- `npm run format` — format code with Prettier
- `npm run format:check` — check Prettier formatting
