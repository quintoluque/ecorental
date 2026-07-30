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
  url_original      TEXT,
  activo            INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_productos_area  ON productos(area_slug);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos(marca_slug);
CREATE INDEX IF NOT EXISTS idx_productos_grupo ON productos(grupo_slug);

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

CREATE TABLE IF NOT EXISTS rental_categorias (
  slug           TEXT PRIMARY KEY,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  incluye        TEXT NOT NULL DEFAULT '[]',
  tarifa_por_dia REAL,
  moneda         TEXT NOT NULL DEFAULT 'ARS'
);

-- Parque de equipos de alquiler: cuantas unidades tiene cada sucursal.
CREATE TABLE IF NOT EXISTS rental_inventario (
  categoria_slug TEXT NOT NULL REFERENCES rental_categorias(slug) ON DELETE CASCADE,
  sucursal_slug  TEXT NOT NULL REFERENCES sucursales(slug) ON DELETE CASCADE,
  unidades       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (categoria_slug, sucursal_slug)
);

CREATE TABLE IF NOT EXISTS rental_reservas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT NOT NULL UNIQUE,
  categoria_slug TEXT NOT NULL REFERENCES rental_categorias(slug),
  sucursal_slug  TEXT NOT NULL REFERENCES sucursales(slug),
  desde          TEXT NOT NULL,
  hasta          TEXT NOT NULL,
  unidades       INTEGER NOT NULL DEFAULT 1,
  cliente        TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'pendiente',
  total          REAL,
  creado         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- La consulta caliente del negocio: reservas que se solapan con un rango.
CREATE INDEX IF NOT EXISTS idx_reservas_rango
  ON rental_reservas(sucursal_slug, categoria_slug, desde, hasta);

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

export function migrar(): void {
  db.exec(ESQUEMA);
}
