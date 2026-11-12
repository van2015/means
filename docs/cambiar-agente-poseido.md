# Historia #9 — Cambiar de agente poseído o dejar de poseer ninguno

## Story

Como usuario en modo juego, quiero cambiar de agente poseído o dejar de poseer ninguno, para gestionar mi conjunto de agentes.

Requires: #8

## Acceptance criteria

- [x] Dado que poseo un agente, cuando pulso "Poseer" en otro agente de la lista, entonces la posesión cambia a ese agente y el indicador lo refleja (p. ej. "Poseído: Obrero").
- [x] Dado que poseo un agente, cuando pulso "Dejar de poseer", entonces ningún agente queda poseído y el indicador muestra "No posees a ningún agente".
- [x] Dado que ningún agente está poseído, entonces no se muestra el botón "Dejar de poseer".
- [x] Dado que cambio o dejo de poseer, cuando vuelvo a modo diseño y regreso a modo juego, entonces el estado de posesión sigue siendo el último guardado (sobrevive al cambio de modo).
- [x] Dado que solo existe un agente, entonces puedo liberarlo y volver a poseerlo sin errores.

## Plan

1. **Dominio**: sin cambios. `PossessionStore.possess()` ya sustituye la posesión y `release()` ya limpia el estado; ambos están probados desde #8 (`test/domain/possessionStore.test.ts`: "replaces the possessed agent…" y "release clears the possession").
2. **Presentador / hook**: sin cambios funcionales. `PlayModePresenter.release()` y `usePlayMode().release()` ya existen desde #8.
3. **UI — `src/react/PlayMode.tsx`** (único cambio funcional):
   - Quitar el `disabled={play.possessedAgentId !== null}` de los botones "Poseer" para permitir el cambio directo de posesión.
   - Añadir botón "Dejar de poseer" junto a la línea de estado, visible solo cuando `play.possessedAgent !== null` (guard en la propia UI; `release()` en dominio ya es idempotente).
   - Mantener la etiqueta "Poseído" en la fila del agente poseído (esa fila no muestra botón "Poseer", así que no se puede "re-poseer" a sí mismo).
4. **Tests**:
   - `test/components/PlayMode.test.tsx`:
     - Reemplazar el test "disables the remaining buttons while an agent is possessed" (afirmaba el contrato de #8) por "switches possession when clicking another agent".
     - Nuevo test: liberar con "Dejar de poseer" → indicador de vacío + botón desaparece.
     - Nuevo test: sin poseído no existe "Dejar de poseer".
   - `test/e2e/userJourneys.test.tsx`:
     - Ajustar journey 7: la fila de los demás botones ya no está deshabilitada (quitar la aserción `toBeDisabled` y el comentario que remite a #9).
     - Nuevo journey 9: poseer A → poseer B (cambio reflejado en UI) → "Dejar de poseer" → vacío → volver a poseer → cambiar de modo y comprobar persistencia.
   - `test/presentation/playModePresenter.test.ts` y `test/domain/possessionStore.test.ts`: sin cambios necesarios (release ya cubierto); se añade solo si aparece lógica nueva.
5. **Documentación**: marcar `#9` como completado en `docs/backlog.md`.

## Out of scope

- Ver inventario y recetas del agente poseído (historia #10).
- Cambiar prioridad de reglas del agente poseído (historia #11).
- Producir con recetas y ejecutar reglas automáticas (historias #12 y #13).
- Exportar/importar (historia #14).
- Borrado de agentes (sin historia; si existiera, definir qué pasa con la posesión del agente borrado — `PossessionStore.possessed()` ya devuelve `null` en ese caso).

## Suggestions (your call)

- **Dónde vive el botón "Dejar de poseer"**: propuesto junto a la línea de estado ("Poseído: X") porque es una acción sobre la posesión actual, no sobre un agente de la lista. Alternativa: una acción por fila en el agente poseído.
- **Cambio directo vs. confirmación**: asumido cambio directo sin confirmación (la acción es reversible al instante y no hay efectos secundarios todavía; cuando haya producción (#12) convendrá revisarlo).
- El botón "Poseer" del agente ya poseído no aparece (su fila muestra "Poseído"), por lo que no hace falta deshabilitarlo explícitamente.
