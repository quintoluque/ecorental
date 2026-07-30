import { catalogo } from './api.ts';

/**
 * Fotos del sitio, detectadas automaticamente en tiempo de compilacion.
 *
 * Cualquier archivo que se copie en src/fotos/ entra solo: no hay que
 * registrarlo en ningun lado. Vite lo empaqueta, le pone un hash y devuelve la
 * URL final, asi que tambien funciona publicado en un subdirectorio.
 */
// El patron de import.meta.glob tiene que ser un literal: Vite lo resuelve al
// compilar, asi que no admite variables ni plantillas.
const archivosProductos = import.meta.glob('../fotos/productos/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const archivosActividades = import.meta.glob('../fotos/actividades/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const archivosSucursales = import.meta.glob('../fotos/sucursales/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** 'rossignol-ski-black-ops-2.jpg' -> 2 · 'rossignol-ski-black-ops.jpg' -> 0 */
function indiceDeFoto(nombre: string): number {
  const base = nombre.slice(0, nombre.lastIndexOf('.'));
  const coincidencia = base.match(/-(\d+)$/);
  return coincidencia ? Number(coincidencia[1]) : 0;
}

/**
 * Deduce a que slug pertenece un archivo. Primero prueba el nombre completo y
 * solo despues interpreta el "-2" final como numero de foto: sin ese orden un
 * producto que termina en numero (…-polar-200) se confundiria con la segunda
 * foto de otro.
 */
function slugDeArchivo(nombre: string, conocidos: Set<string>): string {
  const base = nombre.slice(0, nombre.lastIndexOf('.')).toLowerCase();
  if (conocidos.has(base)) return base;

  const sinIndice = base.replace(/-\d+$/, '');
  return conocidos.has(sinIndice) ? sinIndice : base;
}

function agrupar(
  archivos: Record<string, string>,
  slugsConocidos: string[],
): Map<string, string[]> {
  const conocidos = new Set(slugsConocidos);
  const mapa = new Map<string, { orden: number; url: string }[]>();

  for (const [ruta, url] of Object.entries(archivos)) {
    const nombre = ruta.slice(ruta.lastIndexOf('/') + 1);
    const slug = slugDeArchivo(nombre, conocidos);
    if (!mapa.has(slug)) mapa.set(slug, []);
    mapa.get(slug)!.push({ orden: indiceDeFoto(nombre), url });
  }

  // La foto sin numero queda de portada; despues -2, -3, etc.
  return new Map(
    [...mapa].map(([slug, fotos]) => [
      slug,
      fotos.sort((a, b) => a.orden - b.orden).map((f) => f.url),
    ]),
  );
}

const fotosProductos = agrupar(
  archivosProductos,
  catalogo.productos.map((p) => p.slug),
);
const fotosActividades = agrupar(
  archivosActividades,
  catalogo.areas.map((a) => a.slug),
);
const fotosSucursales = agrupar(
  archivosSucursales,
  catalogo.sucursales.map((s) => s.slug),
);

/** Fotos de un producto: las de src/fotos/ y, si no hay, las del catalogo. */
export function fotosDeProducto(slug: string, delCatalogo: string[] = []): string[] {
  return fotosProductos.get(slug) ?? delCatalogo;
}

export function fotoDeActividad(slug: string, delCatalogo: string | null = null): string | null {
  return fotosActividades.get(slug)?.[0] ?? delCatalogo;
}

export function fotoDeSucursal(slug: string, delCatalogo: string | null = null): string | null {
  return fotosSucursales.get(slug)?.[0] ?? delCatalogo;
}

/** Cuantas fotos hay cargadas en total. Se usa en el aviso para el equipo. */
export const totalFotosCargadas =
  Object.keys(archivosProductos).length +
  Object.keys(archivosActividades).length +
  Object.keys(archivosSucursales).length;
