import { Link } from 'react-router-dom';
import { IconoFlecha } from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function Nosotros() {
  const { empresa, actividades, servicios, sucursales, marcas } = catalogo;
  const anios = new Date().getFullYear() - empresa.desde;

  return (
    <>
      <section className="relative overflow-hidden bg-carbon-900 text-white">
        <div className="cordillera absolute inset-x-0 bottom-0 h-28" aria-hidden="true" />
        <div className="contenedor relative py-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marca-300">
            Quiénes somos
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight lg:text-5xl">
            {anios} años equipando gente que sale a la montaña.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-nieve-100/85">
            {empresa.descripcion}
          </p>
        </div>
      </section>

      <div className="contenedor py-14 lg:py-16">
        <dl className="grid gap-6 border-b border-nieve-200 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { valor: String(empresa.desde), etiqueta: 'Año de fundación' },
            { valor: String(sucursales.length), etiqueta: 'Sucursales en el país' },
            { valor: String(actividades.length), etiqueta: 'Actividades cubiertas' },
            { valor: String(marcas.length), etiqueta: 'Marcas publicadas' },
          ].map((dato) => (
            <div key={dato.etiqueta}>
              <dt className="sr-only">{dato.etiqueta}</dt>
              <dd>
                <span className="block text-4xl font-bold text-marca-700">{dato.valor}</span>
                <span className="mt-1 block text-sm text-carbon-500">{dato.etiqueta}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl font-bold">En qué somos especialistas</h2>
            <p className="mt-3 leading-relaxed text-carbon-700">
              {empresa.tagline}. Trabajamos todas las disciplinas de montaña y agua, con stock,
              asesoramiento y servicio post-venta.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {actividades.map((actividad) => (
                <span
                  key={actividad}
                  className="rounded-full border border-nieve-200 bg-white px-4 py-2 text-sm font-medium text-carbon-700"
                >
                  {actividad}
                </span>
              ))}
            </div>

            <h2 className="mt-12 text-2xl font-bold">Nuestros servicios</h2>
            <div className="mt-6 space-y-4">
              {servicios.map((servicio) => (
                <div key={servicio.slug} className="tarjeta p-6">
                  <h3 className="text-lg font-semibold">{servicio.nombre}</h3>
                  <p className="mt-2 leading-relaxed text-carbon-700">{servicio.detalle}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <div className="tarjeta p-6">
              <h2 className="text-base font-semibold">Dónde encontrarnos</h2>
              <ul className="mt-4 space-y-2 text-sm text-carbon-700">
                {sucursales.map((sucursal) => (
                  <li key={sucursal.slug}>
                    {sucursal.ciudad}
                    <span className="text-carbon-500"> · {sucursal.provincia}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/sucursales"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-700 hover:text-marca-600"
              >
                Ver sucursales <IconoFlecha className="h-4 w-4" />
              </Link>
            </div>

            <div className="tarjeta bg-marca-50 p-6">
              <h2 className="text-base font-semibold">Seguinos</h2>
              <p className="mt-2 text-sm text-carbon-700">
                Novedades, llegadas de temporada y estado de la nieve.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <a
                  href={empresa.redes.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-medium text-marca-700 hover:text-marca-600"
                >
                  Instagram {empresa.redes.instagramUsuario}
                </a>
                <a
                  href={empresa.redes.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-medium text-marca-700 hover:text-marca-600"
                >
                  Facebook {empresa.redes.facebookUsuario}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
