import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarraFiltros } from '@/components/BarraFiltros.tsx';
import { TarjetaProducto } from '@/components/TarjetaProducto.tsx';
import { IconoCerrar, IconoFiltros } from '@/components/Iconos.tsx';
import { catalogo, listarProductos } from '@/lib/api.ts';
import { precio as formatearPrecio } from '@/lib/formato.ts';
import type { FiltrosProducto, Producto } from '@/lib/tipos.ts';

const ORDENES = [
  { valor: 'nombre', texto: 'Nombre (A-Z)' },
  { valor: 'precio-asc', texto: 'Precio: menor a mayor' },
  { valor: 'precio-desc', texto: 'Precio: mayor a menor' },
] as const;

/** Los rubros multiples viajan en la URL como lista separada por coma. */
const CLAVES_LISTA = ['grupo', 'marca', 'deporte', 'tipo', 'publico', 'temporada'] as const;

function leerLista(parametros: URLSearchParams, clave: string): string[] | undefined {
  const crudo = parametros.get(clave);
  if (!crudo) return undefined;
  const valores = crudo.split(',').filter(Boolean);
  return valores.length ? valores : undefined;
}

function leerNumero(parametros: URLSearchParams, clave: string): number | undefined {
  const crudo = parametros.get(clave);
  if (!crudo) return undefined;
  const numero = Number(crudo);
  return Number.isFinite(numero) ? numero : undefined;
}

