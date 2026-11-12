# Historia #10 — Ver el inventario y las recetas del agente poseído

## Story

Como usuario en modo juego, quiero ver el inventario y las recetas del agente que poseo, para decidir qué acciones tomar.

Requires: #8

## Acceptance criteria

- [x] Dado que no poseo ningún agente, entonces no se muestra ninguna sección de inventario ni de recetas.
- [x] Dado que poseo un agente, entonces veo una sección con su inventario: cada línea como "{bien}: {cantidad}" resolviendo el nombre del bien desde el catálogo.
- [x] Dado que poseo un agente sin líneas de inventario, entonces veo un mensaje de inventario vacío.
- [x] Dado que poseo un agente, entonces veo una sección con sus recetas propias: nombre, entradas ("Insumo: {bien}: {cantidad}") y salidas ("Producto: {bien}: {cantidad}").
- [x] Dado que poseo un agente sin recetas propias, entonces veo un mensaje de que no tiene recetas.
- [x] Dado que cambio de agente poseído, entonces inventario y recetas muestran los datos del nuevo agente.
- [x] Dado que los datos cambian en modo diseño (p. ej. se edita una receta del agente), cuando regreso a modo juego, entonces la vista refleja los datos actualizados (lee de los mismos stores, sin copias).

## Plan

1. **Dominio**: sin cambios. `Agent` ya expone `inventory: InventoryLine[]` y `recipes: Recipe[]`; `goodStore` resuelve nombres de bien.
2. **Presentador — `src/presentation/playModePresenter.ts`**:
   - Añadir getter `goods` (desde `goodStore.all()`) para que la UI resuelva `goodName(goods, goodId)` con el helper existente `src/react/catalogHelpers.ts`.
   - El resto (`possessedAgent`, `agents`, `possess`, `release`) ya existe; sin lógica nueva.
3. **UI — `src/react/PlayMode.tsx`**:
   - Nueva sección "Agente poseído" (o dos secciones: "Inventario" y "Recetas") renderizada **solo** si `play.possessedAgent !== null`.
   - Inventario: `ul` con `agent.inventory.map(line => goodName(goods, line.goodId): line.quantity)`; estado vacío "El inventario está vacío".
   - Recetas propias: `article`/`li` por receta con su nombre y las mismas líneas de entrada/salida que `RecipeCatalog` (formato "Insumo: …" / "Producto: …"), en modo solo lectura (sin botones Editar/Eliminar: eso es modo diseño); estado vacío "Este agente no tiene recetas propias".
   - Reutilizar `goodName` y las clases CSS existentes (`section`, `ul`); sin tocar `style.css` salvo imprescindible.
4. **Tests**:
   - `test/presentation/playModePresenter.test.ts`: añadir caso para el nuevo getter `goods`.
   - `test/components/PlayMode.test.tsx`:
     - sin poseído → no aparecen las secciones;
     - con poseído → inventario con nombres resueltos y cantidades;
     - inventario vacío → mensaje;
     - recetas propias con entradas/salidas visibles y sin botones de edición;
     - sin recetas → mensaje;
     - cambiar de poseído → los datos cambian (dos agentes con inventarios distintos).
   - `test/e2e/userJourneys.test.tsx` — journey 10: en modo diseño crear bienes, un agente con inventario y una receta propia → modo juego → poseer → ver inventario y recetas → liberar → secciones desaparecen → volver a poseer → seguir visibles.
5. **Documentación**: marcar `#10` como completado en `docs/backlog.md`.

## Out of scope

- Cambiar prioridad de reglas del agente poseído (historia #11).
- Producir con recetas; consumir/generar bienes (historia #12).
- Ejecución de reglas automáticas en agentes no poseídos (historia #13).
- Exportar/importar (historia #14).
- Editar inventario o recetas desde modo juego (el modo juego es de solo lectura salvo posesión y, más adelante, producción).

## Suggestions (your call)

- **¿Incluir también las recetas del catálogo general?** Planificado no incluirlas: la historia dice "las recetas del agente que poseo", que son sus recetas propias (`agent.recipes`). Las recetas del catálogo serán necesarias en #12 ("producir usando una receta del catálogo o propia"), donde tendrá sentido mostrarlas junto a un botón de producción. Si prefieres verlas ya en #10 como lista separada ("Recetas del catálogo"), es añadir otro bloque con `recipeStore.all()`.
- **Estructura de secciones**: propuesto un único bloque con dos listas bajo "Agente poseído: {nombre}"; alternativa: dos secciones independientes ("Inventario", "Recetas") como en modo diseño.
- **Formato de línea de receta**: reutilizado literal de `RecipeCatalog` ("Insumo: …" / "Producto: …") para no introducir vocabulario nuevo; si se quiere un formato más compacto para juego, tocar solo la nueva vista.
