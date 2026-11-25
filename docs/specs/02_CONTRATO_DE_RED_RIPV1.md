# Contrato técnico T1 IPv4/RIPv1 — propuesta verificable

**Estado:** borrador derivado de guías y decisiones de Gabriel; los detalles físicos confirmados se especifican en `05_TOPOLOGIA_FISICA_Y_ASSETS_FASE1.md`. Los valores de la guía son hechos; las reglas de simulador marcadas `PROPUESTA` requieren decisión cuando cambien la práctica real. No implementar RIPv2 ni OSPF en esta fase.

## 1. Funciones puras y tipos

`deriveAddresses(input:{section:X,group:Y}) -> Result<AddressPlan, ValidationErrors>`; `applyNetworkAction(state,action) -> state+events`; `deriveLinkState(state) -> LinkStates`; `deriveRoutes(state,tick) -> RouteTables`; `tracePing(state,source,dest,count) -> PingResult`; `grade(state,rubricVersion) -> GradeResult`. La lógica no importa Phaser, React ni reloj del SO. El log de acciones incluye `scenarioVersion`, X, Y, semilla y orden; la misma secuencia produce mismo resultado.

IDs diferenciados: `R1` rol de topología; `routerFisico7` etiqueta de jaula; `GigabitEthernet0/0` interfaz de datos; `CONSOLE` puerto serial de administración; `PC-1` estación; `pc-boca-3` puerto físico por documentar. Una interfaz lógica loopback no acepta cable. Nunca usar posición de un sprite para inferir conexión de red.

## 2. Direcciones dadas por la guía académica

| Rol | Interfaz | Dirección derivada | Máscara/gateway |
| --- | --- | --- | --- |
| R1 | G0/0 | 192.168.10.Y | /24 |
| R1 | G0/1 | 192.168.20.Y | /24 |
| R2 | G0/0 | 192.168.10.(Y+1) | /24 |
| R2 | G0/1 | 192.168.30.1 | /24 |
| R2 | Loopback2 | 172.16.X.Y | /16 |
| R3 | G0/0 | 192.168.20.(Y+1) | /24 |
| R3 | G0/1 | 192.168.40.1 | /24 |
| R3 | Loopback3 | 172.17.X.Y | /16 |
| PC-1 | NIC | 192.168.30.YX | /24, gateway 192.168.30.1 |
| PC-2 | NIC | 192.168.40.YX | /24, gateway 192.168.40.1 |

`YX` es concatenación de números decimales `String(Y)+String(X)`, **no** producto. X=1,Y=1 → 11 y rutas .10.1/.10.2; X=3,Y=12 → 123, R1 .12, R2 .13 y loopback 172.16.3.12. X=10,Y=12 → 1210, **no cabe en un octeto y se rechaza**. Validar todas las direcciones antes de permitir partida: X,Y enteros positivos sin ceros iniciales (PROPUESTA de formato), Y+1 ≤254, `YX` entre 2 y 254 para no ocupar gateway ni red/broadcast, loopback X/Y entre 1 y 254; comprobar duplicados en la misma red, gateway y la subred resultante. El rango institucional real de X/Y está pendiente Q-07; si se proporciona, se aplica además. Un valor inválido no se corrige automáticamente ni inicia escenario parcialmente.

**Cuaderno y feedback:** ambos reciben `AddressPlan` del Core; nadie escribe otra tabla de IP en el frontend. Si la regla de cambiar X/Y durante partida se aprueba, exigir política explícita de reinicio (D-07).

## 3. Caminos que la guía define y los que faltan

Los dos enlaces entre routers son R2 G0/0↔R1 G0/0 en 192.168.10.0/24, R1 G0/1↔R3 G0/0 en 192.168.20.0/24. PC-1↔R2 G0/1 usa 192.168.30.0/24; PC-2↔R3 G0/1 usa 192.168.40.0/24. Loopbacks son 172.16.0.0/16 en R2 y 172.17.0.0/16 en R3. Gabriel confirmó dos PCs físicos, parrilla junto a cada uno, terminación correspondiente dentro de jaula ya unida por cableado interno; el jugador conecta PC→parrilla y salida→switch, y utiliza el puerto libre que prefiera del switch asignado. Los PCs varían; **el juego asigna R1/R2/R3 a tres routers físicos funcionales sorteados**; hay un solo switch físico asignado compartido por ambos PCs, aunque la guía dibuje dos. El cable de datos PC↔parrilla es RJ45↔RJ45. La correspondencia de letras/números y resto del grafo físico siguen FIS-Q4/Q5; no inferirlos de las fotos.

