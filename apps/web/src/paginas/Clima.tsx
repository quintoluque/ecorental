import { Link } from 'react-router-dom';
import { IconoFlecha, IconoUbicacion } from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function Clima() {
  const { clima, sucursales } = catalogo;

  return (
    <div className="contenedor py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">{clima.titulo}</h1>
        <p className="mt-3 leading-relaxed text-carbon-500">{clima.descripcion}</p>
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {clima.centros.map((centro) => {
          const sucursal = sucursales.find((s) => s.slug === centro.sucursal);

          return (
            <article
              key={centro.nombre}
              className="relative overflow-hidden rounded-xl2 bg-linear-to-br from-hielo-700 to-carbon-900 p-6 text-white"
            >
              <div className="cordillera absolute inset-x-0 bottom-0 h-20" aria-hidden="true" />
              <div className="relative">
                <h2 className="text-xl font-semibold">{centro.nombre}</h2>
                <p className="mt-1 text-sm text-white/75">{centro.provincia}</p>

                {sucursal && (
                  <p className="mt-6 flex items-start gap-2 text-sm text-white/85">
                    <IconoUbicacion className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {sucursal.nombre}
                      <span className="block text-white/65">{sucursal.ciudad}</span>
                    </span>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 tarjeta p-6 lg:p-8">
        <h2 className="text-lg font-semibold">Parte de nieve en vivo</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-carbon-700">
          El pronóstico y el parte de nieve de cada centro se conectan desde el panel de
          administración a un proveedor meteorológico. Mientras tanto, escribinos y te contamos cómo
          está la montaña: en cada uno de estos centros tenemos gente nuestra.
        </p>
        <Link
          to="/rental"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:text-marca-600"
        >
          Reservar equipo para tu salida <IconoFlecha className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
