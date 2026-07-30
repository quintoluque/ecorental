#!/usr/bin/env node
/**
 * Registra en data/catalog.json las fotos que haya en apps/web/src/fotos/.
 *
 *   node scripts/vincular-fotos.mjs
 *
 * OJO: la web NO necesita este script. Detecta las fotos sola al compilar
 * (ver apps/web/src/lib/fotos.ts), asi que alcanza con copiar los archivos.
 *
 * Este script sirve para que el BACKEND y la API tambien conozcan las fotos,
 * dejandolas anotadas en el catalogo. Corrrelo solo si usas el backend.
 *
 *   apps/web/src/fotos/productos/     -> el archivo debe llamarse como el
 *                                           "slug" del producto.
 *                                           Ej: rossignol-ski-black-ops.jpg
 *                                           Varias fotos del mismo producto:
 *                                           rossignol-ski-black-ops-2.jpg, -3.jpg…
 *
 *   apps/web/src/fotos/actividades/   -> nombre = slug del area.
 *                                           Ej: invierno.jpg, pesca.jpg
 *
 *   apps/web/src/fotos/sucursales/    -> nombre = slug de la sucursal.
 *                                           Ej: bariloche.jpg
 *
 * Corre el script las veces que quieras: siempre reescribe la lista completa
 * segun lo que haya en las carpetas, asi que borrar una foto tambien la
 * desvincula.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..');
const RUTA_CATALOGO = join(raiz, 'data', 'catalog.json');
const RAIZ_FOTOS = join(raiz, 'apps', 'web', 'src', 'fotos');

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

function listar(subcarpeta) {
  const dir = join(RAIZ_FOTOS, subcarpeta);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => EXTENSIONES.has(n.slice(n.lastIndexOf('.')).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

/**
 * Deduce a que slug pertenece un archivo.
 *
 * Primero prueba el nombre tal cual, y solo si no coincide con ningun slug
 * conocido interpreta el "-2" final como numero de foto. Sin ese orden, un
 * producto que termina en numero —x-terra-bolsa-de-dormir-polar-200— se
 * confundiria con la segunda foto de otro.
 */
function slugDeArchivo(nombre, slugsConocidos) {
  const base = nombre.slice(0, nombre.lastIndexOf('.')).toLowerCase();
  if (slugsConocidos.has(base)) return base;

  const sinIndice = base.replace(/-\d+$/, '');
  return slugsConocidos.has(sinIndice) ? sinIndice : base;
}

const catalogo = JSON.parse(readFileSync(RUTA_CATALOGO, 'utf8'));

const sinUsar = [];
let fotosProductos = 0;
let fotosAreas = 0;
let fotosSucursales = 0;

// --- Productos (admiten varias fotos) ---
const slugsProductos = new Set(catalogo.productos.map((p) => p.slug));
const porProducto = new Map();
for (const archivo of listar('productos')) {
  const slug = slugDeArchivo(archivo, slugsProductos);
  if (!porProducto.has(slug)) porProducto.set(slug, []);
  porProducto.get(slug).push(`fotos/productos/${archivo}`);
}

/** 'x.jpg' -> 0 (portada), 'x-2.jpg' -> 2, 'x-3.jpg' -> 3. */
function indiceDeFoto(ruta) {
  const base = ruta.slice(ruta.lastIndexOf('/') + 1, ruta.lastIndexOf('.'));
  const coincidencia = base.match(/-(\d+)$/);
  return coincidencia ? Number(coincidencia[1]) : 0;
}

for (const producto of catalogo.productos) {
  // La foto sin numero es la portada; despues van -2, -3, etc.
  producto.imagenes = (porProducto.get(producto.slug) ?? []).sort(
    (a, b) => indiceDeFoto(a) - indiceDeFoto(b),
  );
  fotosProductos += producto.imagenes.length;
  porProducto.delete(producto.slug);
}
for (const [slug, rutas] of porProducto) {
  sinUsar.push(`productos/${slug} (${rutas.length} archivo(s)): ningun producto tiene ese slug`);
}

// --- Areas y sucursales (una foto cada una) ---
const asignarUna = (coleccion, subcarpeta, etiqueta) => {
  const slugsConocidos = new Set(coleccion.map((i) => i.slug));
  const porSlug = new Map();
  for (const archivo of listar(subcarpeta)) {
    const slug = slugDeArchivo(archivo, slugsConocidos);
    if (!porSlug.has(slug)) porSlug.set(slug, `fotos/${subcarpeta}/${archivo}`);
  }
  let contador = 0;
  for (const item of coleccion) {
    const ruta = porSlug.get(item.slug) ?? null;
    item.imagen = ruta;
    if (ruta) contador++;
    porSlug.delete(item.slug);
  }
  for (const slug of porSlug.keys()) {
    sinUsar.push(`${subcarpeta}/${slug}: ningun ${etiqueta} tiene ese slug`);
  }
  return contador;
};

fotosAreas = asignarUna(catalogo.areas, 'actividades', 'area');
fotosSucursales = asignarUna(catalogo.sucursales, 'sucursales', 'sucursal');

catalogo._meta.ultimaActualizacion = new Date().toISOString().slice(0, 10);
writeFileSync(RUTA_CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`);

console.log('Fotos vinculadas:');
console.log(`  productos   ${fotosProductos} foto(s) en ${catalogo.productos.filter((p) => p.imagenes.length).length} de ${catalogo.productos.length} productos`);
console.log(`  actividades ${fotosAreas} de ${catalogo.areas.length}`);
console.log(`  sucursales  ${fotosSucursales} de ${catalogo.sucursales.length}`);

if (sinUsar.length) {
  console.log('\nArchivos que quedaron sin vincular (revisa el nombre):');
  for (const aviso of sinUsar) console.log(`  - ${aviso}`);
  console.log('\nSlugs disponibles:');
  console.log('  areas:      ' + catalogo.areas.map((a) => a.slug).join(', '));
  console.log('  sucursales: ' + catalogo.sucursales.map((s) => s.slug).join(', '));
  console.log('  productos:  ' + catalogo.productos.map((p) => p.slug).join(', '));
}

console.log('\nListo. Guarda los cambios y la web ya muestra las fotos.');