**Invariantes físicos:** puerto de datos con máximo un extremo de cable; cable tiene 0–2 extremos; desconectar libera el puerto; cable de consola no crea enlace IP; un router apagado o G0/x administratively down no debe tener esa red en C/L ni anunciarla; el switch no crea rutas L3; datos persistentes del router no residen en sprites. La política de cable cruzado/directo requiere D-11, a partir del hardware o regla pedagógica aprobada.

## 4. Estado de router e IOS

Para cada router: `runningConfig`, `startupConfig`, `execMode`, `hostname`, `interfaces`, `ripV1`, `terminalSession` separada de configuración, y reloj virtual. Modos: user (`>`), privileged (`#`), config, config-if, config-router. `shutdown/no shutdown`, `ip address`, `interface loopback`, `router rip`, `network`, `version 1` si fixture, `no ...`, `show ip route`, `show ip interface brief`, `show ip protocols`, `show running-config`, `copy running-config startup-config`, `erase startup-config`, `reload`, `ping`. El catálogo definitivo y errores/abrev./? dependen de D-18/19 y fixtures.

**Semántica propuesta:** `copy` persiste running en startup; `erase` borra startup y no cambia inmediatamente running; `reload` sustituye running desde startup o configuración vacía; una sesión abierta sobre cable desconectado se invalida según D-17. Tras mover consola de R1 a R2, la siguiente entrada nunca debe ejecutarse en R1 por accidente. El puerto COM y cable de consola son administración fuera del camino del ping. Gabriel confirmó cable USB→RJ45 solo para consola: USB del PC→toma parrilla→enlace interno→salida jaula→CONSOLE del router. Datos PC↔parrilla usan RJ45↔RJ45. Modelo/pinout/comportamiento de COM quedan pendientes FIS-Q3. Tiempo de boot y convergencia D-20.

**No simular literalmente sin evidencia:** prompt de arranque, confirmación de `reload`, paginación, texto de errores, valor de COM, porcentajes del ping, `show ip route` y orden de syslog. Hasta tener fixture real, etiquetar salida como aproximación y testear **semántica** de estado. Salidas declaradas exactas requieren fixture del mismo modelo/versión/estado.

## 5. Control RIPv1 y reenvío

PROPUESTA técnica: `network` habilita RIPv1 en interfaces elegibles de su red; una interfaz down, no anunciada o con link roto impide formar camino de aprendizaje. Cada ronda de reloj virtual propaga anuncios desde cada vecino alcanzable y calcula la tabla por métrica de saltos, con máximo 15; métrica 16 equivale a inalcanzable. RIPv1 no transporta máscara: respetar comportamiento classful de T1; no tratar las redes como rutas que aparecen por el mero hecho de que el grafo físico las conecte. Resolver tie-break, split horizon, pérdidas y convergencia según evidencia o D-21. Un `network` faltante debe afectar las rutas pertinentes, no un interruptor global “RIP correcto”.

Las rutas C/L nacen de interfaces activas con IP configurada; las R de anuncios aprendidos. Un ping de PC-1 a PC-2 con todas las rutas va PC-1→R2→R1→R3→PC-2, por switches/patch si Q-03 lo confirma. Registrar para **cada eco** el camino de ida, la decisión de route lookup y el camino de vuelta; mostrar el salto donde se descarta la solicitud o la respuesta. No confundir ausencia de sesión COM con fallo de IP. Tratar ruta estática funcional pero RIP ausente según D-24.

La tabla final y el ping deben proceder de la **misma** función de rutas y el mismo snapshot. Si cambian cables o interfaz, invalidar rutas aprendidas afectadas según modelo de tiempo aprobado; no mostrar una ruta antigua como actual indefinidamente. TTL, ARP, eco perdido, ICMP error y salidas de `ping` exactas dependen de D-22/23 y Q-06.

## 6. Matriz de aceptación del motor

