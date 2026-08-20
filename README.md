# Pricing & TCO — Ricoh Chile

Aplicación web para armar cotizaciones TCO: part number, precio de lista,
descuento aplicado, precio final y totales en UF, CL$ y USD. Reemplaza el
copiar-y-pegar de la planilla `TCO_RICOH.xlsx` conservando su matemática exacta y
exportando de vuelta al mismo archivo Excel.

Es una aplicación estática: corre entera en el navegador, sin servidor ni base de
datos. **Las cotizaciones se guardan solo en el navegador de cada persona**
(`localStorage`), así que no se comparten entre equipos ni entre perfiles. Para
compartir una cotización, exporta el Excel.

## Qué hace

- **Catálogo de productos** (la hoja `DATOS`): se busca por part number o
  descripción y se agrega con un clic, con Qty y Price List precargados.
- **Dos escenarios**, `TCO INICIAL` y `TCO FINAL`, como las dos hojas de la
  planilla. Comparten cliente e ítems; cada uno tiene sus propios descuentos y
  sus propios parámetros de UF, T/C y Factor.
- **Cálculo en vivo** de las columnas derivadas y del cuadro resumen, idéntico a
  la planilla (ver [docs/FORMULAS.md](docs/FORMULAS.md)).
- **Descuento objetivo**: dado un CFTotal en UF, calcula qué descuento hace falta.
- **Exportar a Excel**: genera el `.xlsx` original con fórmulas vivas.
- **Propuesta en PDF**: vista imprimible para el cliente.

### Los tres errores de la planilla que la app elimina

1. **Descuento mal escrito.** La celda `Descuento aplicado` espera `0,55`; quien
   escribe `55` obtiene un precio de −5300 % sin ninguna alerta. Acá el campo se
   escribe en porcentaje, se guarda como fracción y se acota a 0–100 %.
2. **Part numbers tipeados a mano.** Se agregan desde el catálogo.
3. **Filas sin fórmula.** Al insertar una fila en la planilla, las columnas
   calculadas no se arrastran y el ítem entra al total en blanco. Acá las
   columnas calculadas no son editables y las fórmulas se emiten por
   construcción, tanto en pantalla como en el archivo exportado.

## Cómo correrla

```bash
npm install
npm run dev        # servidor de desarrollo
npm run test       # tests del motor de cálculo y del exportador
npm run typecheck  # TypeScript sin emitir
npm run build      # build de producción en dist/
npm run preview    # sirve el build
```

Requiere Node 20 o superior.

## Despliegue

Cada push a `main` publica el sitio en GitHub Pages mediante
`.github/workflows/ci.yml`. Para habilitarlo la primera vez:
**Settings → Pages → Source: GitHub Actions**. Queda en
`https://<organización>.github.io/ks-tco-ricoh/`.

## Cómo está armado

```
src/lib/calc.ts        Motor de cálculo. Fuente única de verdad; sin redondeo.
src/lib/solve.ts       Descuento inverso desde un CFTotal objetivo.
src/lib/format.ts      Formato y parseo de números en es-CL.
src/export/xlsx.ts     Exportador: parchea la plantilla, no reconstruye el libro.
src/assets/plantilla.xlsx  La planilla original. Es plantilla y especificación.
src/data/catalog.seed.ts   Los 16 productos de la hoja DATOS.
src/components/        Interfaz.
docs/FORMULAS.md       Mapeo celda -> fórmula -> campo.
```

Dos decisiones que conviene conocer antes de tocar el código:

**El exportador parchea la plantilla en vez de reconstruirla.** Se reescribe solo
el `<sheetData>` de las hojas TCO y DATOS; estilos, anchos de columna,
comentarios y configuración de impresión se conservan byte a byte. Por eso el
archivo exportado se ve idéntico al que el equipo ya usa, y por eso el proyecto
depende de `fflate` (8 KB) en vez de una librería de Excel completa.

**El cálculo no redondea.** La planilla no lo hace, y redondear desalinea los
totales. El redondeo es solo de presentación.

## Verificación

El cálculo está verificado por dos caminos independientes:

1. `src/lib/calc.test.ts` compara contra los valores que la planilla original
   dejó cacheados en `TCO FINAL`. Coinciden bit a bit.
2. `src/lib/oracle.test.ts` compara contra el recálculo del `.xlsx` que la app
   exporta, hecho con un motor de fórmulas de Excel externo. Es decir, verifica
   que lo que se ve en pantalla y lo que dice el archivo signifiquen lo mismo.

`src/export/xlsx.test.ts` cubre además que el libro conserve todas sus partes,
que las columnas calculadas nunca queden como constantes y que el bloque de
totales se desplace bien con cualquier cantidad de ítems.

## Advertencia sobre el tipo de cambio

La plantilla trae `T/C = 1000`, un valor de referencia y no un tipo de cambio
real. El cuadro resumen convierte a dólares dividiendo por ese número, así que la
columna USD no representa dólares hasta reemplazarlo por el tipo de cambio
vigente. La app replica la fórmula tal cual y avisa mientras siga en 1000.
