# Let Him Network — CLI Simulado (H2)

**Estado:** decisiones del equipo, pendiente confirmación de Gabriel. Implementación H2.
**Versión:** 2026-11-26

---

## 1. Concepto

El CLI es **simulado por botones**, no un parser de texto. El estudiante ya conoce IOS, así que el juego no entrena tipeo: el jugador elige una acción, el juego arma el comando IOS equivalente, lo muestra en el terminal «como tecleado» y aplica el efecto al estado.

- No hay input de texto libre, ni historial ↑/↓, ni «pegar», ni abreviaturas, ni errores de sintaxis.
- Los errores solo son **semánticos** (valor equivocado) y se descubren **al Entregar**.
- Las salidas son **aproximadas/didácticas**, generadas desde el estado y etiquetadas como simulación. No se necesitan fixtures literales de IOS.

**Sustituye:** D-19/DEC-13 (comandos tecleados, historial, sin pegar), D-25 («Comando no disponible en laboratorio») y spec 06 regla 2 («única ayuda = cuaderno»; el menú es ahora una guía contextual aceptada).

---

## 2. Tecnología del terminal — ✅ FINAL

**Overlay React con DOM simple** (opción A). Salida en `<div role="log" aria-live="polite">`, botones reales `<button>`, navegación Tab/Enter, sin WebGL, sin dependencias nuevas. Base: `RouterTerminal.tsx`.

- Phaser no captura teclado mientras `labView === 'TERMINAL'` (ya implementado).
- La lógica del CLI vive en el **core como función pura**; la UI es una capa fina.
- xterm.js solo se reconsidera si algún día vuelve el texto libre. Phaser nativo y `DOMElement` híbrido: descartados.

---

## 3. Menús por modo

Máximo 5 botones, hasta 7 donde haga falta. **Los menús dependen del rol del router.**

| Modo (prompt) | Botones | N.º |
| --- | --- | --- |
| USER `>` | `enable`, `show…`, `help`, `exit`, `?` | 5 |
| PRIVILEGED `#` | `configure terminal`, `show…`, `ping`, `copy running-config startup-config`, `erase startup-config`, `reload`, `?` | 7 |
| CONFIG `(config)#` | `interface <G/F>0/0`, `interface <G/F>0/1`, `interface loopback` *(solo R2 y R3)*, `router rip`, `exit`, `end`, `?` | 7 (R1: 6) |
| CONFIG-IF `(config-if)#` | `ip address`, `shutdown`, `no shutdown`, `exit`, `end`, `?` | 6 |
| CONFIG-ROUTER `(config-router)#` | `network`, `no network`, `version 1`, `exit`, `end`, `?` | 6 |

Reglas:
- **`show…`** abre un selector. PRIVILEGED: `running-config`, `startup-config`, `ip route`, `ip interface brief`. USER: solo `ip route` e `ip interface brief`.
- **`?`** imprime en el terminal la lista de opciones del modo actual. **`help`** (solo USER) imprime una explicación breve de cómo funciona el CLI simulado. Son distintos.
- **Nombre de interfaz real:** físicos 1–8 → `GigabitEthernet0/x` (G); físicos 9–12 → `FastEthernet0/x` (F). El rol del PDF (G0/0, G0/1) se conserva en datos; **nunca cambiar IPs por la letra** (spec 07, ✅).
- **`interface loopback`** aparece solo en R2 (Loopback2) y R3 (Loopback3), con el número fijo por rol. R1 no la tiene.
- Transiciones: `enable` USER→PRIV · `configure terminal` PRIV→CONFIG · `interface …` CONFIG→CONFIG-IF · `router rip` CONFIG→CONFIG-ROUTER · `exit` baja un nivel (en CONFIG vuelve a PRIV) · `end` desde cualquier modo de configuración vuelve a PRIV. PRIVILEGED no tiene `exit`/`disable`. `exit` en USER cierra la sesión: el terminal muestra «Sesión cerrada. Pulse Enter» y vuelve a USER.
- **Estado inicial de interfaces:** `shutdown` hasta que el jugador ejecute `no shutdown`.
- **Hostname:** el jugador **no puede cambiarlo** (no hay botón). Solo puede venir de una configuración previa sorteada (ver §5).

