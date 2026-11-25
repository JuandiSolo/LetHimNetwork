# Let Him Network — Puestos físicos, jaula y assets de Fase 1

**Estado:** decisiones expresas del dueño y dudas separadas. Actualizado 24 nov 2026 con asignación aleatoria, switch único y tipos de cable. **No se ha programado ni verificado el comportamiento de los cables.** Complementa la spec maestra y demás documentos del paquete; en caso de discrepancia, las decisiones explícitas del dueño registradas aquí prevalecen. Las fotos son referencias, no prueban conexiones internas invisibles.

## 1. Decisiones ya dichas por Gabriel

| ID | Regla confirmada | Consecuencia de programación |
| --- | --- | --- |
| FIS-01 | Cada partida tiene **dos puestos físicos asignados**, que el juego llama PC-1 y PC-2 según su **rol lógico**; las etiquetas reales pueden ser PC4, PC5, PC6, PC8 u otras. | Guardar `roleId` separado de `physicalPcId`; **configurar IP de cada PC por separado**. La forma exacta de asignarlos aún requiere FIS-Q1. |
| FIS-02 | Al lado de cada puesto hay una parrilla de tomas identificadas por letra y número (ejemplos A1, A2, B1, C1, D1); su letra depende del puesto físico. | Representar panel del puesto, panel correspondiente en jaula y una **conexión interna fija** entre tomas emparejadas. Los números y mapeo exactos no están aprobados. |
| FIS-03 | La toma junto al PC y su salida correspondiente en la jaula **ya están unidas**. El jugador conecta los extremos externos. | No pedir al jugador que tienda cable a través del edificio; sí conectar desde PC a la toma y desde la salida de la jaula al equipo apropiado. |
| FIS-04 | Para tráfico de datos: PC → toma de parrilla del puesto → tramo fijo → salida de jaula → **switch asignado**. El tramo PC→toma y el tramo salida→switch los conecta el jugador. | El camino físico se construye extremo a extremo; un LED o ping no depende del dibujo del cable solamente. El resto de conexiones de T1 debe concretarse; no inferirlo de esta frase. |
| FIS-05 | Para acceso de consola: hay un cable desde USB del PC hasta una toma de la parrilla (ej. A5), y desde la salida correspondiente de jaula hasta el puerto **CONSOLE** del router que se configurará. | Modelar una señal de administración independiente de Ethernet/IP, conservando las tomas emparejadas y la posibilidad de mover el extremo a otro router. Los adaptadores/conectores reales siguen pendientes FIS-Q3. |
| FIS-06 | La foto muestra routers físicos 1–12. **El juego sortea tres routers funcionales y asigna automáticamente cuál es R1, cuál R2 y cuál R3**; el jugador no decide los roles. La mención de otro router dañado es un chiste breve de presentación (ejemplo: «usarás 2, 4 y 6 porque el 3 no funciona»). | Guardar rol↔número físico fijo durante todo el laboratorio. El router no asignado «dañado» no provoca fallas técnicas ni cambia la asignación. Redacción y número del gag pendientes. |
| FIS-07 | **El juego asigna un solo switch físico para ambos PCs**, variable entre partidas. Gabriel aclara que así fue la práctica aunque el diagrama académico dibuje dos switches; cantidad de switches disponibles todavía por confirmar. | Usar el único switch asignado en Fase 1. No renderizar ni exigir un segundo switch oculto. Los routers extremos son R2 G0/1 (LAN PC-1) y R3 G0/1 (LAN PC-2) según el PDF. |
| FIS-08 | En el **único switch asignado**, cualquiera de sus puertos Ethernet libres sirve para PC-1, R2, R3 y PC-2. Ejemplo del dueño: un PC en puerto 40 y su router en 45 funciona. | Evaluar el camino y el puerto libre/compatible, nunca un número concreto de puerto del switch. Los puertos de los routers sí se rigen por el PDF. El jugador no configura VLAN ni asignación de puertos por LAN. |

