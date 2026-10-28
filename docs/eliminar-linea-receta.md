## Story
Como usuario en modo diseño, quiero eliminar una línea de entrada o salida al crear o editar una receta, para corregir errores sin tener que empezar de cero.

## Acceptance criteria
- [ ] Dado que estoy creando una receta, cuando agrego varias líneas de entrada/salida y elimino una de ellas, entonces la línea desaparece del formulario.
- [ ] Dado que estoy editando una receta, cuando elimino una línea de entrada o salida existente y guardo, entonces la receta se guarda sin esa línea.

## Plan
- Añadir un control de eliminar en cada línea del formulario de recetas.
- Permitir eliminar líneas de entrada y de salida desde el presentador de recetas.
- Refrescar el formulario tras eliminar una línea.

## Out of scope
- Eliminar líneas de inventario de agente (historia #17).
- Eliminar líneas de recetas propias de agente.
- Reordenar líneas.

## Suggestions (your call)
- Añadir el botón de eliminar directamente en `RecipeLineForm` para reutilizarlo en entradas, salidas y futuras recetas de agente.
