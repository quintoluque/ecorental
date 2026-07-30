# Fotos del sitio

Copiá acá las imágenes y después corré, desde la carpeta del proyecto:

```bash
node scripts/vincular-fotos.mjs
```

El script las conecta solo, mirando el **nombre del archivo**. No hay que editar
nada a mano.

## Dónde va cada cosa

| Carpeta | Para qué | Cómo nombrar el archivo |
|---|---|---|
| `productos/` | Foto de cada producto | El *slug* del producto: `rossignol-ski-black-ops.jpg` |
| `actividades/` | Foto de cada disciplina | El *slug* del área: `invierno.jpg`, `pesca.jpg` |
| `sucursales/` | Foto del local | El *slug* de la sucursal: `bariloche.jpg` |

**Varias fotos de un mismo producto:** agregá `-2`, `-3` al final.
La que no tiene número es la portada.

```
rossignol-ski-black-ops.jpg      ← portada
rossignol-ski-black-ops-2.jpg
rossignol-ski-black-ops-3.jpg
```

Si no sabés el slug exacto, corré el script igual: cuando un archivo no
coincide con nada, te lista todos los slugs disponibles.

## Formatos y tamaños

- Formatos aceptados: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- **Productos:** cuadradas, 1000 × 1000 px va perfecto
- **Actividades y sucursales:** apaisadas, 1600 × 900 px
- Tratá de que cada archivo pese **menos de 300 KB** para que el sitio siga
  cargando rápido con señal de montaña. Si pesan mucho, pasalas por
  [squoosh.app](https://squoosh.app) (es gratis y funciona en el navegador).

## Importante

Usá **fotos propias de ECO** o de los catálogos oficiales de las marcas que
distribuye. Las fotos de otras tiendas tienen derechos de autor y no se pueden
publicar.

## Mientras no haya fotos

No pasa nada: la web dibuja un marcador con el isotipo de ECO en su lugar. Podés
ir cargándolas de a poco, sin que el sitio quede roto en el medio.
