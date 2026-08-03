/**
 * Clasificador de productos de ECO.
 *
 * Cada artículo del catálogo se ordena en varios rubros a la vez para que la
 * web pueda filtrarlo por facetas (deporte, tipo de artículo, público,
 * temporada). La clasificación se deduce del nombre, el área y el grupo: son
 * los tres datos que el sitio original publica para todos los productos, así
 * que no hay que cargar nada a mano.
 *
 * Lo que se carga explícitamente en el CSV siempre gana; esto sólo completa lo
 * que falta. Ver scripts/importar-catalogo.mjs y scripts/clasificar-catalogo.mjs.
 */

/** Definición de los rubros. Es la fuente única: la web la lee del catálogo. */
export const TAXONOMIA = {
  deportes: [
    { slug: 'ski', nombre: 'Ski', area: 'invierno' },
    { slug: 'snowboard', nombre: 'Snowboard', area: 'invierno' },
    { slug: 'camping', nombre: 'Camping', area: 'camping-trekking' },
    { slug: 'trekking', nombre: 'Trekking', area: 'camping-trekking' },
    { slug: 'montanismo', nombre: 'Montañismo', area: 'escalada-montanismo' },
    { slug: 'escalada', nombre: 'Escalada', area: 'escalada-montanismo' },
    { slug: 'pesca', nombre: 'Pesca', area: 'pesca' },
    { slug: 'nautica', nombre: 'Náutica', area: 'nautica' },
    { slug: 'kayak', nombre: 'Kayak', area: 'nautica' },
    { slug: 'surf', nombre: 'Surf', area: 'surf-kitesurf' },
    { slug: 'kitesurf', nombre: 'Kitesurf', area: 'surf-kitesurf' },
  ],
  tipos: [
    {
      slug: 'equipamiento',
      nombre: 'Equipamiento',
      descripcion: 'El equipo que define la actividad: skis, kayaks, carpas, cañas.',
    },
    {
      slug: 'indumentaria',
      nombre: 'Indumentaria',
      descripcion: 'Prendas técnicas: camperas, pantalones, primera piel, neoprene.',
    },
    {
      slug: 'calzado',
      nombre: 'Calzado',
      descripcion: 'Botas de ski, de trekking, náuticas y zapatillas.',
    },
    {
      slug: 'accesorios',
      nombre: 'Accesorios',
      descripcion: 'Antiparras, gorros, bolsos, linternas y todo lo que complementa.',
    },
  ],
  publicos: [
    { slug: 'unisex', nombre: 'Unisex' },
    { slug: 'hombre', nombre: 'Hombre' },
    { slug: 'mujer', nombre: 'Mujer' },
    { slug: 'ninos', nombre: 'Niños' },
  ],
  temporadas: [
    { slug: 'invierno', nombre: 'Invierno' },
    { slug: 'verano', nombre: 'Verano' },
    { slug: 'todo-el-ano', nombre: 'Todo el año' },
  ],
};

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Devuelve true si alguna palabra clave aparece en el texto. */
function tiene(texto, palabras) {
  return palabras.some((palabra) => texto.includes(palabra));
}

/* ------------------------------------------------------------------ tipo -- */

// El orden importa: "escarpines botas ski" es un accesorio, no calzado, y
// "bolsa de dormir" no es indumentaria aunque diga "bolsa".
const REGLAS_TIPO = [
  {
    tipo: 'accesorios',
    palabras: [
      'escarpin', 'antiparra', 'anteojo', 'gorro', 'guante', 'cuello', 'bolso', 'funda',
      'linterna', 'farol', 'termo', 'cantimplora', 'matera', 'cartucho', 'impermeabilizante',
      'mosqueton', 'llavero', 'valvula', 'tapon', 'pita', 'cera', 'candado', 'bastonera',
    ],
  },
  {
    tipo: 'calzado',
    palabras: ['bota', 'zapatilla', 'zapato', 'calzado', 'pantufla', 'sandalia', 'borcego'],
  },
  {
    tipo: 'indumentaria',
    palabras: [
      'campera', 'pantalon', 'calza', 'camiseta', 'remera', 'buzo', 'chaleco', 'short',
      'neoprene', 'wader', 'traje', 'primera piel', 'media', 'polera', 'poncho', 'malla',
    ],
  },
];

