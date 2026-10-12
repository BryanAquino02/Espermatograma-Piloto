# CHANGELOG — Espermatograma v20 → v21-piloto

## Entrega y estructura

A pedido del usuario, el archivo único se separó en tres archivos que **deben estar en la misma carpeta**:

| Archivo | Contenido |
|---|---|
| `espermatograma_v21_piloto.html` | Marcado (enlaza el CSS en `<head>` y el JS al final de `<body>`, igual que antes) |
| `espermatograma_v21_piloto.css` | Todo el contenido del antiguo `<style>` |
| `espermatograma_v21_piloto.js` | Todo el contenido del antiguo `<script>` |

Sigue funcionando con doble clic y sin servidor (`file://`). Nota: la sección 5 de las instrucciones pedía un único `.html`; se priorizó la indicación posterior del usuario de separarlo.

---

## P0 — Obligatorias

**P0-1. `resetAll()` ("Nueva muestra")**
- Pide confirmación con `confirm('¿Borrar todos los datos de la muestra actual?')`. Si se cancela, no hace nada.
- Ahora limpia también `m-globulos-rojos`, `m-debris` y `m-a-print`. `p-tipo-muestra` y `p-edad` ya se limpiaban y se mantienen.
- Al final llama a `syncPrintPatient()` y `syncFirma()`. Con esto el informe impreso ya no conserva datos del paciente anterior.
- La firma (`firma-nombre`, `firma-cargo`, `firma-cbp`) **no** se borra; solo se sincroniza.
- `js-informe-num` y `print-informe-num-display` quedan en "—" (verificado).

**P0-2. Tipo de muestra en el informe**
- Se añadió la celda "Tipo de muestra" (`#pp-tipo-muestra`) como 4.ª celda de la fila superior de la tabla de paciente. El CSS de impresión v20 ya tenía reglas para `nth-child(4)` en esa fila, así que no se tocó el CSS de la grilla.
- `syncPrintPatient()` muestra el texto visible de la opción, o "—" si está vacío.
- `p-tipo-muestra` se añadió a la lista de campos que escuchan `input`.

**P0-3. Validación de entradas (reemplaza a `checkSum`)**
- Se eliminaron `checkSum()`, los 4 `div.sum-warning` y su CSS.
- Se añadió la constante `LIMITES` al inicio del JS, con los valores propuestos.
- Se añadió `validateInputs()`, que se llama al inicio de `computeAll()`. Aplica tres reglas:
  - Ningún campo numérico puede ser negativo. Esto incluye `p-abstinencia`, que tiene su propio listener porque no llama a `computeAll`.
  - Los campos `m-c … m-no-leuco` deben ser enteros.
  - `m-a`, `m-a-print`, `m-ph`, `m-b` y `m-q` deben estar dentro del rango de `LIMITES`.
  - Además, una entrada no numérica (`validity.badInput`) se marca como "Valor no numérico".
- Cuando un campo es inválido:
  - Se le añade la clase `.input-invalid` (borde y fondo rojos).
  - Aparece un mensaje debajo del campo (`#err-<id>`), creado con `textContent`.
  - Aparece un aviso superior `#aviso-invalidos`: "Hay valores inválidos: corrígelos antes de imprimir (…)". El paréntesis nombra los campos, porque el campo erróneo puede estar en otra página del paginado.
  - El botón `#btn-print` queda deshabilitado.
  - Todo esto se revierte al corregir el valor.
- La validación no modifica ningún valor y los cálculos siguen ejecutándose igual.

**P0-4. Botón Demo**
- El botón tiene `id="btn-demo"` y está oculto por defecto. Solo se muestra con `?dev=1`.
- `loadDemo()` se conserva.

## P1 — Recomendadas

**P1-1. Versión**
- Se añadió `const APP_VERSION = 'v21-piloto'`.
- Se muestra en `#app-version` debajo del título en pantalla, y debajo de `print-timestamp` en el informe impreso.

**P1-2. Google Fonts**
- Se eliminaron los `<link>` a Google Fonts. Había **2**, no 3: un `preconnect` y la hoja de estilos.
- Se aplicaron las pilas de fuentes del sistema indicadas (15 reglas de texto y 5 de monoespaciada).
- La impresión ya forzaba Arial, así que el PDF no cambia.

