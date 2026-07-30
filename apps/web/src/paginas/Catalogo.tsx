import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TarjetaProducto } from '@/components/TarjetaProducto.tsx';
import { IconoBuscar, IconoCerrar } from '@/components/Iconos.tsx';
import { catalogo, listarProductos } from '@/lib/api.ts';
import type { FiltrosProducto, Producto } from '@/lib/tipos.ts';

const ORDENES = [
  { valor: 'nombre', texto: 'Nombre (A-Z)' },
  { valor: 'precio-asc', texto: 'Precio: menor a mayor' },
  { valor: 'precio-desc', texto: 'Precio: mayor a menor' },
] as const;

export function Catalogo() {
  const [parametros, setParametros] = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [textoBusqueda, setTextoBusqueda] = useState(parametros.get('q') ?? '');

  const filtros = useMemo<FiltrosProducto>(
    () => ({
      area: parametros.get('area') ?? undefined,
      grupo: parametros.get('grupo') ?? undefined,
      marca: parametros.get('marca') ?? undefined,
      q: parametros.get('q') ?? undefined,
      alquilable: parametros.get('alquilable') === 'true' || undefined,
      orden: (parametros.get('orden') as FiltrosProducto['orden']) ?? 'nombre',
    }),
    [parametros],
  );

  useEffect(() => {
    setTextoBusqueda(parametros.get('q') ?? '');
  }, [parametros]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    listarProductos(filtros)
      .then((resultado) => {
        if (vigente) setProductos(resultado.productos);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtros]);

  const actualizar = (clave: string, valor: string | undefined) => {
    const siguientes = new URLSearchParams(parametros);
    if (valor) siguientes.set(clave, valor);
    else siguientes.delete(clave);
    setParametros(siguientes, { replace: true });
  };

  // Los grupos disponibles dependen del area elegida, para no ofrecer
  // combinaciones que no devuelven nada.
  const gruposVisibles = filtros.area
    ? catalogo.grupos.filter((g) => g.area === filtros.area)
    : catalogo.grupos;

  const hayFiltros = Boolean(
    filtros.area || filtros.grupo || filtros.marca || filtros.q || filtros.alquilable,
  );

  const areaActual = catalogo.areas.find((a) => a.slug === filtros.area);

  const GrupoFiltro = ({
    titulo,
    opciones,
    clave,
    seleccionado,
  }: {
    titulo: string;
    opciones: { slug: string; nombre: string }[];
    clave: string;
    seleccionado: string | undefined;
  }) => (
    <fieldset>
      <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-500">
        {titulo}
      </legend>
      <div className="mt-3 space-y-1">
        {opciones.map((opcion) => {
          const activo = seleccionado === opcion.slug;
          return (
            <button
              key={opcion.slug}
              type="button"
              onClick={() => actualizar(clave, activo ? undefined : opcion.slug)}
              aria-pressed={activo}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activo
                  ? 'bg-pino-600 font-medium text-white'
                  : 'text-tinta-700 hover:bg-nieve-100'
              }`}
            >
              {opcion.nombre}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="contenedor py-10 lg:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">
          {areaActual ? areaActual.nombre : 'Catálogo'}
        </h1>
        <p className="mt-2 text-tinta-500">
          {areaActual?.descripcion ??
            'Equipamiento e indumentaria outdoor para todas las estaciones.'}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-7 lg:sticky lg:top-32 lg:self-start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actualizar('q', textoBusqueda.trim() || undefined);
            }}
          >
            <label className="relative block">
              <span className="sr-only">Buscar en el catálogo</span>
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-500" />
              <input
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                placeholder="Buscar"
                className="w-full rounded-lg border border-nieve-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-pino-300"
              />
            </label>
          </form>

          <GrupoFiltro
            titulo="Actividad"
            clave="area"
            opciones={catalogo.areas}
            seleccionado={filtros.area}
          />

          {gruposVisibles.length > 0 && (
            <GrupoFiltro
              titulo="Categoría"
              clave="grupo"
              opciones={gruposVisibles}
              seleccionado={filtros.grupo}
            />
          )}

          <GrupoFiltro
            titulo="Marca"
            clave="marca"
            opciones={catalogo.marcas}
            seleccionado={filtros.marca}
          />

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-tinta-700">
            <input
              type="checkbox"
              checked={Boolean(filtros.alquilable)}
              onChange={(e) => actualizar('alquilable', e.target.checked ? 'true' : undefined)}
              className="h-4 w-4 rounded border-nieve-200 accent-pino-600"
            />
            Solo productos en alquiler
          </label>

          {hayFiltros && (
            <button
              type="button"
              onClick={() => setParametros(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta-500 hover:text-pino-700"
            >
              <IconoCerrar className="h-4 w-4" />
              Limpiar filtros
            </button>
          )}
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-nieve-200 pb-4">
            <p className="text-sm text-tinta-500" aria-live="polite">
              {cargando
                ? 'Buscando…'
                : `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}`}
            </p>
            <label className="flex items-center gap-2 text-sm text-tinta-500">
              Ordenar por
              <select
                value={filtros.orden}
                onChange={(e) => actualizar('orden', e.target.value)}
                className="rounded-lg border border-nieve-200 bg-white px-3 py-2 text-sm text-tinta-900 outline-none focus:border-pino-300"
              >
                {ORDENES.map((orden) => (
                  <option key={orden.valor} value={orden.valor}>
                    {orden.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {cargando ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tarjeta h-72 animate-pulse bg-nieve-100" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="tarjeta px-6 py-16 text-center">
              <p className="text-lg font-medium">No encontramos productos con esos filtros.</p>
              <p className="mt-2 text-sm text-tinta-500">
                Probá quitando alguno o escribinos y lo buscamos por vos.
              </p>
              <button
                type="button"
                onClick={() => setParametros(new URLSearchParams(), { replace: true })}
                className="mt-6 rounded-full bg-pino-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-pino-700"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((producto) => (
                <TarjetaProducto key={producto.slug} producto={producto} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