export function Catalogo() {
  const [parametros, setParametros] = useSearchParams();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const filtros = useMemo<FiltrosProducto>(
    () => ({
      area: parametros.get('area') ?? undefined,
      grupo: leerLista(parametros, 'grupo'),
      marca: leerLista(parametros, 'marca'),
      deporte: leerLista(parametros, 'deporte'),
      tipo: leerLista(parametros, 'tipo'),
      publico: leerLista(parametros, 'publico'),
      temporada: leerLista(parametros, 'temporada'),
      q: parametros.get('q') ?? undefined,
      alquilable: parametros.get('alquilable') === 'true' || undefined,
      precioMin: leerNumero(parametros, 'precioMin'),
      precioMax: leerNumero(parametros, 'precioMax'),
      orden: (parametros.get('orden') as FiltrosProducto['orden']) ?? 'nombre',
    }),
    [parametros],
  );

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

  const actualizar = (cambios: Record<string, string | undefined>) => {
    const siguientes = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) siguientes.set(clave, valor);
      else siguientes.delete(clave);
    }
    setParametros(siguientes, { replace: true });
  };

  const actualizarLista = (clave: string, valores: string[]) =>
    actualizar({ [clave]: valores.length ? valores.join(',') : undefined });

  const limpiar = () => setParametros(new URLSearchParams(), { replace: true });

  const areaActual = catalogo.areas.find((a) => a.slug === filtros.area);

  // Etiquetas de los filtros activos, para poder sacarlos de a uno.
  const nombresPorRubro: Record<string, Map<string, string>> = {
    grupo: new Map(catalogo.grupos.map((g) => [g.slug, g.nombre])),
    marca: new Map(catalogo.marcas.map((m) => [m.slug, m.nombre])),
    deporte: new Map(catalogo.taxonomia.deportes.map((d) => [d.slug, d.nombre])),
    tipo: new Map(catalogo.taxonomia.tipos.map((t) => [t.slug, t.nombre])),
    publico: new Map(catalogo.taxonomia.publicos.map((p) => [p.slug, p.nombre])),
    temporada: new Map(catalogo.taxonomia.temporadas.map((t) => [t.slug, t.nombre])),
  };

  const chips: { texto: string; quitar: () => void }[] = [];

  if (areaActual) {
    chips.push({ texto: areaActual.nombre, quitar: () => actualizar({ area: undefined }) });
  }
  for (const clave of CLAVES_LISTA) {
    for (const valor of filtros[clave] ?? []) {
      chips.push({
        texto: nombresPorRubro[clave].get(valor) ?? valor,
        quitar: () => actualizarLista(clave, (filtros[clave] ?? []).filter((v) => v !== valor)),
      });
    }
  }
  if (filtros.alquilable) {
    chips.push({ texto: 'En alquiler', quitar: () => actualizar({ alquilable: undefined }) });
  }
  if (filtros.precioMin != null || filtros.precioMax != null) {
    const desde = filtros.precioMin != null ? formatearPrecio(filtros.precioMin) : null;
    const hasta = filtros.precioMax != null ? formatearPrecio(filtros.precioMax) : null;
    chips.push({
      texto: desde && hasta ? `${desde} – ${hasta}` : desde ? `Desde ${desde}` : `Hasta ${hasta}`,
      quitar: () => actualizar({ precioMin: undefined, precioMax: undefined }),
    });
  }
  if (filtros.q) {
    chips.push({ texto: `“${filtros.q}”`, quitar: () => actualizar({ q: undefined }) });
  }

  return (
    <div className="contenedor py-10 lg:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">
          {areaActual ? areaActual.nombre : 'Catálogo'}
        </h1>
        <p className="mt-2 text-carbon-500">
          {areaActual?.descripcion ??
            'Equipamiento e indumentaria outdoor para todas las estaciones. Filtrá por deporte, tipo de artículo, marca o precio.'}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[250px_1fr]">
        {/* En celular la barra se abre y se cierra; en escritorio queda fija. */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            aria-expanded={filtrosAbiertos}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-nieve-200 bg-white px-5 py-3 text-sm font-semibold"
          >
            <IconoFiltros className="h-4 w-4" />
            {filtrosAbiertos ? 'Ocultar filtros' : 'Filtrar y ordenar'}
            {chips.length > 0 && (
              <span className="rounded-full bg-marca-500 px-2 py-0.5 text-xs text-carbon-900">
                {chips.length}
              </span>
            )}
          </button>
        </div>

        <aside
          className={`${
            filtrosAbiertos ? 'block' : 'hidden'
          } lg:sticky lg:top-32 lg:block lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:pr-2`}
        >
          <BarraFiltros
            filtros={filtros}
            alCambiarLista={actualizarLista}
            alCambiarValores={actualizar}
            alLimpiar={limpiar}
          />
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-nieve-200 pb-4">
            <p className="text-sm text-carbon-500" aria-live="polite">
              {cargando
                ? 'Buscando…'
                : `${productos.length} ${productos.length === 1 ? 'artículo' : 'artículos'}`}
            </p>
            <label className="flex items-center gap-2 text-sm text-carbon-500">
              Ordenar por
              <select
                value={filtros.orden}
                onChange={(e) => actualizar({ orden: e.target.value })}
                className="rounded-lg border border-nieve-200 bg-white px-3 py-2 text-sm text-carbon-900 outline-none focus:border-marca-300"
              >
                {ORDENES.map((orden) => (
                  <option key={orden.valor} value={orden.valor}>
                    {orden.texto}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((chip, i) => (
                <button
                  key={`${chip.texto}-${i}`}
                  type="button"
                  onClick={chip.quitar}
                  className="inline-flex items-center gap-1.5 rounded-full bg-carbon-900 py-1 pl-3 pr-2 text-xs font-medium text-white transition-colors hover:bg-carbon-700"
                >
                  {chip.texto}
                  <IconoCerrar className="h-3.5 w-3.5" />
                  <span className="sr-only">Quitar filtro</span>
                </button>
              ))}
              <button
                type="button"
                onClick={limpiar}
                className="text-xs font-medium text-carbon-500 underline underline-offset-2 hover:text-marca-700"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {cargando ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tarjeta h-72 animate-pulse bg-nieve-100" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="tarjeta px-6 py-16 text-center">
              <p className="text-lg font-medium">No encontramos artículos con esos filtros.</p>
              <p className="mt-2 text-sm text-carbon-500">
                Probá quitando alguno o escribinos y lo buscamos por vos.
              </p>
              <button
                type="button"
                onClick={limpiar}
                className="mt-6 rounded-full bg-carbon-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-carbon-700"
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
