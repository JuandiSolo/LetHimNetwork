# Let Him Network — Estado del diseño y siguiente trabajo

**Corte:** 24 nov 2026. Este documento es el mapa de seguimiento; las reglas completas viven en la spec maestra y documentos 01–07. ✅ Expreso = decidido por Gabriel; 🟡 propuesta = decisión técnica delegada o aún por revisar; ⬜ pendiente. Ningún hito de programación se ha ejecutado en este paquete.

## Qué ya existe en las specs

| Tema | Estado | Fuente principal |
| --- | --- | --- |
| Alcance | ✅ Fase 1 T1/IPv4/RIPv1; Phaser 4 + React + TypeScript; GitHub Pages; Chrome escritorio; sin guardado ni login | Maestra, 00 |
| Inicio | ✅ X/Y al entrar; fijo dentro del lab, IP calculadas a la vista y en cuaderno; se conserva X/Y en Try again | Maestra, 03 |
| Equipos | ✅ Dos PCs independientes; un switch compartido; juego asigna R1/R2/R3 a tres routers físicos sorteados y fijos por lab. Router «averiado» no asignado es gag | 05 |
| Red | ✅ Seguir íntegramente direcciones y puertos lógicos del PDF; un solo switch con cualquier puerto libre; enlaces directos entre routers; red recalc. sin espera perceptible | 02, 05 |
| Cables | ✅ Directo entre equipos diferentes, cruzado entre iguales, hilos visibles; parrilla misma etiqueta; inventario sin sobrantes; desconectar y reutilizar; LED solo enlace físico; 2 % de no asiento por conexión | 05 |
| Consola | ✅ USB→RJ45 solo consola, datos RJ45↔RJ45; dos COM distintos aleatorios fijos por lab; PuTTY con solo COM editable; una ventana al mover cable, aviso y Enter | 03, 07 |
| CLI | ✅ Comandos completos sin abreviaturas ni pegado, historial ↑/↓; mensaje de no disponible; `erase startup-config` y `reload` obligatorios en los tres siempre | 02, 07 |
| Quiz y ayuda | ✅ Tres preguntas visibles de banco variable, estimado 5–10 y válido desde 3; al aprobar se desbloquean jaula y cuaderno; solo cuaderno como ayuda; quiz no afecta nota | 06 |
| Ping y nota | ✅ Ping manual libre; al Entregar desde cuaderno se comprueban PC-1↔PC-2, gateways y routers; ida y respuesta separadas; monitor muestra bloqueo principal y otros errores; sin ARP perdido | 06 |
| Reintento | ✅ Reinicia quiz/cables/configs/equipos/switch/COM/nota, conserva X/Y; no reanuda estado anterior | 03, 06 |
| Presentación | ✅ Topología con redes/IP derivadas de X/Y; mock funcional primero; texto y sonidos, sin voces; monitor final autorizado por Gabriel; él valida red y semejanza del arte; rendimiento en Chrome/MacBook M5 Pro | 04, 06 |
| Puntuación | ✅ Gabriel aprobó 20 físico + 20 IP + 20 RIP + 40 ping en dos sentidos; 100 si todo está correcto; evaluación final, sin penalizar ensayos | 06 |

## Dos aclaraciones textuales inmediatas

1. **RESUELTO: interfaz F/G del juego.** Físicos 1–8 G0/0/G0/1 y 9–12 F0/0/F0/1; simplificación didáctica explícita de los 2800. No bloquea H2.
2. **RESUELTO: paneles.** Letras A–J, bocas 1–24 por letra, catálogo extensible; falta asignar letra a cada PC físico.
3. **Quiz:** banco variable (aprox. 5–10, válido desde tres entradas), siempre tres visibles por intento. Falta decidir si se exige tres aciertos en la misma ronda o si se acumulan aciertos en varios intentos. **Bloquea cierre de H6, no H0.**

## Pendientes por hito, en orden de impacto

