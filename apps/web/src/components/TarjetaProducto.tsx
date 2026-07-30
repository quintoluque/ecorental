import { Link } from 'react-router-dom';
import { ProductoImagen } from './ProductoImagen.tsx';
import { catalogo } from '@/lib/api.ts';
import { precio as formatearPrecio } from '@/lib/formato.ts';
import type { Producto } from '@/lib/tipos.ts';

function nombreDeMarca(slug: string | null): string | null {
  if (!slug) return null;
  return catalogo.marcas.find((m) => m.slug === slug)?.nombre ?? slug;
}

export function TarjetaProducto({ producto }: { producto: Producto }) {
  const marca = nombreDeMarca(producto.marca);
  const grupo = catalogo.grupos.find((g) => g.slug === producto.grupo)?.nombre;

  return (
    <Link
      to={`/producto/${producto.slug}`}
      className="tarjeta group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-pino-300 hover:shadow-lg hover:shadow-pino-900/5"
    >
      <div className="relative">
        <ProductoImagen
          nombre={producto.nombre}
          marca={marca}
          className="aspect-[4/3] w-full"
        />
        {producto.alquilable && (
          <span className="absolute left-3 top-3 rounded-full bg-ambar-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-tinta-900">
            También en alquiler
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {marca && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pino-600">
            {marca}
          </span>
        )}
        <h3 className="text-[15px] font-medium leading-snug text-tinta-900 group-hover:text-pino-700">
          {producto.nombre}
        </h3>
        {grupo && <p className="text-xs text-tinta-500">{grupo}</p>}

        <div className="mt-auto pt-3">
          <span
            className={
              producto.precio == null
                ? 'text-sm font-medium text-tinta-500'
                : 'text-lg font-semibold text-tinta-900'
            }
          >
            {formatearPrecio(producto.precio)}
          </span>
        </div>
      </div>
    </Link>
  );
}
