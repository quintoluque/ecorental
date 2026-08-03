import { useMemo, useState } from 'react';
import { IconoBuscar, IconoCerrar } from '@/components/Iconos.tsx';
import { catalogo, filtrarEnCatalogo } from '@/lib/api.ts';
import { precio as formatearPrecio } from '@/lib/formato.ts';
import type { FiltrosProducto, OpcionTaxonomia } from '@/lib/tipos.ts';

/** Rubros multiples del catalogo: cada uno es una clave de FiltrosProducto. */
type ClaveLista = 'deporte' | 'tipo' | 'grupo' | 'marca' | 'publico' | 'temporada';

type Cambios = Record<string, string | undefined>;

type Props = {
  filtros: FiltrosProducto;
  alCambiarLista: (clave: ClaveLista, valores: string[]) => void;
  /** Varias claves de una: cambiarlas por separado pisaría la anterior. */
  alCambiarValores: (cambios: Cambios) => void;
  alLimpiar: () => void;
};

const CLASE_CAMPO =
  'w-full rounded-lg border border-nieve-200 bg-white px-3 py-2 text-sm outline-none focus:border-marca-300';

const TITULO_GRUPO =
  'text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500';

/**
 * Cuenta cuantos productos daria cada opcion de un rubro **sin** contar el
 * propio rubro: asi los numeros no se vuelven cero al tildar una opcion y se
 * puede seguir sumando otra del mismo grupo.
 */
function useConteos(filtros: FiltrosProducto, clave: ClaveLista): Map<string, number> {
  return useMemo(() => {
    const base: FiltrosProducto = { ...filtros };
    delete base[clave];

    const cuenta = new Map<string, number>();
    for (const producto of filtrarEnCatalogo(base)) {
      const valores = clave === 'deporte' ? producto.deportes : [producto[clave]];
      for (const valor of valores) {
        if (valor) cuenta.set(valor, (cuenta.get(valor) ?? 0) + 1);
      }
    }
    return cuenta;
  }, [filtros, clave]);
}