---

## 4. Botones con valor

`ip address`, `network` y `ping` abren una **lista de opciones** definida **por topología** (hoy solo T1) y generada desde `AddressPlan`, no escrita a mano en la UI.

- **Solo valores correctos del escenario. Sin señuelos.** El error posible es elegir el valor equivocado entre los existentes (por ejemplo, la IP de otra interfaz).
- `ip address`: primero lista de IPs de interfaces de **toda** la topología (no solo del router actual) y luego lista de máscaras (`255.255.255.0`, `255.255.0.0`). Comando resultante: `ip address <ip> <mask>`.
- `network`: las redes mayores del escenario (`192.168.10.0`, `192.168.20.0`, `192.168.30.0`, `192.168.40.0`, `172.16.0.0`, `172.17.0.0`). `no network` lista las ya configuradas.
- `ping`: IPs de PCs, gateways, interfaces de routers y loopbacks.
- Sin validación inmediata. Repetir el comando sobrescribe el valor. Toda lista incluye «Cancelar».
- Las listas viven en datos (`scenario`/`cliMenu`) para soportar otras topologías después.

---

## 5. Persistencia y comportamiento por router

Cada router (R1, R2, R3) tiene **running** (memoria activa) y **startup** (memoria guardada).

- **Estructura:** objeto estructurado, no strings. Usar `Record`, **nunca `Map`**. El texto IOS de `show running-config` / `show startup-config` se deriva con una función pura.
- `copy running-config startup-config`: copia running → startup.
- `erase startup-config`: deja startup vacío; **no toca running**.
- `reload`: running ← startup (o configuración vacía si fue borrada). **El hostname se conserva si estaba en startup**: tras `reload` el prompt usa ese hostname; si startup está vacío, `Router`.
- `erase` y `reload` piden una confirmación simple en el terminal (botones `Confirmar` / `Cancelar`). `reload` **no** pregunta si guardar los cambios.
- `reload` muestra 3–4 líneas de arranque didácticas durante ~2 s y luego el prompt en modo USER. Duración en una constante. *(Por defecto.)*
- **Configuración previa:** al iniciar, cada router puede tener una startup sorteada de forma reproducible por `seed` (puede ser vacía; puede incluir hostname, IPs equivocadas, interfaces apagadas, redes RIP). Al inicio running = startup.
- **Obligatorio:** ejecutar `erase` + `reload` en los tres routers, incluso si empiezan vacíos. **No se bloquea nada**; ver §9.
- Cada router guarda `eraseReloadDone: boolean` y `erasedSinceBoot: boolean`. `erase` pone `erasedSinceBoot=true`; un `reload` con `erasedSinceBoot=true` pone `eraseReloadDone=true` y limpia el otro flag.
- Config y sesión van **separadas**: la configuración en `GameState.routers`, la sesión en `GameState.sessions`.

---

## 6. Consola física

- El terminal solo funciona si `consoleLink.connectedRouter !== null`. Si no, botones deshabilitados y mensaje «Conexión interrumpida».
- **Sesión independiente por router** (modo, historial de salida, confirmación pendiente).
- **Mover el cable R1 → R2:** se invalida la sesión de R1; la **misma ventana** muestra «Conexión interrumpida», pide Enter y luego abre la sesión de R2. Ningún comando llega al router anterior: la sesión captura `routerId` al abrirse.
- **Reconectar al mismo router reanuda su sesión** (mismo modo e historial).
- La invalidación se hace en el **reducer del core**, no en `BaseLabScene`.
- **PuTTY simulado:** una ventana; solo COM editable (Serial, 9600 y el resto fijos). Si el COM no es el del PC o no hay consola conectada → «No se pudo abrir el puerto COMn» y no se abre sesión. Rango de COM 3–9, distinto por PC, sorteado al inicio y estable todo el lab. *(Por defecto; constante.)*
- Botón «Cerrar» vuelve a la vista PC.