function deducirTipo(texto) {
  for (const regla of REGLAS_TIPO) {
    if (tiene(texto, regla.palabras)) return regla.tipo;
  }
  return 'equipamiento';
}

/* --------------------------------------------------------------- publico -- */

function deducirPublico(texto) {
  if (tiene(texto, ['junior', ' jr', 'kids', 'kiddy', 'niño', 'nino', 'my first', 'infantil'])) {
    return 'ninos';
  }
  if (tiene(texto, ['lady', 'ladies', 'women', 'womens', 'dama', 'mujer', 'femenin'])) {
    return 'mujer';
  }
  // "VENTURE 2 W" es la versión de mujer: la W final es la convención de marca.
  if (/\sw$/.test(texto)) return 'mujer';
  if (tiene(texto, ['mens', ' men', 'hombre', 'masculin'])) return 'hombre';
  return 'unisex';
}

/* ------------------------------------------------------------- temporada -- */

const TEMPORADA_POR_AREA = {
  invierno: 'invierno',
  nautica: 'verano',
  'surf-kitesurf': 'verano',
  'grass-skiing': 'verano',
};

function deducirTemporada(area, texto) {
  if (tiene(texto, ['pantalon verano', 'pantalones verano'])) return 'verano';
  return TEMPORADA_POR_AREA[area] ?? 'todo-el-ano';
}

/* -------------------------------------------------------------- deportes -- */

const SOLO_SKI = ['ski', 'skis', 'esqui', 'baston'];
const SOLO_SNOW = ['snowboard', 'snow board', 'tabla'];

function deducirDeportes(area, texto) {
  switch (area) {
    case 'invierno': {
      // Ojo con "apreski": no es equipo de ski, es calzado de después.
      const limpio = texto.replace(/apreski/g, '');
      const esSnow = tiene(limpio, SOLO_SNOW);
      const esSki = tiene(limpio, SOLO_SKI);
      if (esSnow && !esSki) return ['snowboard'];
      if (esSki && !esSnow) return ['ski'];
      // Camperas, antiparras, cascos y gorros sirven para las dos.
      return ['ski', 'snowboard'];
    }
    case 'camping-trekking': {
      const deportes = ['camping', 'trekking'];
      if (tiene(texto, ['montan', 'expedicion', 'aconcagua', 'everest'])) deportes.push('montanismo');
      return deportes;
    }
    case 'escalada-montanismo':
      return ['escalada', 'montanismo'];
    case 'nautica': {
      const deportes = ['nautica'];
      if (tiene(texto, ['kayak', 'remo', 'packraft'])) deportes.unshift('kayak');
      if (tiene(texto, ['fishing', 'pesca', 'fish'])) deportes.push('pesca');
      return deportes;
    }
    case 'pesca':
      return ['pesca'];
    case 'surf-kitesurf':
      return ['surf', 'kitesurf'];
    case 'grass-skiing':
      return ['ski'];
    default:
      return [];
  }
}

/* ----------------------------------------------------------------- api ---- */

/**
 * Clasifica un producto. `grupoNombre` es opcional pero ayuda: el grupo del
 * sitio original ("Botas Ski", "Trajes de neoprene") es muy descriptivo.
 */
export function clasificar({ nombre, area, grupoNombre = '', descripcion = '' }) {
  const texto = normalizar(`${nombre} ${grupoNombre} ${descripcion}`);

  return {
    deportes: deducirDeportes(area, texto),
    tipo: deducirTipo(texto),
    // Sólo sobre el nombre: la convención de marca para mujer es una "W" al
    // final, y concatenarle el grupo la dejaría de encontrar.
    publico: deducirPublico(normalizar(nombre)),
    temporada: deducirTemporada(area, texto),
  };
}