function Faceta({
  titulo,
  clave,
  opciones,
  seleccionados,
  filtros,
  alCambiar,
  maximoVisible = 8,
}: {
  titulo: string;
  clave: ClaveLista;
  opciones: { slug: string; nombre: string }[];
  seleccionados: string[];
  filtros: FiltrosProducto;
  alCambiar: (clave: ClaveLista, valores: string[]) => void;
  maximoVisible?: number;
}) {
  const [expandida, setExpandida] = useState(false);
  const conteos = useConteos(filtros, clave);

  // Las opciones que hoy no dan resultados se muestran igual si estan tildadas,
  // para que se puedan destildar; el resto se esconde.
  const visibles = opciones.filter((o) => (conteos.get(o.slug) ?? 0) > 0 || seleccionados.includes(o.slug));
  if (visibles.length === 0) return null;

  const ordenadas = [...visibles].sort(
    (a, b) => (conteos.get(b.slug) ?? 0) - (conteos.get(a.slug) ?? 0),
  );
  const mostradas = expandida ? ordenadas : ordenadas.slice(0, maximoVisible);

  const alternar = (slug: string) => {
    const siguiente = seleccionados.includes(slug)
      ? seleccionados.filter((s) => s !== slug)
      : [...seleccionados, slug];
    alCambiar(clave, siguiente);
  };

  return (
    <fieldset>
      <legend className={TITULO_GRUPO}>{titulo}</legend>
      <div className="mt-3 space-y-0.5">
        {mostradas.map((opcion) => {
          const activo = seleccionados.includes(opcion.slug);
          return (
            <label
              key={opcion.slug}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                activo ? 'bg-nieve-100 font-medium text-carbon-900' : 'text-carbon-700 hover:bg-nieve-100'
              }`}
            >
              <input
                type="checkbox"
                checked={activo}
                onChange={() => alternar(opcion.slug)}
                className="h-4 w-4 shrink-0 rounded border-nieve-200 accent-marca-600"
              />
              <span className="flex-1">{opcion.nombre}</span>
              <span className="text-xs tabular-nums text-carbon-300">
                {conteos.get(opcion.slug) ?? 0}
              </span>
            </label>
          );
        })}
      </div>

      {ordenadas.length > maximoVisible && (
        <button
          type="button"
          onClick={() => setExpandida(!expandida)}
          className="mt-2 px-2 text-xs font-medium text-marca-700 hover:text-marca-600"
        >
          {expandida ? 'Ver menos' : `Ver las ${ordenadas.length}`}
        </button>
      )}
    </fieldset>
  );
}

/** Rango de precios publicados en el catalogo, para acotar el filtro. */
function useRangoPrecios() {
  return useMemo(() => {
    const precios = catalogo.productos
      .map((p) => p.precio)
      .filter((p): p is number => p != null);
    if (precios.length === 0) return null;
    return { min: Math.min(...precios), max: Math.max(...precios), total: precios.length };
  }, []);
}

function FiltroPrecio({
  filtros,
  alCambiarValores,
}: {
  filtros: FiltrosProducto;
  alCambiarValores: (cambios: Cambios) => void;
}) {
  const rango = useRangoPrecios();

  const [desde, setDesde] = useState(filtros.precioMin?.toString() ?? '');
  const [hasta, setHasta] = useState(filtros.precioMax?.toString() ?? '');

  const aplicar = (evento: React.FormEvent) => {
    evento.preventDefault();
    alCambiarValores({
      precioMin: desde.trim() || undefined,
      precioMax: hasta.trim() || undefined,
    });
  };

  if (!rango) {
    return (
      <div>
        <p className={TITULO_GRUPO}>Precio</p>
        <p className="mt-3 rounded-lg bg-nieve-100 px-3 py-2.5 text-xs leading-relaxed text-carbon-500">
          Todavía no hay precios publicados: el catálogo los muestra como{' '}
          <strong className="font-medium text-carbon-700">Consultar</strong>. En cuanto se importen,
          este filtro se activa solo.
        </p>
      </div>
    );
  }

  // Tres tramos parejos sobre el rango real, redondeados para que se lean bien.
  const paso = Math.max(1, Math.round((rango.max - rango.min) / 3 / 1000) * 1000);
  const cortes = [rango.min + paso, rango.min + paso * 2];

  return (
    <form onSubmit={aplicar}>
      <p className={TITULO_GRUPO}>Precio</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[
          { texto: `Hasta ${formatearPrecio(cortes[0])}`, min: undefined, max: cortes[0] },
          { texto: `${formatearPrecio(cortes[0])} a ${formatearPrecio(cortes[1])}`, min: cortes[0], max: cortes[1] },
          { texto: `Más de ${formatearPrecio(cortes[1])}`, min: cortes[1], max: undefined },
        ].map((tramo) => {
          const activo = filtros.precioMin === tramo.min && filtros.precioMax === tramo.max;
          return (
            <button
              key={tramo.texto}
              type="button"
              onClick={() => {
                setDesde(tramo.min?.toString() ?? '');
                setHasta(tramo.max?.toString() ?? '');
                alCambiarValores({
                  precioMin: tramo.min?.toString(),
                  precioMax: tramo.max?.toString(),
                });
              }}
              aria-pressed={activo}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                activo
                  ? 'border-carbon-900 bg-carbon-900 text-white'
                  : 'border-nieve-200 text-carbon-700 hover:border-marca-300'
              }`}
            >
              {tramo.texto}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">Precio mínimo</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            placeholder={String(Math.floor(rango.min))}
            className={CLASE_CAMPO}
          />
        </label>
        <span className="text-sm text-carbon-300" aria-hidden="true">
          –
        </span>
        <label className="flex-1">
          <span className="sr-only">Precio máximo</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            placeholder={String(Math.ceil(rango.max))}
            className={CLASE_CAMPO}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-carbon-900 px-3 py-2 text-xs font-semibold text-white hover:bg-carbon-700"
        >
          Ir
        </button>
      </div>

      {rango.total < catalogo.productos.length && (
        <p className="mt-2 text-xs leading-snug text-carbon-500">
          {catalogo.productos.length - rango.total} artículos tienen el precio a consultar y quedan
          fuera del rango.
        </p>
      )}
    </form>
  );
}

export function BarraFiltros({ filtros, alCambiarLista, alCambiarValores, alLimpiar }: Props) {
  const { taxonomia, grupos, marcas } = catalogo;
  const [textoBusqueda, setTextoBusqueda] = useState(filtros.q ?? '');

  // Las familias se acotan al área elegida: no tiene sentido ofrecer "Carpas"
  // cuando se está mirando Invierno.
  const gruposVisibles = filtros.area ? grupos.filter((g) => g.area === filtros.area) : grupos;

  const hayFiltros = Boolean(
    filtros.area ||
      filtros.q ||
      filtros.alquilable ||
      filtros.precioMin != null ||
      filtros.precioMax != null ||
      filtros.grupo?.length ||
      filtros.marca?.length ||
      filtros.deporte?.length ||
      filtros.tipo?.length ||
      filtros.publico?.length ||
      filtros.temporada?.length,
  );

  const facetas: {
    titulo: string;
    clave: ClaveLista;
    opciones: OpcionTaxonomia[] | { slug: string; nombre: string }[];
    seleccionados: string[];
  }[] = [
    {
      titulo: 'Deporte',
      clave: 'deporte',
      opciones: taxonomia.deportes,
      seleccionados: filtros.deporte ?? [],
    },
    {
      titulo: 'Tipo de artículo',
      clave: 'tipo',
      opciones: taxonomia.tipos,
      seleccionados: filtros.tipo ?? [],
    },
    {
      titulo: 'Familia',
      clave: 'grupo',
      opciones: gruposVisibles,
      seleccionados: filtros.grupo ?? [],
    },
    { titulo: 'Marca', clave: 'marca', opciones: marcas, seleccionados: filtros.marca ?? [] },
    {
      titulo: 'Público',
      clave: 'publico',
      opciones: taxonomia.publicos,
      seleccionados: filtros.publico ?? [],
    },
    {
      titulo: 'Temporada',
      clave: 'temporada',
      opciones: taxonomia.temporadas,
      seleccionados: filtros.temporada ?? [],
    },
  ];

  return (
    <div className="space-y-7">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alCambiarValores({ q: textoBusqueda.trim() || undefined });
        }}
      >
        <label className="relative block">
          <span className="sr-only">Buscar en el catálogo</span>
          <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-500" />
          <input
            value={textoBusqueda}
            onChange={(e) => setTextoBusqueda(e.target.value)}
            placeholder="Buscar"
            className="w-full rounded-lg border border-nieve-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-marca-300"
          />
        </label>
      </form>

      <FiltroPrecio filtros={filtros} alCambiarValores={alCambiarValores} />

      {facetas.map((faceta) => (
        <Faceta
          key={faceta.clave}
          titulo={faceta.titulo}
          clave={faceta.clave}
          opciones={faceta.opciones}
          seleccionados={faceta.seleccionados}
          filtros={filtros}
          alCambiar={alCambiarLista}
        />
      ))}

      <label className="flex cursor-pointer items-center gap-2.5 border-t border-nieve-200 pt-6 text-sm text-carbon-700">
        <input
          type="checkbox"
          checked={Boolean(filtros.alquilable)}
          onChange={(e) =>
            alCambiarValores({ alquilable: e.target.checked ? 'true' : undefined })
          }
          className="h-4 w-4 rounded border-nieve-200 accent-marca-600"
        />
        Solo artículos que se alquilan
      </label>

      {hayFiltros && (
        <button
          type="button"
          onClick={alLimpiar}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-carbon-500 hover:text-marca-700"
        >
          <IconoCerrar className="h-4 w-4" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