## Corrección adicional (necesaria para la prueba 7)
- `drawBarChart` hacía `svg.setAttribute('height','auto')`. Ese valor es inválido para el atributo SVG y generaba un error de consola en cada recálculo; el navegador lo ignoraba.
- Se reemplazó por `svg.removeAttribute('height')`, con el mismo resultado visual. La altura ya la da `style="height:auto"`.
- No es lógica clínica: es solo dibujo.

## P2 — Limpieza opcional (hecha tras pasar P0/P1; marcada aparte)
- Se eliminó el `<div id="page-1">` oculto y su comentario.
- Se eliminó el ID `score-seminal-body` (no se usaba).
- Se eliminó `#pp-edad-conyuge-line` y su línea en `syncPrintPatient`.
  - Efecto visible: en el PDF, el nombre del cónyuge baja unos 3 px y queda alineado con "Días de abstinencia".
  - Es la única diferencia de píxeles entre el PDF P1 y el PDF P2; las páginas 2 y 3 y la pantalla son idénticas.
- Se eliminaron las reglas CSS sin uso, cada una verificada antes por búsqueda: `badge-dot`, `badge-letter`, `card-formula`, `card-var`, `chart-empty-text`, `row-formula`, `ppt-full`, `score-legend` (pantalla e impresión; se conserva `score-legend-inline`, que sí se usa), `.row-label .unit`, `mono`, `observaciones-section`, `observaciones-title`, `firma-dato`, `.firma-nombre` (como clase; el ID `#firma-nombre` sí se usa y se mantiene), `disclaimer`, `field-span-4` y `cards-grid.col-1`.
- `org` y `w3` **no son clases**: aparecen solo dentro de la URL del namespace SVG (`http://www.w3.org/2000/svg`). No se tocó nada.
- Se creó el helper `sum(arr)`, que reemplaza los 5 `reduce` de `computeAll`. Ignora no numéricos, igual que antes.
- Se creó la constante `CAMPOS_PACIENTE`, usada en `resetAll` y en el registro de listeners.
  - `syncPrintPatient` no la usa: lee cada campo por separado porque cada uno tiene su propio formato (fecha, días, opción visible…). Convertirlo en bucle habría sido refactorizar.
- `m-a` y `m-a-print` **no** se unificaron, según lo indicado.

---

## Pruebas ejecutadas (Chromium headless vía Playwright, abriendo el archivo por `file://`)

**4.1 Regresión de cálculos: PASA (20/20).**
Todos los valores coinciden exactamente con la tabla de las instrucciones:
- Recuento total: 70.40 x10⁶/eyac.
- Motilidad: 71.0 / 14.0 / 15.0 / 85.0 % y progresivos totales 49.98 x10⁶.
- Morfología: 15.0 / 36.0 / 22.0 / 15.0 / 7.0 / 5.0 %.
- Vitalidad: 79.0 %.
- Leucocitos: 0.032 x10⁶/ml.
- Índice de teratozoospermia: 0.86.
- Scores: 1,3 / 1,5 / 1,5 / 1,5.
- Conclusión: "Eyaculado normozoospérmico".

Se comprobó además por comparación de texto que `SCORE_TABLE`, `stepScore`, `scoreClass`, `setScoreOut`, `computeScoreSeminal`, `computeConclusion` y la tabla OMS del HTML son idénticos a v20. Las fórmulas de `computeAll` solo difieren en el reemplazo por `sum()`.

**4.2 Pruebas de las correcciones**

| # | Prueba | Resultado |
|---|---|---|
| 1 | Demo → Nueva muestra → aceptar | **PASA, con una salvedad.** Todas las celdas `pp-*` quedan en "—", **excepto `pp-referencia-display`**, que muestra "OMS 2021". Es intencional y viene de v20: `resetAll` restaura la referencia por defecto, que no es un dato del paciente. Si se quiere "—", basta con quitar esa línea de `resetAll`; no lo cambié sin confirmación. El número de informe queda en "—"; hematíes, debris, tipo de muestra, volumen (ambos) y edad quedan vacíos; la firma permanece. |
| 2 | Nueva muestra → cancelar | PASA (no se borra nada) |
| 3 | Eyaculación retrógrada en el informe | PASA (visible en la vista de impresión) |
| 4 | `-5` en un conteo y luego corrección | PASA (borde rojo, mensaje, aviso, botón deshabilitado; todo se revierte al corregir) |
| 5 | `12.5` en `m-c` / `25` en volumen | PASA ("Debe ser un número entero" / "Fuera de rango (0 – 20)"). También se probó pH 4 y abstinencia -1. |
| 6 | Botón Demo con y sin `?dev=1` | PASA |
| 7 | Consola y peticiones de red | Consola sin errores: PASA (tras la corrección del SVG). Sin peticiones a Google: PASA. **Ver punto B abajo:** siguen 2 peticiones externas a GitHub. |
| 8 | Layout A4 | PASA. Se generó el PDF de v20 y de v21 con la Demo y se compararon visualmente: mismo layout, 3 páginas. La versión aparece bajo la fecha/hora de impresión. |