## 2. Observación de las fotos recibidas en «Let him network.docx»

| Recurso | Lo visible | Lo que la foto NO prueba |
| --- | --- | --- |
| Foto general de la jaula (`media/image.jpg`) | Varios racks, routers y switches en jaula, muchos patch cords | Qué grupo usa cada rack, qué puertos están conectados detrás, qué routers están operativos |
| Primer plano de routers (`media/image2.png`) | Etiquetas físicas Router 1…Router 12 y puertos distintos por familia/equipo | Que todas las interfaces tengan idéntica nomenclatura, que los 12 funcionen o que un puerto particular esté libre |
| Primer plano switches (`media/image3.png`) | Algunos switches rotulados, incluidos SW2/SW10/SW11 | Lista completa de switches elegibles o número de switches necesarios para T1 |
| Panel en jaula (`media/image4.png`) | Tomas con letra y número, visibles filas C y D | Conexión interna de cada toma a un PC concreto; mapa entero de A/B/C/D |
| Puesto (`media/image5.png`) | PC junto a parrilla frontal con tomas y patch cords | Nº del PC, asignación exacta de letras ni si la toma sirve para Ethernet, consola o ambas según cable usado |
| Caja de cables (`media/image.png`) | Cables con conectores RJ45 de distintos colores; caja marcada “cables cruzados” | Identidad de un cable USB→RJ45 de consola ni su pinout; dos cables visualmente parecidos pueden ser funcionalmente distintos |

**Fuente de verdad:** la observación de la foto y la explicación de Gabriel son evidencia del entorno; la guía académica define IP/roles de T1. No extraer de una imagen borrosa un puerto o número funcional no confirmado.

## 3. Hallazgo técnico sobre «USB a Ethernet»

