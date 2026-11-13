# Historia #18 — Elegir la estrategia de activación de los agentes (temporal o por acciones)

## Story

Como usuario en modo juego, quiero elegir entre la estrategia **temporal** (bucle de 1 s, la actual) y la estrategia **por acciones** (cada receta que ejecuta el agente poseído — o el botón "Avanzar" cuando no posees a nadie — hace avanzar a los demás agentes), para decidir yo cómo avanza la economía.

Requires: #6, #8, #12, #13

## Acceptance criteria

- [x] Dado que estoy en modo juego, entonces veo un selector de estrategia con las opciones **Temporal** (por defecto) y **Por acciones**.
- [x] Dado que la estrategia es **Temporal**, cuando pasa 1 s, cada agente no poseído ejecuta hasta `recipesPerAction` recetas (por defecto 1 ⇒ comportamiento idéntico al de hoy), empezando por la regla de mayor prioridad.
- [x] Dado que la estrategia es **Por acciones**, cuando avanzo el tiempo (fake timers en tests), entonces **no** se ejecuta ninguna producción automática: el bucle temporal está desactivado.
- [x] Dado que la estrategia es **Por acciones** y poseo un agente, cuando ejecuto una receta **con éxito**, entonces cada agente no poseído con reglas aplicables ejecuta hasta `recipesPerAction` recetas, siempre empezando por la regla de mayor prioridad cuya condición se cumple.
- [x] Dado que en **Por acciones** ejecuto una receta que **falla** (falta de material, receta borrada), entonces no se dispara ninguna producción automática.
- [x] Dado que en **Por acciones** un agente no puede ejecutar más recetas (condición no cumplida o material insuficiente), entonces se detiene ese agente y los demás continúan.
- [x] Dado que en **Por acciones** no poseo a ningún agente, entonces veo el botón **Avanzar**; al pulsarlo, todos los agentes ejecutan sus acciones (mismo límite `recipesPerAction` por agente y misma prioridad).
- [x] Dado que en **Por acciones** sí poseo un agente, entonces el botón **Avanzar** no está visible (el disparador son tus propias acciones).
- [x] Dado que cambio de **Temporal** a **Por acciones**, entonces el bucle se detiene; al volver a **Temporal**, se reanuda.
- [x] Dado que el agente poseído es el que actúa, entonces **sus** reglas automáticas no se ejecutan por el disparador (él lo controlas a mano; coherente con #13).
- [x] Dado que creo un agente con **Recetas por acción** = N, entonces en modo juego ese agente ejecuta hasta N recetas por disparador **en ambas estrategias** (en temporal, por tick).
- [x] Dado que el valor de **Recetas por acción** no es un entero ≥ 1, entonces el formulario muestra el error y no se crea el agente.
- [x] Dado que exporto e importo un mundo, el campo viaja con el agente; un archivo anterior sin el campo se importa con el valor 1.
- [x] Dado que una regla apunta a una receta borrada o falta material en una producción automática, entonces el resto continúa sin mostrar alertas (las alertas son solo para acciones manuales, igual que en #13).

## Plan

1. **Dominio — `src/domain/agent.ts`**
   - `AgentDraft` gana `recipesPerAction?: number` (**opcional** con default `1`: no rompe los ~26 `create({ name, inventory })` existentes y los archivos antiguos de importación; ver suggestions).
   - `Agent` gana `readonly recipesPerAction: number` como **último parámetro del constructor con default `1`** ⇒ todas las llamadas existentes (`produce`, `replaceAgent`, tests) siguen compilandose y el comportamiento por defecto no cambia.
   - `AgentError` gana `{ code: 'INVALID_RECIPES_PER_ACTION' }`.
   - `validateAgent(name, inventory, recipesPerAction)`: `Number.isInteger(x) && x >= 1`; si falla, empuja `INVALID_RECIPES_PER_ACTION`. Auxiliar `recipesPerActionOf(draft)` resuelve el default en un solo sitio.
2. **Dominio — `src/domain/agentStore.ts`**
   - `create(draft)` pasa `draft.recipesPerAction` al `new Agent(...)`.
   - `runAutomaticRules(excludeAgentId)` pasa de "1 éxito y `break`" a **límite por agente**:

     ```ts
     for (const agent of [...this.agents]) {
       if (agent.id === excludeAgentId) continue
       let done = 0
       while (done < agent.recipesPerAction) {
         const current = this.findById(agent.id) // refrescar: produce() sustituye el objeto
         if (!current.ok) break
         const rule = this.runNextRule(current.agent) // null ⇒ nada ejecutable
         if (rule === null) break
         executed.push({ agentId: agent.id, ruleId: rule.id })
         done++
       }
     }
     ```

     `runNextRule(agent)` recorre `applicableRules(agent)` **contra el inventario ya actualizado** (la condición se re-evalúa en cada vuelta), intenta producir en orden de prioridad y devuelve la primera que funciona, o `null` si ninguna (material insuficiente, condición no cumplida o receta borrada).

     Con `recipesPerAction = 1` el comportamiento es exactamente el actual (regresión cubierta por los tests de #13). Nota: refrescar el agente en cada vuelta es obligatorio porque `Agent` es inmutable y `produce()` reemplaza el elemento del array.
3. **Dominio — `src/domain/strategyStore.ts`** (nuevo, pequeño):

   ```ts
   export type ActivationStrategy = 'TEMPORAL' | 'POR_ACCIONES'
   export class StrategyStore {
     private value: ActivationStrategy = 'TEMPORAL'
     get(): ActivationStrategy
     set(value: ActivationStrategy): void // sin notify: lo notifica el presentador
   }
   ```

   - `src/domain/stores.ts`: `Stores` gana `strategyStore` y `createStores()` lo instancia. **No** entra en `WorldExport` (decisión: el ajuste es de sesión, no del mundo).

4. **Presentador — `src/presentation/playModePresenter.ts`**
   - Constructor recibe `strategyStore` junto al resto.
   - `get strategy(): ActivationStrategy` y `setStrategy(value)` → `store.set` + `notify()`.
   - `produce(recipeRef)`: si `result.ok` y `strategy === 'POR_ACCIONES'`, tras producir llama a `this.agentStore.runAutomaticRules(this.possessionStore.possessedAgentId())` (el poseído queda excluido) y notifica una sola vez al final.
   - Nuevo `advance(): number` → `runAutomaticRules(this.possessionStore.possessedAgentId())` (con nadie poseído eso es `null`, o sea **todos**; si alguien estuviera poseído, sus reglas siguen excluidas) + `notify()` si hubo producciones; devuelve el conteo. La vista decide cuándo mostrarlo; el presentador no se guarda nada más.
   - `tick()` (temporal) queda igual.
5. **Hook — `src/presentation/usePlayMode.ts`**
   - `playApi` expone `strategy`, `setStrategy`, `advance`.
   - El efecto del intervalo se condiciona a la estrategia:

     ```ts
     useEffect(() => {
       if (strategy !== 'TEMPORAL') return
       const intervalId = setInterval(() => presenter.tick(), PLAY_TICK_MS)
       return () => clearInterval(intervalId)
     }, [presenter, strategy])
     ```

     Cambiar de estrategia re-ejecuta el efecto ⇒ se limpia/crea el intervalo automáticamente.
6. **UI juego — `src/react/PlayMode.tsx`**
   - Selector de estrategia arriba (radio buttons o `<select>`, con `aria-label="Estrategia de activación"`): "Temporal" / "Por acciones".
   - Botón **Avanzar** renderizado solo si `strategy === 'POR_ACCIONES' && !possessed`, llamando a `play.advance`.
7. **UI diseño — campo "Recetas por acción"**
   - `src/presentation/agentPresenter.ts`: draft `recipesPerActionValue: string` (default `'1'`), getter/setter, `submit()` lo pasa a `agentStore.create` (`Number(...)`), `resetForm()` lo restaura a `'1'`.
   - `src/presentation/useDesignMode.ts` → `agentApi`: expone `agentRecipesPerAction` y `setAgentRecipesPerAction`.
   - `src/react/DesignMode.tsx`: prop en `AgentForm`.
   - `src/react/AgentForm.tsx`: `<input type="number" min={1} step={1}>` con etiqueta **"Recetas por acción"** (y `aria-describedby` si hace falta).
   - `src/react/AgentCatalog.tsx`: mostrar `Recetas por acción: N` junto al agente (una línea; ayuda a entender por qué un agente produce más).
   - `src/i18n/errors.ts`: caso `INVALID_RECIPES_PER_ACTION` → `'Las recetas por acción deben ser un número entero mayor que cero'`.
8. **Export/Import — `src/domain/worldExport.ts` / `worldImport.ts`**
   - `ExportedAgent` gana `recipesPerAction: number`; `addAgent` lo escribe.
   - `validateAgentShape`: campo **opcional** — ausente ⇒ `1`; presente pero no entero ≥ 1 ⇒ `INVALID_STRUCTURE` en `agents[i].recipesPerAction`.
   - `applyAgents` lo pasa al `agentStore.create`. La `version` se queda en `1` (cambio aditivo con default).
   - De regalo: `src/persistence.ts` (`saveWorld`/`loadWorld`) reutiliza `buildExport`/`importWorld`, así que el campo también se guarda en `localStorage` sin tocar nada.
9. **Tests** (281 en total, 29 nuevos; los 252 previos siguen verdes sin cambios)
   - `test/domain/agentStore.test.ts` — validación de `recipesPerAction` (`0`, `-1`, `2.5`, `NaN` ⇒ `INVALID_RECIPES_PER_ACTION` y catálogo intacto) y default `1` cuando el draft lo omite; `runAutomaticRules`: N=3 produce tres veces en una sola llamada, se detiene antes si la condición deja de cumplirse (2 de 5 permitidas) o falta material (1 de 10), prioridad re-evaluada en cada vuelta, N=1 ⇒ regresión del comportamiento de #13, y `recipesPerAction` sobrevive a `addRecipe` y a `produce`.
   - `test/presentation/playModePresenter.test.ts` — `strategy` (default `TEMPORAL`) y `setStrategy` con notify; `produce()` con éxito en `POR_ACCIONES` dispara la cascada excluyendo al poseído y en `TEMPORAL` no; `produce()` fallido no dispara nada; `advance()` ejecuta a todos, **excluye al poseído**, notifica solo con producciones y devuelve el conteo.
   - `test/components/PlayMode.test.tsx` — selector visible con "Temporal" marcado por defecto y conmutable (refleja el store); botón "Avanzar" solo visible en `POR_ACCIONES` sin posesión y su click produce; un clic manual mueve a los agentes de fondo; con `vi.useFakeTimers()`: en `POR_ACCIONES` avanzar el tiempo no produce y al volver a `TEMPORAL` se reanuda (los tests de #13 siguen verdes).
   - `test/components/DesignMode.test.tsx` — "Recetas por acción: 1" por defecto en el catálogo; crear con `3` (y el formulario vuelve a `1`); valor `0` ⇒ mensaje de error y no se crea.
   - `test/domain/worldTransfer.test.ts` — `buildExport` incluye el campo; roundtrip lo conserva; archivo anterior sin el campo ⇒ `1`; campo inválido (`0`) ⇒ `INVALID_STRUCTURE` en `agents[0].recipesPerAction` y nada importado.
   - `test/e2e/userJourneys.test.tsx` — journey 16: diseño (2 agentes con "Recetas por acción" = 2, reglas) → juego → elegir "Por acciones" → poseer A → usar receta → B ejecuta 2 producciones y A solo la suya → liberar → "Avanzar" → todos producen → volver a "Temporal" → el tick vuelve a correr.
10. **Documentación**
    - Entrada `#18` marcada en `docs/backlog.md` y este documento con las AC en `[x]`.
    - AC de `docs/ejecutar-reglas-agentes-no-poseidos.md` actualizada ("una acción por agente por tick" → "hasta `recipesPerAction` (por defecto 1) por disparador") y su nota de suggestions.
    - `AGENTS.md`: nota sobre las dos estrategias de activación.

## Out of scope

- Persistir la estrategia entre sesiones (localStorage) o exportarla con el mundo.
- Editar "Recetas por acción" de un agente ya creado (hoy el agente no es editable: ni nombre ni inventario).
- Feedback visible de la actividad automática (log, contador de producciones del último disparo).
- Estrategias adicionales (por demanda, por eventos externos) o cambiar el ritmo del tick.
- Ejecutar reglas del agente poseído de forma automática (sigue siendo manual: #12).

## Suggestions (your call)

Decisiones tomadas durante la implementación:

- **Aplicar N también a temporal**: sí. La AC de #13 quedó actualizada a "hasta `recipesPerAction` (por defecto 1) por disparador"; con N=1 por defecto ningún test previo cambió de resultado.
- **Campo requerido vs opcional en `AgentDraft`**: se eligió **opcional** (`recipesPerAction?: number` con `recipesPerActionOf()` → `1`). Evita tocar los ~26 `create({ name, inventory })` existentes y da compatibilidad con archivos de importación antiguos; el valor del formulario nunca llega vacío porque `Number('') = 0` y eso ya falla la validación.
- **Nombre de código**: `recipesPerAction`, igual que la etiqueta "Recetas por acción".
- **`StrategyStore` propio vs estado en `PlayModePresenter`**: se eligió store para que la estrategia sobreviva al cambio diseño↔juego (el presentador se recrea al montar `PlayMode`).

Pendientes (si quieres seguir):

- **Cap superior para N** (p. ej. 99): evita un "Avanzar" que dispare cientos de producciones seguidas. Hoy la validación es solo `entero ≥ 1`.
- **Botón "Avanzar" también con posesión**: la AC lo limita a "sin poseído"; alternativa útil para "purgar" la economía a tu ritmo incluso controlando a alguien (`advance()` ya está preparado para eso: solo excluye al poseído).
- **Persistir la estrategia**: hoy se resetea a "Temporal" al recargar la página; podría guardarse en `localStorage` junto al mundo (sin entrar en el export).
- **Orden del selector**: "Temporal" primero (es el comportamiento por defecto y el ya existente).