No se probó en Firefox, Safari ni con impresora física.

---

## Cosas sospechosas encontradas y **NO** modificadas (para revisión del médico responsable)

**A. Lógica clínica**

1. **`SCORE_TABLE` parece invertida por debajo del valor de referencia.**
   - En concentración: 6 → 0,5; 8 → 0,4; …; 14 → 0,1; 16 → 1,0.
   - Es decir, una muestra con 6 x10⁶/ml puntúa **mejor** (0,5) que una con 14 (0,1). Lo mismo ocurre en motilidad, vitalidad y morfología.
   - Además, `stepScore` devuelve el primer escalón (0,5) para cualquier valor menor al primer punto. Por ejemplo, una azoospermia (0) obtiene 0,5 en concentración.
   - La leyenda impresa ("0,1 ~ 10% VN-OMS-21") sugiere una escala proporcional que no coincide con la tabla.
2. **Índice de teratozoospermia.**
   - Se calcula como (cabeza + pieza media + flagelo) / (todos los anormales incluyendo inmaduros y otros), con resultado ≤ 1 (0.86 en la Demo).
   - El TZI de la OMS es el número de anomalías por espermatozoide anormal y va de 1,00 a 4,00. Con esta fórmula nunca puede dar ≥ 1 salvo que inmaduros = otros = 0.
3. **`computeConclusion`:**
   - Solo usa la concentración. No usa el recuento total (≥ 39), el volumen (≥ 1,4) ni la motilidad progresiva (≥ 30 %), aunque estos figuran en la tabla de referencia impresa.
   - Los cortes de severidad (< 8 oligo severo, < 21 % asteno severo, ≤ 0,1 cripto) no están en la tabla OMS del informe.
   - Escribe "Eyaculado normozoospérmico" con solo la concentración ingresada, aunque falten motilidad, morfología y vitalidad (sí añade el aviso "Sin datos").
4. El comentario de leucocitos dice "α × (µ/π) × 100", pero la fórmula no multiplica por 100. El valor de la Demo (0.032) coincide con lo esperado, así que el error parece estar en el comentario, no en el cálculo.
5. Los valores de referencia del gráfico de barras (16 / 42 / 4 / 54) están escritos a mano en `drawBarChart`, duplicando la tabla OMS. Si uno cambia, el otro no.

**B. Funcionamiento sin internet (prueba 7)**
- El logo Pranor y el sello ISO 9001 se cargan desde `raw.githubusercontent.com`.
- Sin internet no aparecen en el informe impreso, y la pestaña Network sigue mostrando 2 peticiones externas (ninguna de Google).
- No se cambió porque quitarlos altera el diseño impreso y embebirlos excede la tarea. Se recomienda incrustarlos como `data:` URI en una próxima tanda.

**C. Impresión**
- Imprimir con Ctrl+P / menú del navegador **salta el bloqueo** del botón deshabilitado: no hay forma estándar de cancelar la impresión.
- Por la misma vía no se actualiza `print-timestamp`. Este puede quedar vacío o con la fecha de una impresión anterior, porque "Nueva muestra" no lo limpia.
- Sugerencia: un listener `beforeprint` que ponga la fecha y que, si hay inválidos, muestre un aviso visible en el propio informe.

**D. Comportamiento conocido de la validación**
- Por diseño (la validación no modifica valores), los cálculos y totales siguen mostrándose con valores inválidos. Por ejemplo, "Total contado" incluye un `-5`.
- Los límites de `LIMITES` están marcados como "propuesto" y deben confirmarse.
