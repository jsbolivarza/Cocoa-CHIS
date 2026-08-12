# Captura de datos del hogar cacaotero, PWA

> **Nota sobre esta traducción.** Esta es una traducción del `README.md` en inglés, que sigue siendo la versión de referencia. Es un primer borrador y debería ser revisado por un hablante nativo antes de distribuirlo, igual que la traducción al español dentro de la propia aplicación. Si las dos versiones se contradicen, la inglesa es la correcta.

Una aplicación web progresiva (PWA) para que los encuestadores capturen datos de ingresos y costos de hogares cacaoteros en campo, sin conexión, en inglés, francés o español. Los datos alimentan los cálculos de COSP (Costo de Producción Sostenible) y LIRP (Precio de Referencia de Ingreso Digno).

## Qué contiene esta carpeta

```
cocoa-pwa/
├── index.html            punto de entrada
├── manifest.json         metadatos de la PWA (nombre, iconos, colores)
├── service-worker.js     almacenamiento en caché sin conexión
├── css/style.css
├── js/
│   ├── i18n.js           diccionario de traducciones + listas desplegables
│   ├── data-model.js     estructura del registro vacío + esquemas de tablas
│   ├── calc.js           motor de cálculo (replica las fórmulas del Excel original)
│   ├── storage.js        almacenamiento local + exportación/importación JSON y CSV
│   └── app.js            renderizado y manejo de eventos
└── icons/
```

> **Verifique esto antes de desplegar.** Las rutas dentro de `index.html` y `service-worker.js` deben coincidir con la ubicación real de los archivos. Si su repositorio mantiene todo plano en la raíz en lugar de usar carpetas `css/`, `js/` e `icons/`, esas referencias deben cambiarse, o la aplicación cargará una página en blanco y el service worker nunca se instalará. Vea "Sigue apareciendo la versión anterior" en Solución de problemas.

## Requisitos

- **Alojamiento:** la PWA debe servirse por **HTTPS**. Los navegadores no instalan una PWA ni registran un service worker sobre HTTP simple (localhost es la única excepción, para pruebas). Abrir los archivos directamente desde el disco con `file://` tampoco funciona. La aplicación tiene que estar alojada.
- **Navegadores:** cualquier versión actual de Chrome, Edge, Firefox o Safari, en escritorio, Android o iOS/iPadOS.

## Cómo desplegarla

Sirve cualquier alojamiento de archivos estáticos, ya que no hay backend. La opción más sencilla, y la que usa la calculadora COSP de referencia, es GitHub Pages:

1. Cree un repositorio (o una carpeta dentro de uno existente) y suba todo el contenido de `cocoa-pwa/`, manteniendo la estructura de carpetas para que las rutas de `index.html` y `service-worker.js` funcionen.
2. En la configuración del repositorio, active GitHub Pages para esa rama o carpeta.
3. GitHub lo sirve por HTTPS automáticamente en `https://<usuario>.github.io/<repositorio>/`.

Cualquier otro alojamiento estático (Netlify, Vercel, el servidor web de la organización) funciona igual: suba la carpeta, asegúrese de que se sirva por HTTPS, y listo.

## Instalación en un dispositivo

**Android (Chrome):** abra la URL, toque el menú (⋮) y luego "Añadir a pantalla de inicio" o "Instalar aplicación". Chrome suele ofrecerlo automáticamente tras una o dos visitas.

**iPad / iPhone (Safari):** abra la URL en Safari específicamente (no en Edge ni Chrome para iOS, vea la nota siguiente), toque el icono Compartir y luego "Añadir a pantalla de inicio". Instalada así, se abre a pantalla completa como una aplicación nativa y funciona sin conexión.

**Nota sobre los navegadores en iOS:** Apple exige que Edge, Chrome y Firefox en iOS funcionen sobre el motor de Safari en lugar del suyo propio, por lo que se comportan de forma algo distinta que en escritorio o Android. Para la mejor experiencia en iPad, use Safari, tanto para abrir la PWA como para el paso de "Añadir a pantalla de inicio".

## Uso de la aplicación

### Pantalla de registros

Al abrir la aplicación se muestra todo lo capturado en ese dispositivo. Tiene dos pestañas.

**Mis registros** lista todos los hogares capturados hasta el momento. "Nuevo registro de hogar" crea uno nuevo sin afectar a los demás. Cada entrada puede abrirse, exportarse en JSON o CSV, o eliminarse individualmente.

**Buscar** filtra esa lista mientras escribe. Busca por nombre del productor, cooperativa, aldea, FLO ID, código de productor y nombre del encuestado; ignora acentos y mayúsculas, y encuentra todas las palabras escritas en cualquier orden. El contador sobre la lista indica cuántos registros del total se están mostrando. La búsqueda se reinicia al cerrar la aplicación, de modo que un filtro nunca oculta registros de forma silenciosa la próxima vez que alguien la abra.

