import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

/** Raiz del repositorio (…/apps/api/src -> …/). */
export const raizRepo = resolve(aqui, '..', '..', '..');

export const config = {
  puerto: Number(process.env.PORT ?? 4000),
  /** Archivo SQLite. En produccion conviene apuntarlo a un volumen persistente. */
  rutaBase: process.env.ECO_DB ?? resolve(raizRepo, 'apps', 'api', 'eco.db'),
  /** Fuente de datos relevada del sitio original. */
  rutaCatalogo: process.env.ECO_CATALOGO ?? resolve(raizRepo, 'data', 'catalog.json'),
  /** Origenes permitidos para el navegador. '*' en desarrollo. */
  origenes: (process.env.ECO_CORS ?? '*').split(',').map((o) => o.trim()),
} as const;
