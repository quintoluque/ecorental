import catalogoJson from '@datos/catalog.json';
import type {
  Catalogo,
  CategoriaRental,
  Disponibilidad,
  FiltrosProducto,
  Producto,
} from './tipos.ts';

export const catalogo = catalogoJson as unknown as Catalogo;

/**
 * La app funciona de dos maneras con el mismo codigo:
 *  - con VITE_API_URL definida habla con el backend real (stock y reservas vivas);
 *  - sin ella resuelve todo contra data/catalog.json, para que la version
 *    publicada en GitHub Pages sea navegable sin levantar un servidor.
 */
const BASE_API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export const hayBackend = BASE_API.length > 0;

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${BASE_API}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw Object.assign(new Error((cuerpo as { error?: string }).error ?? 'Error de red'), {
      cuerpo,
      status: respuesta.status,
    });
  }
  return cuerpo as T;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function filtrarLocal(filtros: FiltrosProducto): Producto[] {
  let productos = catalogo.productos.slice();

  if (filtros.area) productos = productos.filter((p) => p.area === filtros.area);
  if (filtros.grupo) productos = productos.filter((p) => p.grupo === filtros.grupo);
  if (filtros.marca) productos = productos.filter((p) => p.marca === filtros.marca);
  if (filtros.alquilable) productos = productos.filter((p) => p.alquilable);

  if (filtros.q) {
    const termino = normalizar(filtros.q);
    productos = productos.filter((p) =>
      normalizar(`${p.nombre} ${p.descripcion ?? ''} ${p.marca ?? ''}`).includes(termino),
    );
  }

  const sinPrecioAlFinal = (a: Producto, b: Producto, signo: number) => {
    if (a.precio == null && b.precio == null) return a.nombre.localeCompare(b.nombre);
    if (a.precio == null) return 1;
    if (b.precio == null) return -1;
    return (a.precio - b.precio) * signo;
  };

  if (filtros.orden === 'precio-asc') productos.sort((a, b) => sinPrecioAlFinal(a, b, 1));
  else if (filtros.orden === 'precio-desc') productos.sort((a, b) => sinPrecioAlFinal(a, b, -1));
  else productos.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return productos;
}

export async function listarProductos(filtros: FiltrosProducto = {}): Promise<{
  total: number;
  productos: Producto[];
}> {
  if (!hayBackend) {
    const productos = filtrarLocal(filtros);
    return { total: productos.length, productos };
  }

  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '' && valor !== false) parametros.set(clave, String(valor));
  }

  const respuesta = await pedir<{ total: number; productos: (Producto & { marca: unknown })[] }>(
    `/api/productos?${parametros.toString()}`,
  );

  // El backend devuelve las relaciones anidadas; el frontend trabaja con slugs.
  const productos = respuesta.productos.map((p) => ({
    ...p,
    marca: (p.marca as { slug: string } | null)?.slug ?? null,
    area: (p.area as unknown as { slug: string } | null)?.slug ?? null,
    grupo: (p.grupo as unknown as { slug: string } | null)?.slug ?? null,
  })) as Producto[];

  return { total: respuesta.total, productos };
}

export async function obtenerProducto(slug: string): Promise<Producto | undefined> {
  if (!hayBackend) return catalogo.productos.find((p) => p.slug === slug);

  try {
    const p = await pedir<Producto & { marca: unknown; area: unknown; grupo: unknown }>(
      `/api/productos/${slug}`,
    );
    return {
      ...p,
      marca: (p.marca as { slug: string } | null)?.slug ?? null,
      area: (p.area as { slug: string } | null)?.slug ?? null,
      grupo: (p.grupo as { slug: string } | null)?.slug ?? null,
    } as Producto;
  } catch {
    return undefined;
  }
}

export async function listarCategoriasRental(): Promise<CategoriaRental[]> {
  if (!hayBackend) return catalogo.rental.categorias;
  return pedir<CategoriaRental[]>('/api/rental/categorias');
}

export async function consultarDisponibilidad(consulta: {
  categoria: string;
  sucursal: string;
  desde: string;
  hasta: string;
}): Promise<Disponibilidad> {
  const dias = Math.round(
    (Date.parse(`${consulta.hasta}T00:00:00Z`) - Date.parse(`${consulta.desde}T00:00:00Z`)) /
      86_400_000,
  ) + 1;

  if (!hayBackend) {
    const categoria = catalogo.rental.categorias.find((c) => c.slug === consulta.categoria);
    // Sin backend no hay parque de equipos cargado: se informa el rango y la
    // tarifa publicada, y la confirmacion queda a cargo de la sucursal.
    return {
      ...consulta,
      unidadesTotales: 0,
      unidadesDisponibles: 0,
      dias,
      disponible: false,
      tarifaPorDia: categoria?.tarifaPorDia ?? null,
      moneda: categoria?.moneda ?? 'ARS',
      totalEstimado: categoria?.tarifaPorDia != null ? categoria.tarifaPorDia * dias : null,
    };
  }

  const parametros = new URLSearchParams(consulta as unknown as Record<string, string>);
  return pedir<Disponibilidad>(`/api/rental/disponibilidad?${parametros.toString()}`);
}

export type DatosCliente = {
  nombre: string;
  email: string;
  telefono: string;
  comentario?: string;
};

function codigoSimulado(prefijo: string): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cuerpo = '';
  for (let i = 0; i < 6; i++) cuerpo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `${prefijo}-${cuerpo}`;
}

export async function crearReserva(datos: {
  categoria: string;
  sucursal: string;
  desde: string;
  hasta: string;
  unidades: number;
  cliente: DatosCliente;
}): Promise<{ codigo: string; enviadoAlServidor: boolean }> {
  if (!hayBackend) return { codigo: codigoSimulado('R'), enviadoAlServidor: false };
  const r = await pedir<{ codigo: string }>('/api/rental/reservas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return { codigo: r.codigo, enviadoAlServidor: true };
}

export async function crearPedido(datos: {
  cliente: { nombre: string; email: string; telefono: string };
  items: { productoId: number; talle: string; cantidad: number }[];
  entrega: 'retiro' | 'envio';
  sucursal?: string;
  direccionEnvio?: string;
}): Promise<{ codigo: string; enviadoAlServidor: boolean }> {
  if (!hayBackend) return { codigo: codigoSimulado('P'), enviadoAlServidor: false };
  const r = await pedir<{ codigo: string }>('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  return { codigo: r.codigo, enviadoAlServidor: true };
}

export async function enviarConsulta(datos: {
  nombre: string;
  email: string;
  telefono?: string;
  asunto?: string;
  mensaje: string;
}): Promise<{ enviadoAlServidor: boolean }> {
  if (!hayBackend) return { enviadoAlServidor: false };
  await pedir('/api/contacto', { method: 'POST', body: JSON.stringify(datos) });
  return { enviadoAlServidor: true };
}