| Hito | Se puede empezar con | Para cerrarlo sin huecos |
| --- | --- | --- |
| **H0 Fundación** | Repo ya creado según Gabriel; stack, plataforma y mocks decididos. Crear app Vite/React/Phaser 4/TypeScript, Core aislado, formulario X/Y, transiciones sin recarga. | URL/slug exacto de GitHub Pages durante el despliegue; versión fijada de dependencias y estructura elegida; prueba en Chrome y MacBook M5 Pro. Gabriel revisa demo. |
| **H1 Escenario y cables lógicos** | PDF de IP, roles, switch único, tipos de cable y 2 % decididos; dataset de ejemplo X/Y. | Pool exacto de PCs/switches y asignación PC físico↔letra; panel A–J/1–24 y F/G ya decididos; cantidad exacta de unidades de cable por tipo y consola; instante del sorteo de asiento y su señal visual. |
| **H2 Consola e IOS** | Parser semántico, modo, estado running/startup y regla borrar/reiniciar decididos. | Catálogo literal de comandos/mensajes y modelo/versión de referencia; respuesta a F/G; boot/erase/reload y configuración previa; duración; qué permite configurar antes de borrar; COM válido/incorrecto; foto del USB→RJ45 real. |
| **H3 RIPv1 y ping** | Direcciones, topología, rutas inmediatas y ausencia de pérdida ARP decididos; validar ida y vuelta. | Política de rutas estáticas si alguien logra ping sin RIP; destinos aceptados en ping manual; formato exacto de `show ip route` y ping si se promete fidelidad IOS; casos classful y retirada de rutas. |
| **H4/H5 PC y jaula** | React y Phaser separados, mocks, switch libre y parrilla emparejada; cable movible. | UX de cabo suelto/cancelar y ocupación de puerto; modelo de PC/terminal, resolución mínima, scroll/zoom, asset anchors y mapa físico; indicador fiable de conector mal asentado. |
| **H6 Flujo/quiz/cuaderno** | Tres visibles, banco variable, quiz gate, X/Y y cuaderno. | Contenido de preguntas y respuestas aprobado por Gabriel; criterio de aciertos por intento; acceso/edición de notas, tecla/botón de cuaderno y plantilla final de diagrama dinámico. |
| **H7 Entrega y monitor** | Entregar tras quiz, nota final, diagnóstico con errores adicionales y Try again completo. | Rúbrica 20/20/20/40 aprobada; escala/umbral de aprobado y mensajes del monitor; resolver cómo se verifica el borrado obligatorio (acción histórica) bajo regla «nota solo resultado final». |
| **H8/H9 Arte y publicación** | Placeholders e IDs/puertos separados del arte; permiso de personas declarado; Chrome/M5 Pro. | Archivos de arte reales, licencia/alcance de logos, comparación visual de aulas por Gabriel, medición de fluidez y corrección de hitboxes; URL publicada y pruebas E2E. |

## Secuencia recomendada ahora

1. Gabriel aclara **tres aciertos por intento**; la asignación PC físico↔letra se revisa cuando traiga fotos. Podemos discutir las demás reglas de H1/H2 por lotes; no hace falta obtener todos los assets antes de H0.
2. El paquete para Claude Code ya está preparado con specs, `CLAUDE.md`, `DECISIONES.md` y `ESTADO.md`; **todavía no se ha incorporado al repositorio de Gabriel ni se ha escrito código**. H0 se limita al esqueleto + entrada X/Y + transición PC↔jaula + build local; para publicar pide la URL real a Gabriel como acordó.
3. Gabriel revisa H0 funcionando y corrige. Luego H1 datos/acciones físicos; H2 CLI con fixtures; H3 rutas/ping; H4–H6 experiencia; H7 nota; H8 arte; H9 cierre. No marcar ✅ un hito solo porque el documento lo describa.

## Regla para Claude Code

La fecha o posición en el documento no otorga autoridad a una **propuesta**. Si una regla ✅ posterior corrige un ejemplo previo, actualizar el párrafo anterior y sus tests; no implementar ambas. Si un pendiente cambia el resultado del hito, detener esa tarea y preguntar a Gabriel. Trabajar en otra tarea independiente entre tanto. Cada hito termina con demo operable, evidencia de pruebas, decisión pendiente explícita y revisión de Gabriel.


## Corrección tras nueva confirmación

Gabriel aprobó F/G por rango físico (1–8 G, 9–12 F), parrillas A–J con 24 tomas por letra y extensión futura, y la rúbrica 20/20/20/40. Arte/fotos adicionales llegan después. H0 puede empezar con mocks; no confundir mapa completo pendiente de PCs/panel con catálogo de bocas ya decidido.