**Comparar hogares** muestra todos los hogares del dispositivo lado a lado en una sola tabla: área de cacao, rendimiento, costo por kilo, precio en finca por kilo, margen por kilo, ingreso neto de la finca, gastos del hogar, ingreso menos gastos, ingreso por persona y días de trabajo en cacao. La última fila es el promedio de lo que se esté mostrando en ese momento.

Cuatro filtros acotan el conjunto: cooperativa, programa, unidad de área y moneda. Los desplegables solo ofrecen valores que existen realmente en los registros del dispositivo.

Las cifras monetarias en distintas monedas o unidades de área no son la misma magnitud, así que promediarlas produce un número sin sentido. Cuando el conjunto visible las mezcla, la aplicación muestra una advertencia y deja esos promedios en blanco en lugar de imprimir algo incorrecto. Filtre a una sola moneda y una sola unidad de área para verlos. Las monedas se comparan sin distinguir mayúsculas y sin tener en cuenta los espacios alrededor, de modo que "xof" y "XOF " cuentan como la misma moneda, pero lo que escribió el encuestador nunca se modifica en el registro.

**Borrar todos los datos** elimina todos los hogares del dispositivo. Pide confirmación primero. Úselo cuando una ronda ya se haya exportado y la tableta pase a otra persona. No hay forma de deshacerlo, así que exporte una copia de seguridad en JSON si tiene alguna duda.

### Captura de un hogar

**Las siete pestañas.** Consentimiento, luego 1. Perfil, 2. Ingresos, 3. Costos, 4. Mano de obra, 5. Gastos del hogar, 6. Resultados, siguiendo la estructura del libro de Excel original. Los resultados se calculan en vivo mientras se completan las demás pestañas.

**Los indicadores aparecen encima de las tablas que resumen.** Cada sección empieza con hasta tres cifras principales, luego una franja única de números de apoyo más pequeños, y después las tablas que los alimentan. Todo se actualiza en vivo mientras se escribe. Las cifras negativas, como un hogar que gasta más de lo que la finca generó, se muestran en rosa.

**Otras fuentes de ingresos (pestaña 2).** Debajo de las secciones de cacao hay una lista breve de preguntas de sí o no: si el hogar vende café, vende otros cultivos comerciales, produce cultivos alimentarios básicos, produce otros cultivos alimentarios, cría ganado o tiene otros ingresos agrícolas. Una sección solo aparece en pantalla cuando su casilla está marcada, y una sección sin marcar cuenta como cero en todas partes, incluido el ingreso neto de la finca.

Los registros nuevos empiezan con las seis casillas sin marcar, para que el encuestador pregunte al hogar y marque solo lo que corresponda. Esto es deliberado: una tabla vacía en pantalla es una invitación a rellenarla, y un dato inventado es peor que ningún dato.

Si se desmarca una casilla después de haber ingresado datos, las filas se conservan en lugar de borrarse, así que al volver a marcarla las cifras reaparecen. Tenga en cuenta la consecuencia: una sección desactivada conserva sus filas en el JSON exportado aunque no aporte nada a los totales del CSV, y el CSV no tiene ninguna columna que explique por qué. Quien revise el JSON en bruto junto a un CSV debería consultar el bloque `revenues.has` antes de concluir que ambos se contradicen.

Los registros capturados antes de que existieran estas preguntas, y los que llegan por "Importar JSON", reciben sus respuestas automáticamente según si las tablas contienen algo. Un hogar con filas de ganado vuelve con la casilla de ganado marcada, de modo que no se pierde ningún dato existente.

**Añadir y quitar filas.** La mayoría de las tablas (parcelas, miembros del hogar, líneas de ingresos y costos) empiezan con una sola fila en blanco. Use "+ Añadir fila" para agregar más según haga falta, y el botón ✕ para quitar una. Las tablas de ventas mensuales de cacao y café y la tabla de mano de obra están fijas en 12 meses, ya que representan el calendario y no entradas abiertas.

**Idiomas.** El selector EN / FR / ES de la cabecera cambia la interfaz, las etiquetas y todas las respuestas desplegables. Al abrir un registro, el idioma de visualización cambia automáticamente al idioma en que se guardó; use el selector después para verlo en otro. Las respuestas de texto libre (nombres, notas, nombres de aldeas) nunca se traducen automáticamente, porque no hay forma fiable de traducir texto arbitrario, así que se mantienen exactamente como se escribieron sea cual sea el idioma de visualización.

**Guardado automático.** Los cambios se guardan en el dispositivo automáticamente unos cientos de milisegundos después de terminar de editar un campo. El indicador de la cabecera muestra "Guardando…" y luego "Guardado".

## Exportación y consolidación de datos

- **Exportar JSON** / **Exportar CSV** (por registro): guarda el hogar abierto como archivo propio.
- **Exportar todo en CSV**: un archivo con cada hogar del dispositivo como una fila, con las mismas columnas, listo para pegar en una hoja de cálculo maestra.
- **Exportar todo en JSON**: una copia de seguridad completa de todos los hogares del dispositivo en un archivo. Importar ese mismo archivo (con "Importar JSON") restaura la lista completa, por lo que también sirve para mover registros entre dispositivos.
- **Importar JSON** acepta tanto un registro exportado individual como un archivo de "exportar todo".

