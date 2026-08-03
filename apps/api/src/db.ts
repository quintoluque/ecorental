import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

mkdirSync(dirname(config.rutaBase), { recursive: true });

export const db = new DatabaseSync(config.rutaBase);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/**
 * Esquema del negocio. Pensado para el flujo real de ECO:
 * un catalogo unico, stock y precios que varian por sucursal, y un parque de
 * equipos de alquiler cuya disponibilidad depende del rango de fechas pedido.
 */
export const ESQUEMA = `
CREATE TABLE IF NOT EXISTS areas (
  slug            TEXT PRIMARY KEY,
  codigo_original TEXT,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  destacada       INTEGER NOT NULL DEFAULT 0,
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grupos (
  slug      TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  area_slug TEXT NOT NULL REFERENCES areas(slug)
);

CREATE TABLE IF NOT EXISTS marcas (
  slug   TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sucursales (
  slug          TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  referencia    TEXT,
  direccion     TEXT,
  codigo_postal TEXT,
  ciudad        TEXT NOT NULL,
  provincia     TEXT NOT NULL,
  telefono      TEXT,
  whatsapp      TEXT,
  email         TEXT,
  horarios      TEXT NOT NULL DEFAULT '[]',
  servicios     TEXT NOT NULL DEFAULT '[]',
  casa_central  INTEGER NOT NULL DEFAULT 0,
  centro_de_ski TEXT,
  url_original  TEXT
);

CREATE TABLE IF NOT EXISTS productos (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  nombre            TEXT NOT NULL,
  marca_slug        TEXT REFERENCES marcas(slug),
  area_slug         TEXT REFERENCES areas(slug),
  grupo_slug        TEXT REFERENCES grupos(slug),
  descripcion       TEXT,
  especificaciones  TEXT NOT NULL DEFAULT '[]',
  precio            REAL,
  moneda            TEXT NOT NULL DEFAULT 'ARS',
  alquilable        INTEGER NOT NULL DEFAULT 0,
  -- Rubros de clasificacion: los filtros de la barra lateral del catalogo.
  tipo              TEXT,
  publico           TEXT,
  temporada         TEXT,
  url_original      TEXT,
  activo            INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_productos_area      ON productos(area_slug);
CREATE INDEX IF NOT EXISTS idx_productos_marca     ON productos(marca_slug);
CREATE INDEX IF NOT EXISTS idx_productos_grupo     ON productos(grupo_slug);
CREATE INDEX IF NOT EXISTS idx_productos_tipo      ON productos(tipo);
CREATE INDEX IF NOT EXISTS idx_productos_precio    ON productos(precio);

-- Un articulo puede servir para varios deportes (una campera sirve para ski y
-- para snowboard), asi que va en tabla aparte y no como columna.
CREATE TABLE IF NOT EXISTS producto_deportes (
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  deporte     TEXT NOT NULL,
  PRIMARY KEY (producto_id, deporte)
);

CREATE INDEX IF NOT EXISTS idx_producto_deportes ON producto_deportes(deporte);

-- Stock real por sucursal y talle. Es la tabla que mas se escribe: un indice
-- por sucursal evita recorrer todo el catalogo al consultar una tienda.
CREATE TABLE IF NOT EXISTS stock (
  producto_id    INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sucursal_slug  TEXT NOT NULL REFERENCES sucursales(slug) ON DELETE CASCADE,
  talle          TEXT NOT NULL DEFAULT 'UNICO',
  cantidad       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, sucursal_slug, talle)
);

CREATE INDEX IF NOT EXISTS idx_stock_sucursal ON stock(sucursal_slug);

-- Cada categoria es un equipo completo (ski o snowboard) para un publico y un
-- nivel: es lo que se reserva y lo que tiene parque propio por sucursal.
CREATE TABLE IF NOT EXISTS rental_categorias (
  slug           TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  disciplina     TEXT NOT NULL DEFAULT 'ski',
  publico        TEXT NOT NULL DEFAULT 'adulto',
  nivel          TEXT NOT NULL DEFAULT 'principiante',
  incluye        TEXT NOT NULL DEFAULT '[]',
  tarifa_por_dia REAL,
  moneda         TEXT NOT NULL DEFAULT 'ARS',
  orden          INTEGER NOT NULL DEFAULT 0
);

-- Casco, antiparras, ropa de nieve: se suman al equipo y se cobran aparte.
CREATE TABLE IF NOT EXISTS rental_adicionales (
  slug           TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  tarifa_por_dia REAL,
  moneda         TEXT NOT NULL DEFAULT 'ARS',
  orden          INTEGER NOT NULL DEFAULT 0
);

-- Parque de equipos de alquiler: cuantas unidades tiene cada sucursal.
CREATE TABLE IF NOT EXISTS rental_inventario (
  categoria_slug TEXT NOT NULL REFERENCES rental_categorias(slug) ON DELETE CASCADE,
  sucursal_slug  TEXT NOT NULL REFERENCES sucursales(slug) ON DELETE CASCADE,
  unidades       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (categoria_slug, sucursal_slug)
);

-- Una reserva es de todo el viaje: una sucursal, un rango de fechas y varias
-- personas, que pueden llevar equipos distintos.
CREATE TABLE IF NOT EXISTS rental_reservas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT NOT NULL UNIQUE,
  categoria_slug TEXT NOT NULL REFERENCES rental_categorias(slug),
  sucursal_slug  TEXT NOT NULL REFERENCES sucursales(slug),
  desde          TEXT NOT NULL,
  hasta          TEXT NOT NULL,
  unidades       INTEGER NOT NULL DEFAULT 1,
  cliente        TEXT NOT NULL,
  participantes  TEXT NOT NULL DEFAULT '[]',
  adicionales    TEXT NOT NULL DEFAULT '[]',
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  total          REAL,
  creado         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Los equipos de la reserva, uno por categoria. Es la tabla contra la que se
-- calcula la disponibilidad: una reserva de 4 personas con 2 equipos Standard
-- y 2 Performance ocupa parque de las dos categorias, no de una.
CREATE TABLE IF NOT EXISTS rental_reserva_items (
  reserva_id     INTEGER NOT NULL REFERENCES rental_reservas(id) ON DELETE CASCADE,
  categoria_slug TEXT NOT NULL REFERENCES rental_categorias(slug),
  unidades       INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (reserva_id, categoria_slug)
);

CREATE INDEX IF NOT EXISTS idx_reserva_items_categoria
  ON rental_reserva_items(categoria_slug);

-- La consulta caliente del negocio: reservas que se solapan con un rango.
CREATE INDEX IF NOT EXISTS idx_reservas_rango
  ON rental_reservas(sucursal_slug, desde, hasta);

CREATE TABLE IF NOT EXISTS pedidos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT NOT NULL UNIQUE,
  cliente         TEXT NOT NULL,
  items           TEXT NOT NULL,
  total           REAL,
  entrega         TEXT NOT NULL DEFAULT 'retiro',
  sucursal_slug   TEXT REFERENCES sucursales(slug),
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  creado          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultas (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre   TEXT NOT NULL,
  email    TEXT NOT NULL,
  telefono TEXT,
  asunto   TEXT,
  mensaje  TEXT NOT NULL,
  creado   TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Columnas que se agregaron despues de la primera version. CREATE TABLE IF NOT
 * EXISTS no toca una tabla que ya existe, asi que las bases creadas antes se
 * completan aca en vez de tener que borrarlas y volver a sembrar.
 */
const COLUMNAS_NUEVAS: { tabla: string; columna: string; definicion: string }[] = [
  { tabla: 'productos', columna: 'tipo', definicion: 'TEXT' },
  { tabla: 'productos', columna: 'publico', definicion: 'TEXT' },
  { tabla: 'productos', columna: 'temporada', definicion: 'TEXT' },
  { tabla: 'rental_categorias', columna: 'disciplina', definicion: "TEXT NOT NULL DEFAULT 'ski'" },
  { tabla: 'rental_categorias', columna: 'publico', definicion: "TEXT NOT NULL DEFAULT 'adulto'" },
  { tabla: 'rental_categorias', columna: 'nivel', definicion: "TEXT NOT NULL DEFAULT 'principiante'" },
  { tabla: 'rental_categorias', columna: 'orden', definicion: 'INTEGER NOT NULL DEFAULT 0' },
  { tabla: 'rental_reservas', columna: 'participantes', definicion: "TEXT NOT NULL DEFAULT '[]'" },
  { tabla: 'rental_reservas', columna: 'adicionales', definicion: "TEXT NOT NULL DEFAULT '[]'" },
];

function existeTabla(nombre: string): boolean {
  return (
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(nombre) !==
    undefined
  );
}

export function migrar(): void {
  db.exec(ESQUEMA);

  for (const { tabla, columna, definicion } of COLUMNAS_NUEVAS) {
    if (!existeTabla(tabla)) continue;
    const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[];
    if (columnas.some((c) => c.name === columna)) continue;
    db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
  }
}
