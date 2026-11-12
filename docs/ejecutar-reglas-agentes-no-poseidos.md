# Historia #13 — Ejecutar reglas automáticas de los agentes no poseídos

## Story

Como usuario en modo juego, quiero que los agentes no poseídos ejecuten sus reglas automáticas mientras controlo a otro, para que el resto de la economía siga funcionando.

Requires: #6, #8

## Acceptance criteria

- [x] Dado que estoy en modo juego y existe al menos un agente no poseído con reglas cuya condición se cumple, cuando avanza el bucle de juego, entonces ese agente ejecuta una producción automática (consume sus entradas y genera sus salidas).
- [x] Dado que poseo un agente, entonces ese agente NO ejecuta reglas automáticamente (lo controlo manualmente), mientras el resto de los agentes sí.
- [x] Dado que nadie está poseído, entonces todos los agentes ejecutan sus reglas.
- [x] Dado que un agente tiene varias reglas aplicables, se intenta primero la de mayor prioridad (menor número); si esa no puede ejecutarse por falta de material, se intenta la siguiente.
- [x] Dado que la condición de una regla no se cumple, entonces esa regla no se ejecuta en ese tick.
- [x] Dado que el bucle está activo en modo juego, cuando cambio a modo diseño, entonces el bucle se detiene; al volver a modo juego se reanuda.
- [x] Dado que una regla apunta a una receta ya borrada o falta material (fallos previsibles), entonces el bucle continúa con los demás agentes/reglas sin mostrar alertas (las alertas son solo para acciones manuales).

## Plan

1. **Dominio — `src/domain/agentStore.ts`**: nuevo método `runAutomaticRules(excludeAgentId: string | null): { agentId: string; ruleId: string }[]`:
   - Itera una **copia** del array de agentes (produce sustituye elementos), salta el `excludeAgentId` (la posesión actual, o nadie si es `null`).
   - Por cada agente: `applicableRules(agent)` de `src/domain/ruleEngine.ts` (ya devuelve las reglas en orden de prioridad porque la tienda las mantiene ordenadas) y, para cada una en orden, intenta `this.produce(agent.id, rule.recipeRef)`; **al primer éxito se detiene para ese agente en ese tick** (una acción por agente por tick) y registra `{ agentId, ruleId }`.
   - Los fallos de `produce` (`INSUFFICIENT_GOOD`, `RECIPE_NOT_FOUND` por receta borrada en modo diseño) se ignoran silenciosamente y se pasa a la siguiente regla/agente.
   - Este es el primer uso en producción de `ruleEngine` (hoy solo lo consumen tests).
2. **Presentador — `src/presentation/playModePresenter.ts`**: método `tick()`:
   - `runAutomaticRules(this.possessionStore.possessedAgentId())`.
   - `notify()` **solo si hubo al menos una producción** (evita re-renders inútiles y avisos `act` en tests cuando el tick no hace nada); devuelve el número de producciones para testear.
3. **Hook — `src/presentation/usePlayMode.ts`**: efecto de bucle:
   - `useEffect` con `setInterval(() => presenter.tick(), PLAY_TICK_MS)` y `clearInterval` en la limpieza; exportar `PLAY_TICK_MS = 1000` para que los tests lo referencien.
   - Como `presenter` es estable (`useState`), el intervalo se crea una sola vez por montaje de `PlayMode` y se destruye al desmontar (cambio a modo diseño ⇒ el bucle se para, AC #6).
4. **UI**: **sin cambios** en `src/react/PlayMode.tsx` — la historia es de comportamiento; no se requiere feedback visible (ver suggestions).
5. **Tests**:
   - `test/domain/agentStore.test.ts` — describe `runAutomaticRules`:
     - produce para agentes no poseídos con regla aplicable;
     - excluye al agente poseído (su inventario no cambia);
     - `null` ⇒ todos corren;
     - prioridad: intenta la de menor número primero y se detiene tras el primer éxito (una sola producción por tick);
     - si la primera por prioridad no puede ejecutarse (falta material), intenta la siguiente;
     - condición no cumplida ⇒ nada;
     - receta borrada (ref colgante) ⇒ la salta sin romper el resto;
     - devuelve `[]` cuando nada se ejecuta.
   - `test/presentation/playModePresenter.test.ts` — `tick()`: produce excluyendo al poseído, notifica solo con producciones, devuelve el conteo, no pone `error`.
   - `test/components/PlayMode.test.tsx` — con `vi.useFakeTimers()` + `act(advanceTimersByTime(PLAY_TICK_MS))`: el intervalo produce en el agente de fondo (assert sobre `stores`, ya que su inventario no se renderiza), el poseído no cambia, y tras `unmount` avanzar el tiempo no produce más (limpieza del intervalo).
   - `test/e2e/userJourneys.test.tsx` — journey 14: diseño (2 agentes con material y regla aplicable) → juego → poseer A → `waitFor` sobre el store a que B produzca (timeout > `PLAY_TICK_MS`) envuelto en `act` → verificar que A (poseído) no cambió → cambiar la posesión a B → la UI muestra el inventario de B ya producido.
6. **Documentación**: marcar `#13` en `docs/backlog.md`.

## Out of scope

- Feedback visible de la actividad de fondo (log, indicadores) — ver suggestions.
- Ejecutar el bucle en modo diseño (se para al salir de modo juego; es una decisión, ver suggestions).
- Limpiar reglas huérfanas cuando se borra una receta del catálogo en modo diseño (produce las salta con `RECIPE_NOT_FOUND`, pero la regla permanece visible con nombre vacío en modo diseño). **Corregido** en `docs/deuda-tecnica.md`: la regla muestra `(receta borrada)` en vez de un nombre vacío (sin borrado en cascada).
- Ejecución del agente poseído de forma automática (el jugador lo controla a mano: #12).
- Velocidad/configuración del tick, prioridades dinámicas, animaciones.

## Suggestions (your call)

- **Una acción por agente por tick**: propuesta para dar ritmo a la economía y que la prioridad sea meaningful tick a tick. Alternativa: ejecutar todas las reglas aplicables en orden hasta agotar material (la economía avanzaría mucho más rápido y la prioridad solo importaría dentro de un tick).
- **`runAutomaticRules` como método de `AgentStore`** (consistente con el resto de mutaciones de agentes) frente a una función en `ruleEngine` que reciba las tiendas; se eligió el store para no acoplar `ruleEngine` a infraestructura.
- **Feedback visible**: si quieres que el jugador "vea" la economía corriendo, podría añadirse una línea tipo "Último tick: N producciones" en modo juego; no forma parte del AC y se puede hacer después.
- **Pausa en modo diseño**: propuesta pausar (el bucle vive en `PlayMode`, que se desmonta). Alternativa: mantenerlo en `App` para que la economía corra también al editar; cambia el AC #6 y sorprendería al editar reglas mientras la economía cambia.