| Caso | Entrada | Resultado exigido |
| --- | --- | --- |
| N-01 | X=1,Y=1 | Cuaderno, interfaces, loopbacks y PC coinciden con la guía |
| N-02 | X=3,Y=12 | `YX=123` sin multiplicar; mismos caminos con IP derivadas |
| N-03 | X=10,Y=12 | Bloqueo previo con explicación «YX supera 254»; sin partida creada |
| N-04 | Cableado/IP correcto sin RIP | PC llega a gateway local; R2 carece de ruta PC-2 y descarta allí |
| N-05 | RIP en R2/R3 pero no R1 | Diagnóstico de rutas reales derivadas, no “RIP mal” genérico |
| N-06 | Ida con ruta y vuelta sin ruta | Mostrar llegada al destino y pérdida de respuesta en salto exacto |
| N-07 | `shutdown` R1 G0/1 tras ping correcto | Link y rutas cambian; feedback usa snapshot nuevo |
| N-08 | `erase` sin `reload`, luego `reload` | Antes mantiene running; después aplica startup borrada |
| N-09 | Mover consola de R1 a R2 | No modificar datos de ambos routers; vieja sesión no ejecuta comando |
| N-10 | Dos errores simultáneos | Señalar primer fallo comprobado y qué más se pudo comprobar; no fingir causa única |
| N-11 | Acciones repetidas en orden fijo | `trace`, tabla y nota idénticos para igual X/Y/semilla/acciones |

**Por determinar:** salida exacta de `show ip route`, mapa físico, método de selección de puertos, comandos soportados, cronómetro, ARP, dos PCs y nota. Un test que use un atajo del Core no reemplaza una prueba desde UI con teclado y puntero.


## Aclaración de recorrido físico y numeración definitiva (24 nov 2026)

El switch físico asignado es único: cable de salida de jaula del PC-1 al switch, cable de switch al router extremo del PC-1, dos cables directos entre routers, cable del otro router extremo al mismo switch, cable de switch a salida de jaula y parrilla del PC-2. El juego asigna R1/R2/R3 y los mantiene fijos todo el lab; el router no asignado «dañado» es un gag sin fallas técnicas. La narración oral de PC-1 en `.10` fue un ejemplo: **seguir íntegramente la tabla y los puertos de router del PDF página 3**, donde PC-1↔R2 G0/1 está en `.30`, R2 G0/0↔R1 G0/0 en `.10`, R1 G0/1↔R3 G0/0 en `.20` y R3 G0/1↔PC-2 en `.40`. El único switch conecta R2 G0/1, R3 G0/1 y ambos PCs mediante cualquier puerto Ethernet libre; no se exige VLAN ni puertos reservados. La selección IP/gateway y la tabla de rutas determinan el camino de ping; no atribuir al switch separación automática de subredes por IP ni afirmar un diseño interno del hardware no documentado.


## Decisiones nuevas de configuración y consola (24 nov 2026)

Routers asignados pueden iniciar con configuración previa aleatoria reproducible. Gabriel exige ejecutar `erase startup-config` y `reload` en **los tres**, incluso si empiezan vacíos o muestran `Router>`; no hay condición previa de inspección. Cada PC tiene un COM diferente, fijo durante el lab y sorteado de nuevo en otro lab. La GUI PuTTY solo deja cambiar COM; Serial/9600/8N1 y el resto quedan predefinidos. Al cambiar router por cable de consola, cerrar/inutilizar sesión R1, mostrar «Conexión interrumpida» y Enter con la nueva conexión entra a la CLI R2, jamás a R1. Comandos sin abreviaturas, historial ↑/↓, no pegar; fuera de catálogo: «Comando no disponible en laboratorio». La foto parece mezclar serie 2911 y 2800 y la guía incluye pantalla de Packet Tracer 2811: modelo/IOS y equivalencia de puertos físicos G0/0/G0/1 requieren decisión y fixtures.


**RIP/diagnóstico en Fase 1:** después de un cambio válido, recalcular aprendizaje sin espera perceptible para que el ping pueda ejecutarse de inmediato; sin timeout inicial de ARP. El ping incluye solicitud y respuesta; falla posible de retorno aunque llegue la solicitud. El evaluador al entregar comprueba PC-1↔PC-2 en ambos sentidos y localiza falla mediante gateways/tramos/tabla de rutas. El jugador puede intentar ping sin entregar y sin penalización. Una ruta estática que permite ping no satisface el requisito RIPv1 de la propuesta de rúbrica.


**Regla de preparación del router:** borrar startup y reiniciar en todos los casos antes de reconfigurar, incluso router vacío; el comando `show startup-config` sirve solo para inspeccionar NVRAM y no es requisito impuesto por Gabriel. La comprobación del procedimiento obligatorio al entregar requiere definir si se impide configurar antes o se valida el registro de acciones.