Un conector físico USB-A a un lado y RJ45 al otro **no identifica por sí solo la función**. Un adaptador USB→Ethernet crea una interfaz de red; un cable USB→serial RJ45 de consola crea un puerto COM para entrar a la CLI. Un cable RJ45 *rollover* transporta señal serial de consola y tiene un pinout distinto de un patch Ethernet. Cisco distingue explícitamente los puertos de consola RJ45 de los de red y publica sus parámetros; productos USB→RJ45 de red se anuncian como adaptadores Ethernet, mientras los de consola crean COM. No llamar a ambos simplemente «cable LAN». [Cisco, cableado de consola](https://www.cisco.com/c/en/us/support/docs/routers/7000-series-routers/12223-14.html) · [Cisco, alternativas de puertos de consola](https://www.cisco.com/c/en/us/td/docs/routers/access/1100/hardware/installation/guide/b-cisco-1100-series-hig/preparing_for_router_installation.html) · [ejemplo comercial USB→Ethernet](https://www.startech.com/en-us/networking-io/usb31000s2) · [ejemplo adaptador rollover sin COM propio](https://www.startech.com/en-eu/cables/rollover).

**Pendiente FIS-Q3:** foto del cable completo y sus dos conectores, marca/modelo o texto impreso, vista de la toma, captura de Administrador de dispositivos (COM) al conectarlo y foto de qué puerto del router recibe el otro extremo. Determinar si la parrilla hace paso directo adecuado para la señal serial o si hay pieza adicional. Hasta entonces, las dos rutas del juego se distinguen semánticamente, pero el asset y validación exacta del hardware quedan provisionales.

## 4. Preguntas que Gabriel debe decidir/confirmar antes de cerrar la mecánica

1. **FIS-Q1 — RESUELTA:** el juego sortea tres routers físicos funcionales, comunica su asignación R1/R2/R3 y la fija durante el laboratorio. La mención de otro router «dañado» es un gag sin efecto en la simulación. **FIS-Q1b pendiente para contenido:** texto exacto y si menciona uno o varios.
2. **FIS-Q2 — RESUELTA:** un solo switch físico asignado y compartido por ambos PCs en Fase 1, porque así se hizo en la práctica; el diagrama académico muestra dos, pero no se exige un segundo. ¿La asignación física del switch se sortea entre todos los operativos? Lista/número elegibles pendiente.
3. **FIS-Q3 — RESUELTA la función general:** datos PC↔parrilla mediante cable de red RJ45↔RJ45 (LAN↔LAN); consola mediante cable USB→RJ45 que debe permitir sesión serial/COM, pasa por otra toma de parrilla y conecta a CONSOLE del router. **Pendiente:** modelo/pinout y adaptadores reales, si es USB-A exactamente, y si la toma de consola puede ser cualquier toma libre distinta de la usada para datos. Fotos cercanas prometidas por Gabriel.
4. **FIS-Q4 — RESUELTA la regla de elección:** el jugador puede usar cualquier toma libre del puesto; debe unir la salida de jaula con **la misma etiqueta** (A2↔A2, etc.). La parrilla es conexión interna fija, no un equipo que cambie el tipo de cable necesario. **Inventario provisional aprobado:** letras A–J inclusive, tomas 1–24 por letra; ampliar letras mediante datos en futuro. Pendiente asignar letra concreta a cada PC físico y corroborar mapa de jaula con foto.
5. **FIS-Q5 — RESUELTA la topología de fase 1:** seguir **por completo** la tabla y los puertos del PDF: PC-1↔switch↔R2 G0/1 en `.30`; R2 G0/0↔R1 G0/0 en `.10`; R1 G0/1↔R3 G0/0 en `.20`; R3 G0/1↔el mismo switch↔PC-2 en `.40`. Todos los puertos Ethernet libres del switch son equivalentes y no se exige configurar VLAN ni reservar rangos de puertos. La narración anterior con PC-1 en `.10` fue un ejemplo, descartado por Gabriel.
6. **FIS-Q6 — Qué ocurre con un equipo no asignado.** ¿La UI permite enchufarlo y luego penaliza, lo bloquea, o lo trata como una topología alternativa? Aplica también a otros PCs, routers y switches visibles.
7. **FIS-Q7 — Reasignación y repetición.** ¿Al comenzar un nuevo lab se sortean equipos nuevos o se conserva la asignación anterior? ¿Mostrar la semilla en una pantalla de depuración para reproducir errores?

## 5. Contrato mínimo de datos con mocks, sujeto a Q1–Q5

```ts
physicalAssignment: {
  pcRoles: {'PC-1': 'PC-fisico-pendiente', 'PC-2': 'PC-fisico-pendiente'},
  routerRoles: {R1: 'Router-fisico-pendiente', R2: '...', R3: '...'},
  switchIds: ['SW-fisico-pendiente']
};
patchTerminations: Array<{
  stationId: string; deskJackId: string; rackJackId: string;
  internalLinkId: string; verifiedBy: 'foto'|'usuario'|'pendiente';
}>;
```

**Invariante:** un jugador puede configurar PC-1 y PC-2 independientemente aunque el sprite del escritorio sea reutilizado. Un puerto de switch libre elegible no altera la calificación por su número. Un cable de consola no crea conectividad IP. Una toma A2 en escritorio solo comunica con la salida A2 correspondiente de la jaula; no con otra etiqueta. Una acción en un router físico no debe modificar la configuración de otro aunque cambie R1/R2/R3 entre partidas.

## 6. Catálogo de assets con placeholder y reemplazo futuro

| Asset solicitado al equipo de arte | Mock inicial | Metadatos imprescindibles |
| --- | --- | --- |
| Vista general de racks/jaula y acercamientos | Rectángulos y etiquetas de rack | Posición, escala, zona clicable |
| Routers 1–12 por modelo/variante y sus puertos | Caja «Router N», puntos G0/0, G0/1, CONSOLE | ID físico, anclas por puerto, estado |
| Switches elegibles y puertos | Caja «SW N» con puertos numerados | Modelo, número/orden de puertos, hitboxes |
| Parrillas del PC y paneles en la jaula | Fila de tomas A1…/B1… con etiquetas | Pareja de terminaciones verificadas, coordenadas |
| PC físico 1/2 y posibles etiquetas reales | Dos cajas «PC asignado» | ID físico separado de rol PC-1/PC-2 |
| Cable de datos directo/cruzado | Línea tipada con extremos | Tipo, orden de hilos si se evalúa |
| Cable/adaptador de consola | Línea diferenciada, sin icono definitivo | Conectores y modelo una vez Q3 confirmado |
| LEDs, selección, puerto ocupado, cable pendiente | Puntos/símbolos de estado | Estado y causa accesible, no solo color |
| UI del PC y ventana serial | HTML/React con estilo provisional | Controles, foco, texto copiable |
| Libreta con tabla de IP y asignación física | Panel de texto | Roles↔equipo real, X/Y, direcciones dinámicas |
| Pantallas/quiz/Sofi/Miguel/Samu | Texto y figuras provisionales | Guiones, permisos, animaciones futuras |
| Recorrido ida/vuelta del ping, audio y fuentes | Nodos/flechas con rótulos | Orden de eventos del Core, alternativas sin movimiento |

Las entregas futuras deben traer `assetId`, dimensiones, punto de anclaje, coordenadas de puertos, variantes, licencia/permiso y referencia visual. Sustituir un mock no altera los IDs ni la lógica. No generar o publicar arte final a partir de la foto sin decisión/permiso del dueño.

## 7. Pruebas que previenen confusión de puestos y parrillas

- Dos PCs reales asignados distintos; configurar IP en PC-1 no cambia la de PC-2.
- PC-1 toma A2→salida de jaula A2→switch asignado produce el enlace definido por Q4; A2→otra salida produce error según Q4.
- El mismo jack no puede alojar simultáneamente datos y consola si físicamente es un solo puerto; confirmar Q3/Q4.
- Mover consola de un router físico a otro cambia la identidad de la sesión; nunca teclear en el anterior.
- Cambiar asignaciones entre partidas deja sin residuos los cables, rutas y configuración de la partida anterior; guardar la semilla para reproducir la asignación y el gag, sin fallas técnicas de routers no asignados.
- Cualquier puerto libre permitido del switch asignado es válido, salvo puertos reservados/dañados que se documentarán.

## 8. Aclaración final del dueño sobre cables (24 nov 2026)

El cable de datos entre NIC Ethernet del PC y parrilla es **RJ45↔RJ45**; el cable **USB→RJ45 se reserva para la consola**. Suponer que ambos son adaptadores de red Ethernet sería un error. Aún falta foto/modelo del cable de consola para distinguir si genera COM y cómo atraviesa el panel. El juego debe mostrar dos PCs con IP propia, un switch compartido y tres roles de router asignados por el juego entre equipos funcionales. La topología, las redes y los puertos de router siguen totalmente la tabla del PDF; ambos extremos LAN usan el mismo switch sin restricción de números de puerto.


## 9. Recorrido cableado y decisión final sobre el PDF (24 nov 2026)

Confirmado: cada PC→cable RJ45→parrilla→enlace interno existente→salida de jaula→cable RJ45→switch físico compartido→cable RJ45→router extremo. Dos cables directos enlazan los tres routers consecutivos; desde el otro router extremo se vuelve al mismo switch y por parrilla a PC-2. La asignación R1/R2/R3 permanece fija durante el lab; mencionar un router no asignado «dañado» es solo un chiste inicial, sin averías jugables.

El PDF «LabCeroTopologia.pdf», página 3, define PC-1↔R2 G0/1 en `192.168.30.0/24`; R2 G0/0↔R1 G0/0 en `.10.0/24`; R1 G0/1↔R3 G0/0 en `.20.0/24`; R3 G0/1↔PC-2 en `.40.0/24`. Gabriel aclaró que la descripción verbal de PC-1 en `.10` era solo un ejemplo. **Prevalece todo el PDF** para roles, direcciones y puertos del router. Para esta simulación el switch compartido admite cualquier puerto Ethernet libre para ambos extremos LAN; el jugador no configura VLAN ni segmentación del switch. Una subred IP por sí sola no crea aislamiento de capa 2: la simulación debe calcular ping mediante IP, puerta de enlace, interfaces y rutas RIPv1, sin atribuir al switch una función «mágica» de reconocer subredes. Esto refleja la experiencia de la práctica descrita por Gabriel sin afirmar la configuración interna del switch real.


## 10. Decisiones de cables y enlace físico (24 nov 2026)

Gabriel exige la regla didáctica: **directo** entre equipos de distinto tipo y **cruzado** entre iguales; usar otro tipo deja enlace físico caído, aunque algunos equipos reales admitan auto-MDI-X. La parrilla es paso pasivo: elegir cualquier boca libre, y enlazar la misma etiqueta en la jaula (A2↔A2). El jugador ve y compara los dos conectores: foto aportada con **568B–568B directo** y **568A–568B cruzado**. Asset mock debe representar esa diferencia legiblemente y permitir inspección.

Inventario: exactamente los cables requeridos, sin sobrantes. Se puede desconectar y reconectar cualquier cable y devolverlo al inventario. El LED refleja **solo enlace físico** (tipo de cable, extremos, conexión y asiento); una IP incorrecta no apaga la luz. Una inserción físicamente correcta puede no asentar, dejando LED apagado hasta sacar y volver a conectar. Pendientes del dueño: probabilidades/condiciones de no asiento, señal visible para distinguir causas, penalización por ensayos, cantidad por tipo y si el inventario exacto incluye piezas de consola. No crear una probabilidad por defecto.


## 11. Puertos, COM y equipos iniciales (24 nov 2026)

Dos COM diferentes para los PCs, estables en la partida y variables entre partidas. PuTTY simulado con solo campo COM editable y resto de parámetros bloqueados; la captura de guía está en «merged (1).pdf» página 10. Routers pueden tener configuración anterior sorteada; borrado y reinicio obligatorios en todos los routers, incluso los inicialmente vacíos. Foto de jaula: los equipos superiores parecen Cisco 2911 y los inferiores se rotulan Cisco 2800 Series; el PDF usa interfaces lógicas G0/0/G0/1 y la captura de CLI del PDF página 11 dice 2811 de Packet Tracer. No asignar idéntico modelo/puertos visibles a todos hasta decisión del dueño.


**Inventario de modelos corregido por Gabriel:** físicos 1–8 serie 2900 y 9–12 serie 2800; todos pueden sortearse. En serie 2800 no todos usan F: Cisco documenta 2801/2811 con FastEthernet y 2821/2851 con GigabitEthernet. El nombre de interfaz F/G del juego sigue pendiente de aclaración por la frase posterior «para nada vamos a usar F»; el submodelo físico exacto de 9–12 requiere foto cercana. Probabilidad de no asiento **2 %** por conexión (corrección expresa).


**Corrección final de prefijo:** Gabriel confirmó que en el juego los físicos 9–12 (serie 2800) usan FastEthernet F0/0/F0/1. Los 1–8 (serie 2900) usan GigabitEthernet G0/0/G0/1. Cisco real tiene submodelos 2800 también con G; esta es la regla explícita de la simulación, no identificación verificada de cada chasis.


**Paneles Fase 1:** catálogo por datos `letters = [A,…,J]`, `jackNumbers = 1…24`. No generar un máximo de J en la lógica: permitir añadir K y posteriores al catálogo. No atribuir aún un puesto PC físico concreto a una letra sin mapa aportado por Gabriel.
