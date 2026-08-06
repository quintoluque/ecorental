#!/usr/bin/env node
/**
 * Baja las fotos de los productos desde el sitio actual de ECO y las deja
 * listas en apps/web/src/fotos/productos/.
 *
 *   node scripts/importar-fotos.mjs
 *
 * IMPORTANTE: hay que correrlo en una computadora con internet. Recorre la
 * pagina de cada producto (detalle.php?id=...), busca la foto, la baja y la
 * guarda con el nombre que espera la web: el slug del producto.
 *
 * No hay que adivinar nada: cada producto del catalogo ya tiene su direccion
 * original, asi que la foto que baja es la del producto y no la de otro.
 *
 * Opciones:
 *
 *   --limite 5        solo los primeros 5 productos (para probar de a poco)
 *   --solo <slug>     un producto puntual; se puede repetir
 *   --fotos 3         cuantas fotos como maximo por producto (defecto 3)
 *   --forzar          vuelve a bajar las de los productos que ya tienen foto
 *   --listar          no baja nada: muestra que fotos encontraria
 *   --pausa 400       milisegundos de espera entre pedidos (defecto 400)
 *   --base <url>      cambia el origen del sitio (sirve para pruebas)
 *   --conservar-repetidas
 *                     no descarta las fotos que se repiten en varios productos
 *                     (usalo si el script confundio una foto real con el cartel
 *                     de "sin imagen")
 *
 * Cuando termina, las fotos ya estan donde la web las busca. Si ademas usas el
 * backend, corre despues:  node scripts/vincular-fotos.mjs
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv, exit } from 'node:process';
import { setTimeout as esperar } from 'node:timers/promises';

const RUTA_CATALOGO = new URL('../data/catalog.json', import.meta.url);
const DESTINO = new URL('../apps/web/src/fotos/productos/', import.meta.url);
// En Windows el .pathname de una URL de archivo viene como /C:/... y no sirve
// para armar rutas: hay que convertirlo.
const DESTINO_RUTA = fileURLToPath(DESTINO);

const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Debajo de esto es un icono o un boton, no la foto de un producto. */
const LADO_MINIMO = 200;
const PESO_MINIMO = 5 * 1024;
/**
 * Una misma imagen repetida en varios productos suele ser el cartel de "sin
 * imagen" del sitio, pero no siempre: hay marcas que usan la misma foto para
 * toda una linea. Por eso ademas de repetirse tiene que cruzar marcas: el
 * cartel aparece en productos de marcas distintas; la foto reusada, no.
 */
const REPETICIONES_SOSPECHOSAS = 4;
const MARCAS_SOSPECHOSAS = 2;
/** Cuantas candidatas se prueban por producto antes de darlo por perdido. */
const CANDIDATAS_MAXIMAS = 8;
const DESCARGAS_EN_PARALELO = 4;

const TIPOS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

// Adornos de la plantilla del sitio: nunca son la foto del producto.
const DECORATIVAS =
  /(logo|banner|header|cabecera|footer|pie[-_.]|icon|icono|boton|button|flecha|arrow|spacer|blank|pixel|separador|fondo|bg[-_.]|whatsapp|facebook|instagram|twitter|youtube|tiktok|mapa|publicidad|cargando|loading|loader|sin[-_]?imagen|sin[-_]?foto|no[-_]?disponible|placeholder|carrito|lupa|buscar)/i;
// Miniaturas: sirven, pero solo si no aparece la version grande.
const MINIATURAS = /(thumb|miniatura|_th\b|[-_](sm|small|chica|chico|mini|p)\.)/i;

// --------------------------------------------------------------------------
// Argumentos
// --------------------------------------------------------------------------

function leerArgumentos(lista) {
  const opciones = {
    limite: Infinity,
    solo: [],
    fotos: 3,
    forzar: false,
    listar: false,
    pausa: 400,
    base: null,
    conservarRepetidas: false,
  };

  for (let i = 2; i < lista.length; i++) {
    const arg = lista[i];
    const siguiente = () => lista[++i];

    if (arg === '--limite') opciones.limite = Number(siguiente()) || Infinity;
    else if (arg === '--solo') opciones.solo.push(String(siguiente() ?? '').toLowerCase());
    else if (arg === '--fotos') opciones.fotos = Math.max(1, Number(siguiente()) || 3);
    else if (arg === '--forzar') opciones.forzar = true;
    else if (arg === '--listar') opciones.listar = true;
    else if (arg === '--conservar-repetidas') opciones.conservarRepetidas = true;
    else if (arg === '--pausa') opciones.pausa = Math.max(0, Number(siguiente()) || 0);
    else if (arg === '--base') opciones.base = String(siguiente() ?? '');
    else if (arg === '--ayuda' || arg === '-h') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
      exit(0);
    } else {
      console.error(`Opcion desconocida: ${arg}\nProba con --ayuda`);
      exit(1);
    }
  }

  return opciones;
}

