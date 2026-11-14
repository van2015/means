# Historia #19 — Menú lateral en modo diseño y pestañas en modo juego

## Story

Como usuario, quiero que las secciones de cada modo estén ordenadas en un menú —un **menú lateral** en modo diseño y **pestañas** en el panel del agente poseído— para no tener que hacer scroll por todas las secciones seguidas y encontrar cada cosa rápido.

Requires: #7

## Acceptance criteria

- [x] Dado que estoy en modo diseño, veo un menú lateral con las cuatro secciones: **Recetas**, **Bienes**, **Agentes** y **Mundo**.
- [x] Dado que abro modo diseño, la sección **Recetas** es la seleccionada por defecto.
- [x] Dado que pulso una entrada del menú, solo se muestra esa sección (las demás no están montadas) y la entrada activa queda marcada con `aria-current="page"`.
- [x] Dado que cambio de sección, el estado de los formularios no se pierde (los drafts viven en el presentador, que sigue montado).
- [x] Dado que estoy en modo juego, no hay menú lateral: el modo juego conserva su disposición apilada.
- [x] Dado que poseo un agente, su panel se organiza en pestañas: **Inventario**, **Recetas**, **Reglas** y **Producir**; por defecto se ve Inventario.
- [x] Dado que cambio de pestaña, solo se muestra el bloque seleccionado y la pestaña activa queda marcada con `aria-selected="true"`.
- [x] Dado que cambio de agente poseído, la pestaña abierta se conserva.
- [x] Dado que no poseo a ningún agente, no hay panel ni pestañas.
- [x] Dado que la ventana es estrecha (≤ 900 px), el menú lateral pasa a una barra horizontal encima de las secciones.
- [x] Dado que verifico la accesibilidad, el menú es un `<nav>` etiquetado y el panel usa `tablist`/`tab`/`tabpanel` con `aria-controls`/`aria-labelledby`.

## Plan

1. **`src/react/DesignMode.tsx`** — estado local `section: 'recetas' | 'bienes' | 'agentes' | 'mundo'` (default `recetas`), lista `DESIGN_SECTIONS` y:

   ```tsx
   <div className="mode-layout design-layout">
     <h2>Modo diseño</h2>
     <nav className="side-nav" aria-label="Secciones del diseño">
       {DESIGN_SECTIONS.map((item) => (
         <button aria-current={section === item.id ? 'page' : undefined} ...>{item.label}</button>
       ))}
     </nav>
     <div className="mode-content">
       {section === 'recetas' && (<> <RecipeForm/> <RecipeCatalog/> </>)}
       {section === 'bienes' && <GoodsSection/>}
       {section === 'agentes' && (<> <AgentForm/> <AgentCatalog/> {formularios inline} </>)}
       {section === 'mundo' && <WorldTransferSection/>}
     </div>
   </div>
   ```

   Los formularios de receta/regla propios del agente siguen dentro de "Agentes" (se abren desde "Gestionar recetas/reglas"). `DesignMode` no se desmonta al cambiar de sección, así que `useDesignMode` conserva todos los drafts.

2. **`src/react/PlayMode.tsx`** — envuelve su contenido en `.mode-layout` + `.mode-content` (misma rejilla de 2 columnas que tenía) para que el CSS sea común a ambos modos.
3. **`src/react/PossessedAgentPanel.tsx`** — estado `tab: 'inventario' | 'recetas' | 'reglas' | 'producir'` y marcado accesible:

   ```tsx
   <div className="tab-list" role="tablist" aria-label="Secciones del agente poseído">
     <button role="tab" id aria-selected aria-controls onClick>…</button>
   </div>
   <div className="tabpanel" role="tabpanel" id aria-labelledby tabIndex={0}>
     {tab === 'inventario' && <InventorySection/>} …
   </div>
   ```

   Al cambiar de agente el panel no se remonta ⇒ la pestaña se conserva; al liberar la posesión el panel desaparece y el estado se reinicia.

4. **`src/style.css`** — los selectores `main > div > …` pasan a `.mode-layout` / `.side-nav` / `.mode-content > …`; `.side-nav` con `position: sticky` y `.side-nav button[aria-current='page']` en el color de acento; `.tab-list` flex con `button[aria-selected='true']` de acento; en ≤ 900 px `.design-layout` pasa a una columna y `.side-nav` a `grid-auto-flow: column` (barra horizontal). Los estilos de listas se reexpresan como `.mode-content section > ul > li` y `.mode-content .tabpanel > ul > li` porque el panel de juego ahora envuelve sus bloques en el `tabpanel`.
5. **Tests**
   - `test/helpers/designModeQueries.ts` — `openDesignSection(label)` (con `fireEvent`, idempotente y no-op si el menú no está montado) llamado por cada query helper y por `withinRecipeCatalog`/`withinAgentCatalog`/`withinGoodsCatalog`; `designSectionButton` y `openDesignSection` exportados para los journeys.
   - `test/helpers/playModeQueries.ts` (nuevo) — `openPlayTab(label)` con la misma idea para las pestañas.
   - `test/components/DesignMode.test.tsx` — "shows only the selected section and switches through the side menu" (4 entradas, `aria-current`, secciones que aparecen/desaparecen).
   - `test/components/PlayMode.test.tsx` — "shows one tab at a time and keeps it when the possessed agent changes" (4 pestañas, `aria-selected`, bloques que aparecen/desaparecen, pestaña persistente al cambiar de agente).
   - Journeys 10–16 actualizados: navegación explícita (`openPlayTab` / `openDesignSection`) y `produceFromCatalog()`/`inventoryList()` en el journey 12, que alterna pestañas en cada acción.
6. **Documentación** — entrada `#19` en `docs/backlog.md` y este documento.

## Out of scope

- Persistir la sección o la pestaña seleccionada al cambiar de modo (se reinician: diseño ⇒ Recetas, panel ⇒ Inventario).
- Navegación con flechas/roving tabindex entre pestañas (hoy todos los `tab` son focables; funciona con Tab).
- Menú lateral también en modo juego (allí solo hay 4 bloques cortos, apilados).
- Cambiar el contenido o el orden de las secciones.

## Suggestions (your call)

- **Estado de navegación en un store vs `useState`**: se eligió `useState` (simple, sin tocar `createStores`); alternativa: un `SectionStore` como el `StrategyStore` para que la sección sobreviva a los cambios de modo.
- **Orden del menú**: Recetas → Bienes → Agentes → Mundo (orden de trabajo: primero se definen las recetas y los bienes, después los actores, y al final se comparte el mundo).
- **Desmontar secciones**: rompe los tests que asumían todo montado a la vez; se resolvió centralizando la navegación en los helpers de test (`openDesignSection`/`openPlayTab`) en vez de repartir clics por los tests.
- **Pestañas vs acordeón en el panel**: se eligió pestaña porque el panel ya era un único `<section>` con cuatro bloques; alternativa: mostrar Inventario + Producir a la vez (los dos que se usan al jugar) y pestañas solo para Recetas/Reglas.
