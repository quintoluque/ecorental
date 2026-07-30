#!/usr/bin/env node
/**
 * Importa el catalogo real de ECO a data/catalog.json desde un archivo CSV.
 *
 *   node scripts/importar-catalogo.mjs productos.csv
 *
 * El CSV debe tener encabezado con estas columnas (el orden no importa):
 *
 *   id,nombre,marca,area,grupo,descripcion,precio,alquilable,url
 *
 *  - id          numero, el mismo que usa detalle.php?id=... en el sitio actual
 *  - marca/area/grupo  nombre o slug; si no existen se dan de alta solos
 *  - precio      vacio = "Consultar" en la web (no se inventa un valor)
 *  - alquilable  si / no
 *
 * Los productos con un id ya presente se actualizan; el resto se agrega.
 * Nada se borra: para dar de baja un producto, quitalo a mano del JSON.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const RUTA_CATALOGO = new URL('../data/catalog.json', import.meta.url);

function crearSlug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lector de CSV que respeta comillas y comas dentro de un campo. */
function leerCSV(texto) {
  const filas = [];
  let campo = '';
  let fila = [];
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];

    if (entreComillas) {
      if (caracter === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreComillas = false;
      } else campo += caracter;
      continue;
    }

    if (caracter === '"') entreComillas = true;
    else if (caracter === ',') {
      fila.push(campo);
      campo = '';
    } else if (caracter === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else if (caracter !== '\r') campo += caracter;
  }

  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  const [encabezado, ...resto] = filas.filter((f) => f.some((c) => c.trim() !== ''));
  if (!encabezado) return [];

  const claves = encabezado.map((c) => c.trim().toLowerCase());
  return resto.map((valores) =>
    Object.fromEntries(claves.map((clave, i) => [clave, (valores[i] ?? '').trim()])),
  );
}

function aNumeroONulo(valor) {
  if (!valor) return null;
  const numero = Number(String(valor).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

const rutaCSV = argv[2];
if (!rutaCSV) {
  console.error('Uso: node scripts/importar-catalogo.mjs <archivo.csv>');
  exit(1);
}

const catalogo = JSON.parse(readFileSync(RUTA_CATALOGO, 'utf8'));
const filas = leerCSV(readFileSync(rutaCSV, 'utf8'));

if (filas.length === 0) {
  console.error('El CSV no tiene filas de datos.');
  exit(1);
}

/** Busca por slug o por nombre; si no existe, lo da de alta. */
function asegurarReferencia(coleccion, valor, extras = {}) {
  if (!valor) return null;
  const slug = crearSlug(valor);
  const existente = coleccion.find((e) => e.slug === slug || crearSlug(e.nombre) === slug);
  if (existente) return existente.slug;
  coleccion.push({ slug, nombre: valor, ...extras });
  return slug;
}

let actualizados = 0;
let agregados = 0;
const problemas = [];

for (const [indice, fila] of filas.entries()) {
  const numeroFila = indice + 2;

  if (!fila.nombre) {
    problemas.push(`Fila ${numeroFila}: sin nombre, se omite.`);
    continue;
  }

  const id = Number(fila.id);
  if (!Number.isInteger(id)) {
    problemas.push(`Fila ${numeroFila} (${fila.nombre}): id invalido, se omite.`);
    continue;
  }

  const marca = asegurarReferencia(catalogo.marcas, fila.marca);
  const area = asegurarReferencia(catalogo.areas, fila.area, {
    codigoOriginal: null,
    descripcion: null,
    actividades: [],
    destacada: true,
  });
  const grupo = fila.grupo
    ? asegurarReferencia(catalogo.grupos, fila.grupo, { area })
    : null;

  const producto = {
    id,
    slug: crearSlug(fila.nombre),
    nombre: fila.nombre,
    marca,
    area,
    grupo,
    descripcion: fila.descripcion || null,
    especificaciones: [],
    precio: aNumeroONulo(fila.precio),
    moneda: 'ARS',
    alquilable: /^(si|sí|true|1|x)$/i.test(fila.alquilable ?? ''),
    urlOriginal: fila.url || `https://www.eurocampingonline.com.ar/detalle.php?id=${id}`,
  };

  const posicion = catalogo.productos.findIndex((p) => p.id === id);
  if (posicion >= 0) {
    // Conservamos las especificaciones ya cargadas a mano.
    producto.especificaciones = catalogo.productos[posicion].especificaciones ?? [];
    catalogo.productos[posicion] = producto;
    actualizados++;
  } else {
    catalogo.productos.push(producto);
    agregados++;
  }
}

catalogo.productos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
catalogo._meta.ultimaActualizacion = new Date().toISOString().slice(0, 10);

writeFileSync(RUTA_CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`);

console.log(`Listo: ${agregados} productos agregados, ${actualizados} actualizados.`);
console.log(`Total en el catalogo: ${catalogo.productos.length}.`);
if (problemas.length) console.log(`\nAvisos:\n  ${problemas.join('\n  ')}`);
console.log('\nAhora corre:  npm run seed   (si usas el backend)');
