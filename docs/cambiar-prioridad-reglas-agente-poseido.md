# Historia #11 — Cambiar la prioridad de las reglas del agente poseído

## Story

Como usuario en modo juego, quiero cambiar la prioridad de las reglas automáticas del agente que poseo, para ajustar su comportamiento autónomo.

Requires: #6, #8

## Acceptance criteria

- [x] Dado que no poseo ningún agente, entonces no se muestra ninguna sección de reglas.
- [x] Dado que poseo un agente, entonces veo sus reglas automáticas con la receta, la condición y la prioridad actual, ordenadas de menor a mayor prioridad.
- [x] Dado que poseo un agente sin reglas, entonces veo un mensaje de que no tiene reglas automáticas.
- [x] Dado que cambio la prioridad de una regla y guardo, entonces la lista se reordena según la nueva prioridad.
- [x] Dado que introduzco un valor vacío o no numérico y guardo, entonces se muestra un error, la prioridad no cambia y la lista no se reordena.
- [x] Dado que cambio de agente poseído, entonces veo las reglas del nuevo agente.
- [x] Dado que cambio una prioridad, cuando vuelvo a modo diseño y regreso a modo juego, entonces el cambio persiste (misma tienda, sin copias).

## Plan

1. **Dominio — `src/domain/agentStore.ts`**:
   - Nuevo método `updateRulePriority(agentId, ruleId, priority)`: encuentra agente y regla (devuelve `AGENT_NOT_FOUND` / `RULE_NOT_FOUND`), valida la prioridad, reemplaza solo el `priority` conservando `recipeRef` y `condition`, reordena con el mismo `sort` que ya usan `addRule`/`updateRule` y persiste con `replaceAgent`.
   - Validación de prioridad: nueva clase de error `INVALID_PRIORITY` en `RuleError` (`src/domain/agent.ts`) para prioridades que no sean números finitos. `updateRule`/`addRule` de modo diseño no cambian (ver out of scope).
   - Tests en `test/domain/agentStore.test.ts`: prioridad actualizada + reordenada, `INVALID_PRIORITY` sin cambio de estado, `RULE_NOT_FOUND`, `AGENT_NOT_FOUND`.
2. **i18n — `src/i18n/errors.ts`**: caso `INVALID_PRIORITY` → "La prioridad debe ser un número válido".
3. **Helpers compartidos — `src/react/catalogHelpers.ts`**: extraer `recipeName(recipeRef, catalogRecipes, agentRecipes)` y `operatorLabel(operator)` desde `AgentCatalog.tsx` (que los tiene privados) para reutilizarlos en la vista de juego. `AgentCatalog` pasa a importarlos.
4. **Presentador — `src/presentation/playModePresenter.ts`**:
   - Nueva dependencia `recipeStore` (para resolver el nombre de la receta referenciada por cada regla: fuente `catalog` o `agent`).
   - Estado de borrador de prioridades: `priorityDrafts: Map<ruleId, string>` con `setPriorityDraft(ruleId, value)` (el componente renderiza el borrador si existe, si no `String(rule.priority)`).
   - `submitPriority(ruleId)`: valida el borrador (vacío o no finito → `INVALID_PRIORITY` en `error`), delega en `agentStore.updateRulePriority`, limpia el borrador y notifica.
   - `usePlayMode` expone: `setPriorityDraft`, `submitPriority`, `priorityDraft(ruleId)`.
5. **UI — `src/react/PlayMode.tsx`**: tercer bloque dentro del `section` del agente poseído, "Reglas de {nombre}":
   - `ul aria-label="Reglas del agente poseído"` con una fila por regla (ya vienen ordenadas de la tienda): "{receta} — {operador} {cantidad} {bien} (prioridad: N)" + `input type="number"` (aria-label indexado "Prioridad de la regla {i}", patrón de etiquetas numeradas ya usado en el repo) + botón "Guardar prioridad".
   - Estado vacío: "Este agente no tiene reglas automáticas."
   - Los errores ya se pintan con el `role="alert"` existente.
   - Sin tocar `style.css` (reutiliza `section`/`ul`/`button`).
6. **Tests**:
   - `test/presentation/playModePresenter.test.ts`: borrador por regla, `submitPriority` válido actualiza y limpia, inválido pone `error` sin tocar la tienda, notificación a suscriptores.
   - `test/components/PlayMode.test.tsx`: secciones ocultas sin poseído; reglas visibles y ordenadas; guardar reordena; valor inválido → alerta y prioridad intacta; cambio de poseído cambia las reglas; mensaje sin reglas.
   - `test/e2e/userJourneys.test.tsx` — journey 11: modo diseño (bienes + receta + agente + 2 reglas con prioridades 1 y 2) → modo juego → poseer → reglas ordenadas → cambiar la prioridad 2 por 0 → reordenada → volver a diseño y regresar → persiste.
7. **Documentación**: marcar `#11` en `docs/backlog.md`.

## Out of scope

- Producir con recetas (historia #12).
- Ejecución de reglas automáticas en agentes no poseídos (historia #13); `ruleEngine.applicableRules` ya preserva el orden de la tienda, no tocar.
- Crear/eliminar reglas o cambiar su receta/condición desde modo juego (sigue siendo modo diseño; #11 solo cambia prioridad).
- Validación de prioridad en el formulario de modo diseño (`validateRule` no recibe la prioridad; `Number('')` es `0`, así que hoy modo diseño acepta prioridad vacía) — ver suggestions.

## Suggestions (your call)

- **Control de prioridad**: propuesto número absoluto + botón "Guardar", consistente con el input de prioridad de modo diseño. Alternativa: botones subir/bajar (más cómodo para reordenar, pero implica prioridades relativas y rompe la consistencia con modo diseño).
- **Extraer `recipeName`/`operatorLabel` a `catalogHelpers`**: planificado para no duplicar la lógica de resolución de reglas entre vistas; toca `AgentCatalog` solo como import.
- **Gap de validación en modo diseño**: se puede abrir un ticket aparte para validar prioridad en `validateRule` (ambos modos compartirían `INVALID_PRIORITY`); no incluido aquí para no ampliar el alcance de #11.
