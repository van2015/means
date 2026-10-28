## Story

Como usuario en modo diseño, quiero crear una receta con varias entradas y salidas y sus cantidades, para definir cómo se producen bienes y servicios.

## Acceptance criteria

- [ ] Dado que estoy en modo diseño, cuando creo una receta con nombre, varias entradas y varias salidas con cantidades, entonces la receta se guarda y aparece en el catálogo.
- [ ] Dado que estoy creando una receta, cuando intento guardarla sin entradas, sin salidas o con cantidades menores o iguales a cero, entonces veo un error de validación y la receta no se guarda.
- [ ] Dado que estoy agregando un insumo o producto, cuando el bien o servicio aún no existe, entonces puedo crearlo en el momento y la receta queda vinculada a él.

## Plan

- Formulario en modo diseño para crear una receta con nombre, entradas y salidas.
- Permitir agregar múltiples líneas de entrada/salida, cada una con un bien/servicio y una cantidad.
- Validar cantidades positivas y que haya al menos una entrada y una salida.
- Guardar la receta con sus entradas y salidas para que persista y aparezca en el catálogo.
- Mostrar el catálogo de recetas con la receta recién creada.

## Out of scope

- Editar o eliminar recetas (historia #2).
- Gestión independiente del catálogo de bienes y servicios (historia #3).
- Agentes, inventarios, modo juego, producción, reglas automáticas y exportar/importar.

## Suggestions (your call)

- Permitir crear bienes y servicios inline solo para que esta primera historia sea usable de punta a punta; la historia #3 se encargará de convertirlos en un catálogo reutilizable.
