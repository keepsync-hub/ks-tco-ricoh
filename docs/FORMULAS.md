# Fórmulas de la planilla TCO

Este documento es la especificación del cálculo. La planilla original
(`src/assets/plantilla.xlsx`) es la fuente de verdad; el código la sigue, no al
revés. Si un cambio hace fallar `src/lib/calc.test.ts`, el cambio está mal.

El libro tiene cinco hojas: `Export Summary`, `Instrucciones`, `TCO INICIAL`,
`TCO FINAL` y `DATOS`. Las dos hojas TCO son idénticas en estructura.

## Parámetros globales

| Celda | Etiqueta en la hoja | Campo en la app | Valor de la plantilla |
|---|---|---|---|
| `G9` | UF | `params.uf` | 39400 |
| `G10` | USD | `params.tipoCambio` | 1000 |
| `G11` | Factor Financiamiento | `params.factor` | 0.03264 |

`G10` es el tipo de cambio en pesos por dólar. La plantilla trae 1000, que es un
valor de referencia y no un tipo de cambio real — ver *Advertencia* al final.

## Cabecera

Las etiquetas van en `C3:C19` y los valores en `D3:D19`, en este orden:
Cliente *(obligatorio)*, Consultor de Ventas, Solutions Specialist o Ingeniero de
Soluciones, Fecha de confección de file original, Versión actual, Fecha última
actualización, Actualizado por, Plazo, Type of Contract, Pricing, TDV Mensual
(mínimo)/Máx. Mono, TDV Mensual (mínimo)/Máx. Color, Approval Date,
Implementation, Proposal Presentation, Service Required mono, Service Required
Color.

En la plantilla `D6` es `=TODAY()`; la app escribe una fecha fija para que el
archivo exportado no cambie solo al abrirlo.

## Tabla de ítems

Encabezados en la fila 21; los ítems empiezan en la fila 22. Solo las columnas
`C`, `D`, `E`, `F` y `H` son entrada de datos; el resto son fórmulas.

| Col | Encabezado | Origen |
|---|---|---|
| `C` | Part Number | entrada |
| `D` | Description | entrada |
| `E` | Qty | entrada |
| `F` | Price List | entrada, en dólares |
| `G` | Precio c/ Descuento | `=F - (F * H)` |
| `H` | Descuento aplicado | entrada, **fracción**: 0.55 = 55 % |
| `I` | Cargo Fijo Unit | `=(G * K / L) * M` |
| `J` | CFTotal | `=I * E` |
| `K` | T/C | `=$G$10` |
| `L` | UF | `=$G$9` |
| `M` | Factor | `=$G$11` |
| `N` | Total en USD | `=G * E` |
| `O` | Total en CL$ | `=N * $G$10` |

`I` y `J` quedan expresados en UF; `N` en dólares y `O` en pesos.

## Totales y cuadro resumen

Con la plantilla de tres ítems (filas 22 a 24):

```
J25  TOTAL UF   = SUM(J22:J24)
J26  TOTAL CLP  = $J$25 * $G$9
J27  TOTAL DRS  = J26 / $G$10
```

El cuadro resumen usa la columna `H` para U.F., `I` para CL$ y `J` para USD:

```
H32  Cargo Fijo = J25            I32 = H32*$G$9      J32 = I32/$G$10
H33  Variable M = entrada, UF    I33 = H33*$G$9      J33 = I33/$G$10
H34  Variable C = entrada, UF    I34 = H34*$G$9      J34 = I34/$G$10
H35  Total      = SUM(H32:H34)   I35 = H35*$G$9      J35 = I35/$G$10

I37  VP (CL$)   = SUM(O22:O24)   J37  VP (USD) = SUM(N22:N24)
```

Cuando la cotización tiene una cantidad de ítems distinta de tres, la app
desplaza todo el bloque a partir de la fila 25 y reescribe las referencias; el
exportador cubre ese caso en `src/export/xlsx.test.ts`.

## Redondeo

La planilla **no redondea** en ningún punto de la cadena. El motor tampoco: los
valores se arrastran en doble precisión y el redondeo ocurre solo al mostrarlos
(`src/lib/format.ts`). Redondear en el cálculo desalinea los totales respecto de
la planilla.

## Valores de referencia

De la hoja `TCO FINAL`, con UF 39400 / T/C 1000 / Factor 0.03264:

| PN | Qty | Price List | Desc. | `G` | `I` | `J` | `N` | `O` |
|---|---|---|---|---|---|---|---|---|
| 423509 | 100 | 1479 | 0.55 | 665.55 | 0.551359187817259 | 55.1359187817259 | 66555 | 66555000 |
| 423524 | 9 | 310 | 0.40 | 186 | 0.15408730964467 | 1.38678578680203 | 1674 | 1674000 |
| 1647/00 | 100 | 209 | 0.20 | 167.2 | 0.138512893401015 | 13.8512893401015 | 16720 | 16720000 |

`TOTAL UF = 70.3739939086294` · `TOTAL CLP = 2772735.36` ·
`TOTAL DRS = 2772.73536` · `VP CL$ = 84949000` · `VP USD = 84949`.

Estos son los valores que la propia planilla dejó cacheados y los que verifica
`src/lib/calc.test.ts`.

## Advertencia sobre el tipo de cambio

El resumen convierte entre monedas por dos caminos distintos:

- **Cargo Fijo**: UF → CL$ multiplicando por `G9`, y CL$ → USD **dividiendo** por `G10`.
- **VP**: USD → CL$ **multiplicando** por `G10`.

Con `G10 = 1000` — el valor de referencia de la plantilla, no un tipo de cambio
real — la columna USD del cuadro resumen no representa dólares. La app replica la
fórmula tal cual y muestra un aviso mientras el T/C siga en 1000; corregirlo es
decisión del negocio, no del código.
