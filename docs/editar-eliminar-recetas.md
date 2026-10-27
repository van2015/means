## Story
Como usuario en modo diseño, quiero editar y eliminar recetas del catálogo, para mantener la información de producción actualizada.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño y existe una receta, cuando la selecciono para editar, cambio su nombre, entradas o salidas y guardo, entonces el catálogo muestra la receta actualizada.
- [ ] Dado que estoy en modo diseño y existe una receta, cuando la elimino, entonces desaparece del catálogo.
- [ ] Dado que estoy editando una receta, cuando dejo entradas, salidas o cantidades inválidas, entonces veo errores de validación y la receta no se actualiza.

## Plan
- Permitir modificar y borrar recetas desde el almacén de recetas.
- Mostrar controles de editar y eliminar junto a cada receta en el catálogo.
- Reutilizar el formulario de recetas para cargar la receta seleccionada en modo edición.
- Aplicar las mismas validaciones al editar que al crear.
- Refrescar el catálogo tras guardar una edición o eliminar una receta.

## Out of scope
- Operaciones en lote.
- Deshacer cambios.
- Diálogos de confirmación al eliminar.
- Gestión independiente del catálogo de bienes y servicios.

## Suggestions (your call)
- Extender el presentador del modo diseño para manejar creación y edición, en lugar de duplicar la lógica del formulario.