// --------------------------------------------------------------------------
// Medidas de la imagen (sin dependencias: se leen del encabezado del archivo)
// --------------------------------------------------------------------------

function medidasDeImagen(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { ancho: buf.readUInt32BE(16), alto: buf.readUInt32BE(20) };
  }

  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { ancho: buf.readUInt16LE(6), alto: buf.readUInt16LE(8) };
  }

  if (
    buf.length > 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const formato = buf.toString('ascii', 12, 16);
    if (formato === 'VP8 ') {
      return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
    }
    if (formato === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { ancho: (bits & 0x3fff) + 1, alto: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (formato === 'VP8X') {
      return { ancho: buf.readUIntLE(24, 3) + 1, alto: buf.readUIntLE(27, 3) + 1 };
    }
  }

  // JPEG: hay que recorrer los marcadores hasta el que declara el tamano.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marcador = buf[i + 1];
      if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
        i += 2;
        continue;
      }
      const largo = buf.readUInt16BE(i + 2);
      const esTamano =
        marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
      if (esTamano) return { alto: buf.readUInt16BE(i + 5), ancho: buf.readUInt16BE(i + 7) };
      if (largo <= 0) break;
      i += 2 + largo;
    }
  }

  return null;
}

function extensionDe(tipo, url) {
  const porTipo = TIPOS.get(String(tipo).split(';')[0].trim().toLowerCase());
  if (porTipo) return porTipo;
  const enLaUrl = url.toLowerCase().match(/\.(jpe?g|png|webp|avif)(?:[?#]|$)/);
  if (!enLaUrl) return null;
  return enLaUrl[1] === 'jpeg' ? '.jpg' : `.${enLaUrl[1]}`;
}

// --------------------------------------------------------------------------
// Buscar las fotos dentro de la pagina
// --------------------------------------------------------------------------

function atributo(etiqueta, nombre) {
  const re = new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = etiqueta.match(re);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '').trim() : null;
}

/** De un srcset se queda con la variante mas grande. */
function mayorDeSrcset(valor) {
  const partes = valor
    .split(',')
    .map((p) => p.trim().split(/\s+/))
    .filter((p) => p[0])
    .map(([url, medida]) => ({ url, peso: Number(String(medida ?? '').replace(/[wx]$/, '')) || 0 }));
  if (!partes.length) return null;
  return partes.sort((a, b) => b.peso - a.peso)[0].url;
}

function candidatasDeHtml(html, urlPagina) {
  const crudas = [];

  for (const etiqueta of html.match(/<img\b[^>]*>/gi) ?? []) {
    for (const nombre of ['data-zoom-image', 'data-large', 'data-original', 'data-src', 'src']) {
      const valor = atributo(etiqueta, nombre);
      if (valor) crudas.push(valor);
    }
    const srcset = atributo(etiqueta, 'srcset') ?? atributo(etiqueta, 'data-srcset');
    if (srcset) {
      const mayor = mayorDeSrcset(srcset);
      if (mayor) crudas.push(mayor);
    }
  }

  // Galerias tipo lightbox: la foto grande cuelga del enlace, no del <img>.
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const url = m[2] ?? m[3] ?? '';
    if (/\.(jpe?g|png|webp|avif)(?:[?#]|$)/i.test(url)) crudas.push(url);
  }

  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const etiqueta = m[0];
    const propiedad = atributo(etiqueta, 'property') ?? atributo(etiqueta, 'name');
    if (/^(og:image|twitter:image)/i.test(propiedad ?? '')) {
      const contenido = atributo(etiqueta, 'content');
      if (contenido) crudas.push(contenido);
    }
  }

  for (const m of html.matchAll(/background-image\s*:\s*url\(\s*['"]?([^'")]+)/gi)) {
    crudas.push(m[1]);
  }

  const vistas = new Set();
  const candidatas = [];
  for (const cruda of crudas) {
    let absoluta;
    try {
      absoluta = new URL(cruda, urlPagina).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(absoluta)) continue;
    if (vistas.has(absoluta)) continue;
    vistas.add(absoluta);
    candidatas.push(absoluta);
  }

  return candidatas;
}

/**
 * Ordena las candidatas por probabilidad de ser la foto del producto. El id del
 * producto en la ruta del archivo es la senal mas fuerte: el sitio guarda las
 * fotos con el mismo numero que usa detalle.php?id=...
 */
function puntaje(url, id) {
  const ruta = url.toLowerCase();
  let puntos = 0;

  if (new RegExp(`(^|[^0-9])${id}([^0-9]|$)`).test(ruta.replace(/^https?:\/\/[^/]+/, ''))) {
    puntos += 100;
  }
  if (/\/(fotos|imagenes|images|img|productos|articulos|uploads)\//.test(ruta)) puntos += 40;
  if (/\.(jpe?g|png|webp|avif)(?:[?#]|$)/.test(ruta)) puntos += 10;
  if (MINIATURAS.test(ruta)) puntos -= 60;
  if (/\.gif(?:[?#]|$)/.test(ruta)) puntos -= 80;

  return puntos;
}

// --------------------------------------------------------------------------
// Red
// --------------------------------------------------------------------------

async function pedir(url, referer, intentos = 3) {
  let ultimoError = null;

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const respuesta = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': NAVEGADOR,
          'Accept-Language': 'es-AR,es;q=0.9',
          Accept: referer
            ? 'image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5'
            : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(referer ? { Referer: referer } : {}),
        },
      });

      if (respuesta.ok) return respuesta;
      if (respuesta.status === 429 || respuesta.status >= 500) {
        ultimoError = new Error(`HTTP ${respuesta.status}`);
      } else {
        return respuesta;
      }
    } catch (error) {
      ultimoError = error;
    }

    if (intento < intentos) await esperar(1000 * 2 ** (intento - 1));
  }

  throw ultimoError ?? new Error('sin respuesta');
}

// --------------------------------------------------------------------------
// Programa
// --------------------------------------------------------------------------

const opciones = leerArgumentos(argv);
const catalogo = JSON.parse(readFileSync(RUTA_CATALOGO, 'utf8'));

mkdirSync(DESTINO, { recursive: true });

const slugsConocidos = new Set(catalogo.productos.map((p) => p.slug));

/**
 * A que producto pertenece un archivo. Igual que en fotos.ts y en
 * vincular-fotos.mjs: primero se prueba el nombre entero y recien despues se
 * interpreta el "-2" final como numero de foto. Sin ese orden, un producto que
 * termina en numero —doite-carpa-hi-camper-2— se confundiria con la segunda
 * foto de otro, y bajar uno le borraria la portada al otro.
 */
function slugDeArchivo(nombre) {
  const base = nombre.slice(0, nombre.lastIndexOf('.')).toLowerCase();
  if (slugsConocidos.has(base)) return base;

  const sinIndice = base.replace(/-\d+$/, '');
  return slugsConocidos.has(sinIndice) ? sinIndice : base;
}

const archivosPrevios = readdirSync(DESTINO).filter((n) => /\.(jpe?g|png|webp|avif)$/i.test(n));
const yaTienenFoto = new Set(archivosPrevios.map(slugDeArchivo));

const seleccionados = catalogo.productos
  .filter((p) => (opciones.solo.length ? opciones.solo.includes(p.slug) : true))
  .filter((p) => (opciones.forzar || opciones.listar ? true : !yaTienenFoto.has(p.slug)))
  .filter((p) => p.urlOriginal)
  .slice(0, opciones.limite);

for (const slug of opciones.solo) {
  if (!slugsConocidos.has(slug)) {
    console.log(`Aviso: no hay ningun producto con el slug "${slug}".`);
  } else if (!seleccionados.some((p) => p.slug === slug)) {
    console.log(`Aviso: "${slug}" ya tiene foto. Para rehacerla agrega --forzar.`);
  }
}

console.log(`Productos a procesar: ${seleccionados.length} de ${catalogo.productos.length}.`);
if (!opciones.forzar && !opciones.listar && yaTienenFoto.size) {
  console.log(`(${yaTienenFoto.size} ya tienen foto; para rehacerlas usa --forzar)`);
}
if (opciones.listar) console.log('Modo --listar: no se baja ni se guarda nada.\n');
if (!seleccionados.length) {
  console.log('\nNo hay nada que hacer.');
  exit(0);
}

const conFoto = [];
const sinFoto = [];
const porHash = new Map();
let bajadas = 0;

function urlDelProducto(producto) {
  if (!opciones.base) return producto.urlOriginal;
  const original = new URL(producto.urlOriginal);
  const nueva = new URL(opciones.base);
  nueva.pathname = original.pathname;
  nueva.search = original.search;
  return nueva.href;
}

function borrarFotosDe(slug) {
  for (const archivo of readdirSync(DESTINO)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(archivo)) continue;
    if (slugDeArchivo(archivo) === slug) rmSync(join(DESTINO_RUTA, archivo), { force: true });
  }
}

async function procesar(producto) {
  const urlPagina = urlDelProducto(producto);
  let html;

  try {
    const respuesta = await pedir(urlPagina, null);
    if (!respuesta.ok) {
      sinFoto.push({ producto, motivo: `la pagina respondio HTTP ${respuesta.status}` });
      return;
    }
    html = await respuesta.text();
  } catch (error) {
    sinFoto.push({ producto, motivo: `no se pudo abrir la pagina (${error.message})` });
    return;
  }

  const candidatas = candidatasDeHtml(html, urlPagina)
    .filter((url) => !DECORATIVAS.test(url))
    .map((url) => ({ url, puntos: puntaje(url, producto.id) }))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, CANDIDATAS_MAXIMAS);

  if (!candidatas.length) {
    sinFoto.push({ producto, motivo: 'la pagina no tiene ninguna imagen de producto' });
    return;
  }

  if (opciones.listar) {
    console.log(`${producto.slug}`);
    for (const { url, puntos } of candidatas) console.log(`   ${String(puntos).padStart(4)}  ${url}`);
    conFoto.push({ producto, archivos: [] });
    return;
  }

  const elegidas = [];
  const hashesDelProducto = new Set();
  let descartadasPorChicas = 0;

  for (const { url } of candidatas) {
    if (elegidas.length >= opciones.fotos) break;

    let buffer;
    let tipo;
    try {
      const respuesta = await pedir(url, urlPagina);
      if (!respuesta.ok) continue;
      tipo = respuesta.headers.get('content-type') ?? '';
      buffer = Buffer.from(await respuesta.arrayBuffer());
    } catch {
      continue;
    }

    const extension = extensionDe(tipo, url);
    if (!extension) continue;
    if (buffer.length < PESO_MINIMO) {
      descartadasPorChicas++;
      continue;
    }

    const medidas = medidasDeImagen(buffer);
    if (medidas && (medidas.ancho < LADO_MINIMO || medidas.alto < LADO_MINIMO)) {
      descartadasPorChicas++;
      continue;
    }

    const hash = createHash('sha1').update(buffer).digest('hex');
    if (hashesDelProducto.has(hash)) continue;
    hashesDelProducto.add(hash);

    elegidas.push({ buffer, extension, hash, medidas, url });
    if (opciones.pausa) await esperar(opciones.pausa);
  }

  if (!elegidas.length) {
    sinFoto.push({
      producto,
      motivo:
        descartadasPorChicas === 0
          ? 'no se pudo bajar ninguna imagen'
          : descartadasPorChicas === 1
            ? 'la unica imagen de la pagina es demasiado chica'
            : `las ${descartadasPorChicas} imagenes de la pagina son demasiado chicas`,
    });
    return;
  }

  // La mas grande queda de portada: es la que se ve en la grilla y en la ficha.
  elegidas.sort((a, b) => {
    const areaA = a.medidas ? a.medidas.ancho * a.medidas.alto : 0;
    const areaB = b.medidas ? b.medidas.ancho * b.medidas.alto : 0;
    return areaB - areaA || b.buffer.length - a.buffer.length;
  });

  borrarFotosDe(producto.slug);

  const archivos = [];
  for (const [indice, foto] of elegidas.entries()) {
    const nombre = `${producto.slug}${indice === 0 ? '' : `-${indice + 1}`}${foto.extension}`;
    writeFileSync(new URL(nombre, DESTINO), foto.buffer);
    archivos.push({ nombre, hash: foto.hash, medidas: foto.medidas, peso: foto.buffer.length });

    if (!porHash.has(foto.hash)) porHash.set(foto.hash, []);
    porHash.get(foto.hash).push({ slug: producto.slug, nombre, marca: producto.marca });
    bajadas++;
  }

  conFoto.push({ producto, archivos });
}

/** Varios productos a la vez, pero sin avalanchas: el sitio es viejo. */
async function enTandas(items, cantidad, tarea) {
  let siguiente = 0;
  const obreros = Array.from({ length: Math.min(cantidad, items.length) }, async () => {
    while (siguiente < items.length) {
      const item = items[siguiente++];
      await tarea(item);
      const hechos = conFoto.length + sinFoto.length;
      if (hechos % 20 === 0) console.log(`   ... ${hechos}/${items.length}`);
    }
  });
  await Promise.all(obreros);
}

await enTandas(seleccionados, DESCARGAS_EN_PARALELO, procesar);

// Una misma imagen en varios productos de marcas distintas es el "sin foto".
const repetidas = opciones.conservarRepetidas
  ? []
  : [...porHash.values()].filter(
      (usos) =>
        usos.length >= REPETICIONES_SOSPECHOSAS &&
        new Set(usos.map((u) => u.marca)).size >= MARCAS_SOSPECHOSAS,
    );
let borradasPorRepetidas = 0;
for (const usos of repetidas) {
  for (const { slug, nombre } of usos) {
    rmSync(new URL(nombre, DESTINO), { force: true });
    borradasPorRepetidas++;
    const entrada = conFoto.find((c) => c.producto.slug === slug);
    if (entrada) entrada.archivos = entrada.archivos.filter((a) => a.nombre !== nombre);
  }
}
for (const entrada of [...conFoto]) {
  if (!entrada.archivos.length && !opciones.listar) {
    conFoto.splice(conFoto.indexOf(entrada), 1);
    sinFoto.push({ producto: entrada.producto, motivo: 'el sitio muestra un cartel de "sin imagen"' });
  }
}

// --------------------------------------------------------------------------
// Resumen
// --------------------------------------------------------------------------

console.log('');
if (opciones.listar) {
  console.log(`Listado terminado: ${conFoto.length} productos con imagenes, ${sinFoto.length} sin ninguna.`);
} else {
  console.log(`Fotos bajadas: ${bajadas - borradasPorRepetidas} en ${conFoto.length} productos.`);
  if (borradasPorRepetidas) {
    console.log(
      `Descartadas: ${borradasPorRepetidas} porque la misma imagen aparecia en productos de` +
        '\nvarias marcas, o sea el cartel de "sin imagen" del sitio.' +
        '\n(si te parece que se equivoco, volve a correrlo con --conservar-repetidas)',
    );
  }
}

if (sinFoto.length) {
  console.log(`\nSin foto (${sinFoto.length}):`);
  const porMotivo = new Map();
  for (const { producto, motivo } of sinFoto) {
    if (!porMotivo.has(motivo)) porMotivo.set(motivo, []);
    porMotivo.get(motivo).push(producto.slug);
  }
  for (const [motivo, slugs] of [...porMotivo].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${slugs.length} - ${motivo}`);
    console.log(`      ${slugs.slice(0, 5).join(', ')}${slugs.length > 5 ? ', ...' : ''}`);
  }

  // El sitio original corta la lectura automatica cuando le entran muchos
  // pedidos seguidos. Se nota porque falla casi todo junto.
  const bloqueados = sinFoto.filter(({ motivo }) => /HTTP (403|401|429)/.test(motivo)).length;
  if (bloqueados > sinFoto.length / 2 && bloqueados > 3) {
    console.log(
      '\nEl sitio esta cortando los pedidos automaticos. Proba de nuevo mas despacio:' +
        '\n  node scripts/importar-fotos.mjs --pausa 3000' +
        '\nLo que ya bajo queda guardado, asi que podes cortarlo y seguir cuando quieras.',
    );
  }
}

if (!opciones.listar && bajadas > borradasPorRepetidas) {
  const pesadas = readdirSync(DESTINO)
    .filter((n) => /\.(jpe?g|png|webp|avif)$/i.test(n))
    .map((n) => ({ nombre: n, peso: statSync(join(DESTINO_RUTA, n)).size }))
    .filter((a) => a.peso > 300 * 1024);

  if (pesadas.length) {
    console.log(
      `\nAviso: ${pesadas.length} foto(s) pesan mas de 300 KB. La web funciona igual,` +
        '\npero si queres que cargue mas rapido pasalas por https://squoosh.app',
    );
  }

  // Corriendo desde el boton de GitHub, guardar y publicar lo hace el propio
  // flujo: repetir aca los comandos solo confunde a quien lee el resumen.
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log('\nListo: las fotos se guardan y se publican solas en los pasos que siguen.');
  } else {
    console.log('\nListo. Las fotos ya estan en apps/web/src/fotos/productos/.');
    console.log('Mira como quedo con:  npm run dev');
    console.log('Si usas el backend, corre ademas:  node scripts/vincular-fotos.mjs');
    console.log('Despues subilas con:  git add apps/web/src/fotos && git commit -m "Fotos de productos" && git push');
  }
}
