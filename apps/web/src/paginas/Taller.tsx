import { Link } from 'react-router-dom';
import { IconoCheck, IconoFlecha, IconoHerramienta } from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function Taller() {
  const { servicios, sucursales, empresa } = catalogo;
  const taller = servicios.find((s) => s.slug === 'taller');
  const conTaller = sucursales.filter((s) => s.servicios.includes('taller'));

  return (
    <>
      <section className="bg-pino-900 text-white">
        <div className="contenedor py-14 lg:py-16">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-pino-300">
            <IconoHerramienta className="h-4 w-4" />
            Servicio
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight lg:text-5xl">
            {taller?.nombre ?? 'Taller'}
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-nieve-100/85">
            {taller?.detalle ??
              'Taller especializado en instalaciones, reparaciones y mantenimiento de equipos de aventura.'}
          </p>
        </div>
      </section>

      <div className="contenedor grid gap-10 py-14 lg:grid-cols-[1fr_340px] lg:py-16">
        <div>
          <h2 className="text-2xl font-bold">Qué hacemos</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {['Instalaciones', 'Reparaciones', 'Mantenimiento de equipos de aventura'].map(
              (item) => (
                <li key={item} className="tarjeta flex items-start gap-3 p-5">
                  <IconoCheck className="mt-0.5 h-5 w-5 shrink-0 text-pino-600" />
                  <span className="text-[15px] font-medium text-tinta-900">{item}</span>
                </li>
              ),
            )}
          </ul>

          <div className="mt-10 rounded-xl2 bg-nieve-100 p-6">
            <h3 className="text-lg font-semibold">Detrás del rental</h3>
            <p className="mt-2 leading-relaxed text-tinta-700">
              El taller es lo que sostiene el servicio de alquiler: cada equipo que sale a la
              montaña pasa antes por revisión, y los modelos se renuevan periódicamente.
            </p>
            <Link
              to="/rental"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
            >
              Ver el servicio de rental <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="tarjeta p-6">
            <h2 className="text-base font-semibold">Sucursales con taller</h2>
            <ul className="mt-4 space-y-2.5">
              {conTaller.map((sucursal) => (
                <li key={sucursal.slug} className="text-sm">
                  <span className="block font-medium text-tinta-900">{sucursal.nombre}</span>
                  <span className="block text-tinta-500">
                    {sucursal.ciudad}, {sucursal.provincia}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/sucursales"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
            >
              Direcciones y horarios <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>

          <div className="tarjeta bg-pino-50 p-6">
            <h2 className="text-base font-semibold">Consultá por tu equipo</h2>
            <p className="mt-2 text-sm leading-relaxed text-tinta-700">
              Contanos qué necesitás y te decimos plazo y costo antes de dejarlo.
            </p>
            <a
              href={empresa.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full bg-pino-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pino-700"
            >
              WhatsApp {empresa.whatsapp}
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
