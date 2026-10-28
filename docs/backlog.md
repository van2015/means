# Backlog

## Context
Aplicación de crafting/economía para juegos. Un único usuario alterna entre modo diseño y modo juego. En modo diseño crea y gestiona bienes, servicios, recetas, agentes, recetas propias de agentes y reglas automáticas. En modo juego el jugador no tiene inventario: posee un agente a la vez (o ninguno) y controla manualmente al poseído. Incluso cuando posee un agente, el resto de los agentes sigue ejecutando sus reglas automáticas. El usuario puede exportar e importar selecciones del mundo.

**Stack:** TypeScript full-stack (React + Node.js + SQLite)

**Expensive decisions:** none

## Backlog

- [x] **#1** Como usuario en modo diseño, quiero crear una receta con varias entradas y salidas y sus cantidades, para definir cómo se producen bienes y servicios.
- [x] **#2** Como usuario en modo diseño, quiero editar y eliminar recetas, para mantener el catálogo actualizado. Requires: #1
- [x] **#3** Como usuario en modo diseño, quiero registrar bienes y servicios en el catálogo, para usarlos en recetas y agentes.
- [x] **#4** Como usuario en modo diseño, quiero crear agentes y asignarles un inventario inicial, para modelar actores en la economía. Requires: #3
- [x] **#5** Como usuario en modo diseño, quiero crear, editar y eliminar recetas propias de un agente, para definir sus métodos de producción particulares. Requires: #1, #4
- [ ] **#6** Como usuario en modo diseño, quiero configurar reglas automáticas de producción/consumo para los agentes, para que actúen de forma autónoma. Requires: #1, #4
- [ ] **#7** Como usuario, quiero cambiar entre modo diseño y modo juego, para enfocarme en crear contenido o en jugar.
- [ ] **#8** Como usuario en modo juego, quiero ver los agentes disponibles y poseer uno, para controlarlo. Requires: #4
- [ ] **#9** Como usuario en modo juego, quiero cambiar de agente poseído o dejar de poseer ninguno, para gestionar mi conjunto de agentes. Requires: #8
- [ ] **#10** Como usuario en modo juego, quiero ver el inventario y las recetas del agente que poseo, para decidir qué acciones tomar. Requires: #8
- [ ] **#11** Como usuario en modo juego, quiero producir usando una receta del catálogo o propia del agente poseído, para que consuma de su inventario y genere resultados. Requires: #1, #5, #8
- [ ] **#12** Como usuario en modo juego, quiero que los agentes no poseídos ejecuten sus reglas automáticas mientras controlo a otro, para que el resto de la economía siga funcionando. Requires: #6, #8
- [ ] **#13** Como usuario, quiero exportar e importar una selección de elementos del mundo (recetas, bienes/servicios, agentes o reglas), para compartir o respaldar partes del juego. Requires: #1