---

## 7. Terminal del PC

El terminal del PC (ahora mock) también funciona por botones: `ipconfig`, `ping`, `clear`, `help`. `ping` abre la lista de destinos igual que en el router (§4). La configuración IP del PC sigue en su app de ajustes. El resultado real del ping depende de H3; hasta entonces responde «Ping no disponible hasta H3».

---

## 8. Evaluación y devolución (H7 — no implementar en H2)

- **La rúbrica no cambia:** 20 físico / 20 IP / 20 RIP / 40 ping (spec 06, ✅ Gabriel).
- Se evalúa la **configuración activa (running) al pulsar Entregar**. Guardar o no guardar **no importa**.
- El monitor muestra: **(1)** animación del recorrido del ping, ida y vuelta, **que se detiene donde falla** y muestra el mensaje de la causa; **(2)** **checklist ✓/✗ por router**; **(3)** nota total en texto y efectos de sonido, sin voces.
- La animación sale del `PingTrace` del snapshot evaluado, nunca de suposiciones de UI (spec maestra, 03, 04 E-06). Hay versión estática para movimiento reducido. Si no se puede probar la causa: «No se pudo determinar». El diagnóstico va del bloqueo causal más temprano y una sección «Otros errores».
- **Checklist por rol:**
  - **R1:** G0/0, G0/1 y RIP.
  - **R2:** G0/0, G0/1, Loopback2 y RIP.
  - **R3:** G0/0, G0/1, Loopback3 y RIP.
  - «Interfaz correcta» = IP y máscara correctas **y** `no shutdown`. «RIP correcto» = redes del router anunciadas (spec 02; Claude Code verifica allí si se exige `version 1` y la red de loopback).
- Si el jugador no ejecutó `erase` + `reload` en un router, el monitor **avisa**, **sin restar puntos**.
- Entregar sigue siendo página aparte, accesible siempre, nunca dentro del terminal.

---

## 9. Resumen de decisiones sobre procedimiento

| Tema | Decisión |
| --- | --- |
| `erase` + `reload` | Obligatorios pero **no bloquean**; aviso en el monitor, sin restar puntos |
| Qué se evalúa | Running al Entregar |
| Prompt tras `reload` | Hostname guardado en startup, si lo había; si no, `Router` |
| Valores | Solo correctos, sin señuelos |
| Ping PC | Por lista de destinos |
| Monitor | Animación + checklist ✓/✗ por router |

---

## 10. Cambios técnicos (core primero)

```
src/core/types.ts     # reemplazar RouterState actual (runningConfig:string + Map) por:
                      #   RouterId = 'R1'|'R2'|'R3'
                      #   RouterConfig { hostname; interfaces: Record<string,{ip,mask,shutdown}>; rip:{enabled;version:1|null;networks:string[]} }
                      #   RouterState { running: RouterConfig; startup: RouterConfig|null; eraseReloadDone; erasedSinceBoot }
                      #   TerminalSession { routerId; mode: ExecMode; output: string[]; pendingConfirm?: 'erase'|'reload'; interfaceContext?: string; awaitingEnter: boolean }
                      #   GameState += routers: Record<RouterId,RouterState>; sessions: Record<RouterId,TerminalSession>; subir schemaVersion
src/core/cliMenu.ts   # menús por modo y rol; listas de valores desde AddressPlan; nombres G/F por router físico
src/core/cli.ts       # función pura (estado, routerId, opción) -> { estado, líneas }; deriveConfigText(config)
src/core/reducer.ts   # EXEC_CLI_OPTION; invalidar/abrir sesión en CONNECT/DISCONNECT_CONSOLE; reset en RESET_GAME y try again
src/ui/RouterTerminal.tsx   # overlay A: salida con role="log", botones, selector de valor con «Cancelar», «Conexión interrumpida»+Enter, ventana PuTTY
src/ui/PcTerminalView.tsx   # migrar a botones (§7)
src/ui/LabShell.tsx         # integrar
```
- Un solo punto de entrada: `EXEC_CLI_OPTION` pasa por `cli.ts`. No crear acciones sueltas `ERASE_CONFIG`/`COPY_CONFIG` que se salten el menú.
- Config previa sorteada por `seed` en `scenario.ts`.

