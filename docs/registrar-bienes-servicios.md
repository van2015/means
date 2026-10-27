## Story
Como usuario en modo diseño, quiero registrar bienes y servicios en un catálogo, para reutilizarlos al crear recetas y agentes.

## Acceptance criteria
- [ ] Dado que estoy en modo diseño, cuando registro un bien o servicio con un nombre, entonces aparece en el catálogo de bienes y servicios.
- [ ] Dado que estoy creando una receta, cuando agrego una entrada o salida, entonces puedo elegir un bien o servicio existente del catálogo en lugar de escribir el nombre.
- [ ] Dado que estoy registrando un bien o servicio, cuando dejo el nombre vacío, entonces veo un error y no se guarda.

## Plan
- Añadir una sección en modo diseño para registrar bienes y servicios con nombre.
- Mostrar el catálogo de bienes y servicios registrados.
- Permitir elegir bienes y servicios del catálogo al crear líneas de receta.
- Validar que el nombre no esté vacío al registrar.
- Refrescar el catálogo tras registrar un nuevo bien o servicio.

## Out of scope
- Editar o eliminar bienes/servicios registrados.
- Distinguir entre bienes y servicios (se modelan igual).
- Usar bienes/servicios en agentes (historia #4).
- Modo juego, recetas propias de agentes, reglas automáticas y exportar/importar.

## Suggestions (your call)
- Si al elegir entre bienes/servicios con nombre repetido resulta confuso, mostrar algún identificador adicional (por ejemplo, el ID o la fecha de creación) solo cuando haya colisión.
