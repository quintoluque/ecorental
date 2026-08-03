#!/usr/bin/env node
/**
 * Clasifica el catálogo y sincroniza la taxonomía.
 *
 *   node scripts/clasificar-catalogo.mjs            completa lo que falta
 *   node scripts/clasificar-catalogo.mjs --rehacer  reclasifica todo de cero
 *
 * Deja en data/catalog.json el bloque "taxonomia" (los rubros con los que la
 * web arma la barra de filtros) y, en cada producto, sus valores. Correlo
 * después de editar el JSON a mano o de tocar las reglas del clasificador.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';
import { TAXONOMIA, clasificar } from './clasificador.mjs';

const RUTA_CATALOGO = new URL('../data/catalog.json', import.meta.url);
const rehacer = argv.includes('--rehacer');

const catalogo = JSON.parse(readFileSync(RUTA_CATALOGO, 'utf8'));

// La taxonomía vive en el clasificador y se copia al catálogo, para que la web
// no tenga que duplicar la lista de rubros.
catalogo.taxonomia = TAXONOMIA;

const nombreDeGrupo = new Map(catalogo.grupos.map((g) => [g.slug, g.nombre]));

let completados = 0;
const sinDeporte = [];

for (const producto of catalogo.productos) {
  const deducida = clasificar({
    nombre: producto.nombre,
    area: producto.area,
    grupoNombre: nombreDeGrupo.get(producto.grupo) ?? '',
    descripcion: producto.descripcion ?? '',
  });

  const antes = JSON.stringify([
    producto.deportes,
    producto.tipo,
    producto.publico,
    producto.temporada,
  ]);

  producto.deportes = rehacer ? deducida.deportes : (producto.deportes ?? deducida.deportes);
  producto.tipo = rehacer ? deducida.tipo : (producto.tipo ?? deducida.tipo);
  producto.publico = rehacer ? deducida.publico : (producto.publico ?? deducida.publico);
  producto.temporada = rehacer ? deducida.temporada : (producto.temporada ?? deducida.temporada);

  if (
    JSON.stringify([producto.deportes, producto.tipo, producto.publico, producto.temporada]) !==
    antes
  ) {
    completados++;
  }

  if (!producto.deportes?.length) sinDeporte.push(producto.nombre);
}

catalogo._meta.ultimaActualizacion = new Date().toISOString().slice(0, 10);
writeFileSync(RUTA_CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`);

const contar = (clave) => {
  const cuenta = new Map();
  for (const p of catalogo.productos) {
    for (const valor of Array.isArray(p[clave]) ? p[clave] : [p[clave]]) {
      cuenta.set(valor, (cuenta.get(valor) ?? 0) + 1);
    }
  }
  return [...cuenta].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`).join(' · ');
};

console.log(`Clasificados ${catalogo.productos.length} productos (${completados} actualizados).\n`);
console.log(`  deporte    ${contar('deportes')}`);
console.log(`  tipo       ${contar('tipo')}`);
console.log(`  publico    ${contar('publico')}`);
console.log(`  temporada  ${contar('temporada')}`);

if (sinDeporte.length) {
  console.log(`\nSin deporte asignado (${sinDeporte.length}):\n  ${sinDeporte.join('\n  ')}`);
}
