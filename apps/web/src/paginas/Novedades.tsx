import { Link } from 'react-router-dom';
import { IconoFlecha } from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function Novedades() {
  const { novedades, empresa } = catalogo;

  return (
    <div className="contenedor py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">{novedades.titulo}</h1>
        <p className="mt-3 leading-relaxed text-tinta-500">
          Llegadas de temporada, novedades de marcas y noticias de la tienda.
        </p>
      </header>

      {novedades.items.length === 0 ? (
        <div className="mt-10 tarjeta p-8 lg:p-10">
          <h2 className="text-lg font-semibold">Todavía no hay novedades publicadas acá</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-tinta-700">
            Esta sección se carga desde el panel de administración. Mientras tanto, publicamos las
            novedades en nuestras redes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={empresa.redes.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-pino-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pino-700"
            >
              Instagram {empresa.redes.instagramUsuario}
            </a>
            <a
              href={empresa.redes.facebook}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-nieve-200 px-5 py-2.5 text-sm font-medium text-tinta-700 hover:border-pino-300 hover:text-pino-700"
            >
              Facebook {empresa.redes.facebookUsuario}
            </a>
          </div>
          <Link
            to="/productos"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
          >
            Ver el catálogo <IconoFlecha className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