## Datos y privacidad

Todo se guarda localmente en el dispositivo (en el almacenamiento local del navegador) hasta que se exporta explícitamente. No se envía nada a ninguna parte de forma automática; no hay backend ni llamadas de red aparte de cargar la propia aplicación y, opcionalmente, sus tipografías. Si un dispositivo ya tenía datos guardados de una versión anterior de registro único, se migran automáticamente la primera vez que se carga la nueva versión.

Como el almacenamiento es local y no hay copia de seguridad, perder o borrar una tableta significa perder los registros. Exporte con regularidad.

## Limitaciones conocidas

- **La exportación CSV no coincide con la hoja `dataset` del libro de Excel.** La hoja de Excel tiene 174 columnas; el CSV tiene 83, de las cuales unas 11 no tienen equivalente en Excel. El CSV lleva los totales agregados, mientras que el libro lleva además el detalle de línea que hay detrás: volúmenes de venta mensuales, desglose de primas y diferenciales, desgloses por cultivo y por insumo, formas de tenencia y desgloses de subsidios. La mayor parte de ese detalle sí lo captura la aplicación y está en el JSON exportado, simplemente se agrega antes de llegar al CSV. Dos campos faltan realmente en el modelo de datos: miembros del hogar de 18 a 25 años, y dos de las cuatro marcas de medido/estimado. No espere que el CSV se pegue directamente en una hoja maestra construida sobre la pestaña dataset del libro.
- **El español es un primer borrador de traducción automática.** El inglés y el francés se revisaron contra el libro original; el español debería revisarlo un hablante nativo antes de usarlo en campo.
- **La lista de "servicios de mano de obra contratada" se reconstruyó.** Las versiones en francés e inglés de ese desplegable en el libro original no se correspondían (cada fila significaba algo distinto en cada idioma), así que se reconstruyó a partir de la lista francesa, más completa, con términos corregidos en inglés y español en lugar de copiarla tal cual.
- **El costo por kilo y el rendimiento del cacao usan bases de volumen ligeramente distintas**, replicando una inconsistencia que ya existe en las fórmulas del libro original (el rendimiento incluye los pagos en especie a los aparceros, el costo por kilo no). Es intencional, para mantener las cifras coherentes con la herramienta que la gente ya usa, no es un error.
- **Los diálogos de confirmación son propios**, no la ventana emergente nativa del navegador, porque esa ventana nativa no es fiable en los navegadores de iOS distintos de Safari. Si una acción de borrado parece no responder, busque el cuadro de confirmación dentro de la página en lugar de una ventana del sistema.
- **La aplicación no anuncia las actualizaciones.** Una versión nueva se adopta de forma silenciosa la próxima vez que se carga, si el service worker se instaló correctamente. No hay ningún aviso que informe al usuario de que hay una actualización disponible.

## Actualizar la aplicación después de hacer cambios

Si edita cualquier archivo y vuelve a desplegar, suba el número de versión en `service-worker.js` (`CACHE_NAME = "cocoa-capture-vX"`). De lo contrario, los dispositivos que ya instalaron la aplicación pueden seguir sirviendo la versión antigua en caché en lugar de adoptar la actualización.

Subir la versión es necesario pero no suficiente. El service worker guarda en caché su lista de archivos en una sola operación atómica, así que si una sola ruta de esa lista devuelve un 404, la instalación completa falla, la nueva versión se descarta y la antigua sigue sirviéndose indefinidamente. Después de desplegar, abra la aplicación una vez con DevTools, Application, Service Workers, y confirme que la nueva versión se activó sin error de instalación.

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| Página en blanco, sin estilos, no carga nada | Las rutas `css/`, `js/` o `icons/` de `index.html` no coinciden con la ubicación real de los archivos |
| No aparece "Añadir a pantalla de inicio" | No se sirve por HTTPS, o se abrió en un navegador distinto de Safari en iOS |
| La aplicación no funciona sin conexión tras instalarla | El service worker no terminó de guardar en caché en la primera visita, ábrala una vez con conexión y vuelva a probar sin ella |
| Sigue apareciendo la versión anterior tras actualizar | No se subió `CACHE_NAME`, o una ruta de la lista de archivos del service worker devuelve un 404 y la instalación sigue fallando, o el dispositivo necesita cerrarse y reabrirse por completo una vez |
| Los promedios monetarios salen en blanco en la pestaña de comparación | Los hogares visibles mezclan monedas o unidades de área, filtre a una sola de cada |
| Falta una sección de ingresos en la pestaña 2 | Su casilla de sí/no en "Otras fuentes de ingresos" no está marcada |
| El botón de borrar parece no hacer nada | Debería estar resuelto en esta versión, las confirmaciones son ahora un cuadro dentro de la página y no la ventana nativa del navegador |