---

## 11. Pruebas (H2 termina cuando pasan)

- `copy` persiste; `erase` no cambia running; `reload` aplica startup o vacío, conserva hostname; `erase` sin `reload` mantiene running (N-08).
- Flags `erasedSinceBoot`/`eraseReloadDone` en los casos: solo erase, solo reload, erase+reload, reload+erase.
- Menús por modo y por rol (R1 sin loopback; R2/R3 con ella); nombres G/F según router físico; transiciones de modo.
- Listas de valores solo con valores del `AddressPlan` para X/Y distintos.
- Mover cable R1→R2 invalida R1, pide Enter, abre R2 y ningún comando llega a R1; reconectar reanuda; desconectar deshabilita botones.
- Al menos una prueba desde la UI con teclado y puntero (spec 02: un atajo del core no reemplaza una prueba UI).
- Verificación en Chrome de que Phaser no roba el foco con el terminal abierto.

**Fuera de H2:** motor RIPv1/ping/`show ip route` con rutas RIP (H3); monitor, animación y checklist (H7). En H2 `show ip route` imprime solo rutas conectadas.

---

## 12. Qué debe actualizar Claude Code en el repo

1. **Crear o reemplazar `docs/specs/09_CLI_SIMULADO_H2.md`** con el contenido de este documento (si ya existe un 09, reemplazarlo; esta versión lo sustituye). Añadirlo al mapa en `docs/specs/00_LEEME_Y_MAPA_DE_SPECS.md`.
2. **`docs/DECISIONES.md`**: una fila por cada una, fecha 2026-11-26, fuente «equipo»:
   - `CLI-SIM` ✅ equipo, pendiente Gabriel (sustituye D-19, D-25 y «única ayuda»).
   - `CLI-MENU` ✅ (§3).
   - `CLI-VAL` ✅ (§4, solo valores correctos).
   - `CLI-PERSIST` ✅ (§5, incluye hostname tras reload y running evaluado).
   - `CLI-PROC` ✅ (erase/reload no bloquea; aviso sin restar).
   - `CLI-CONSOLA` ✅ (§6, reconectar reanuda).
   - `CLI-PC` ✅ (§7).
   - `EVAL-MONITOR` ✅ (§8: animación + checklist ✓/✗ + nota en texto).
   - `TERM-UI` ✅ **final**: overlay React DOM (A).
3. **`docs/specs/01_DECISIONES_PARA_GABRIEL.md`**: marcar D-19 y D-25 como «sustituidas el 2026-11-26 por spec 09, pendiente de confirmar con Gabriel».
4. **Specs 02, 06 y 07**: añadir al final una nota de ajuste que remita a la spec 09 (comandos por botones; devolución con animación y checklist; se mantienen `erase`/`reload`, F/G, rúbrica 20/20/20/40). En 06, matizar regla 2 (el menú es guía contextual aceptada) y la devolución «solo texto» (ahora incluye animación y checklist; sigue sin voces).
5. **`docs/specs/08_ESTADO_Y_PROXIMOS_HITOS.md`** (fila CLI y fila H2) y **`docs/ESTADO.md`**: H2 «spec 09 lista; implementación pendiente». Quitar de pendientes de H2 los fixtures literales, el prompt tras reset y «qué permite configurar antes de borrar».
6. **`CLAUDE.md`**: añadir que el CLI es por botones y que `docs/specs/09_CLI_SIMULADO_H2.md` manda sobre la 07 y la 01 en este punto.
7. Implementar H2 según §10–§11 y, al terminar, registrar comando, prueba, resultado y limitaciones en `docs/ESTADO.md`. No empezar H3.