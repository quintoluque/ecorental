import { IconoReloj, IconoTelefono, IconoUbicacion, IconoWhatsapp } from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

const ETIQUETAS: Record<string, string> = {
  venta: 'Venta',
  rental: 'Rental',
  taller: 'Taller',
};

export function Sucursales() {
  const { sucursales, empresa } = catalogo;

  return (
    <div className="contenedor py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">Sucursales</h1>
        <p className="mt-3 leading-relaxed text-tinta-500">
          Estamos en Buenos Aires, Córdoba y los principales centros de montaña del país. Escribinos
          por WhatsApp para confirmar stock antes de acercarte.
        </p>
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sucursales.map((sucursal) => (
          <article
            key={sucursal.slug}
            className={`tarjeta flex flex-col p-6 ${
              sucursal.casaCentral ? 'ring-1 ring-pino-300' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{sucursal.nombre}</h2>
                <p className="mt-0.5 text-sm text-tinta-500">
                  {sucursal.ciudad}, {sucursal.provincia}
                </p>
              </div>
              {sucursal.casaCentral && (
                <span className="shrink-0 rounded-full bg-pino-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-pino-700">
                  Casa central
                </span>
              )}
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex gap-2.5">
                <dt className="mt-0.5 shrink-0 text-pino-600">
                  <IconoUbicacion className="h-4 w-4" />
                  <span className="sr-only">Dirección</span>
                </dt>
                <dd className="text-tinta-700">
                  {sucursal.direccion ? (
                    <>
                      {sucursal.direccion}
                      {sucursal.codigoPostal && (
                        <span className="block text-tinta-500">
                          ({sucursal.codigoPostal}) {sucursal.ciudad}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-tinta-500">Consultá la dirección por WhatsApp</span>
                  )}
                </dd>
              </div>

              {sucursal.horarios.length > 0 && (
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 shrink-0 text-pino-600">
                    <IconoReloj className="h-4 w-4" />
                    <span className="sr-only">Horarios</span>
                  </dt>
                  <dd className="text-tinta-700">
                    {sucursal.horarios.map((h) => (
                      <span key={h.dias} className="block">
                        {h.dias}: {h.horario}
                      </span>
                    ))}
                  </dd>
                </div>
              )}

              <div className="flex gap-2.5">
                <dt className="mt-0.5 shrink-0 text-pino-600">
                  <IconoTelefono className="h-4 w-4" />
                  <span className="sr-only">Teléfono</span>
                </dt>
                <dd className="text-tinta-700">
                  <a
                    href={`tel:${(sucursal.telefono ?? empresa.telefono).replace(/[^+\d]/g, '')}`}
                    className="enlace-suave"
                  >
                    {sucursal.telefono ?? empresa.telefono}
                  </a>
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {sucursal.servicios.map((servicio) => (
                <span
                  key={servicio}
                  className="rounded-full bg-nieve-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-tinta-700"
                >
                  {ETIQUETAS[servicio] ?? servicio}
                </span>
              ))}
              {sucursal.centroDeSki && (
                <span className="rounded-full bg-hielo-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-hielo-600">
                  {sucursal.centroDeSki}
                </span>
              )}
            </div>

            <a
              href={sucursal.whatsapp ? `https://wa.me/${sucursal.whatsapp.replace(/[^\d]/g, '')}` : empresa.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-nieve-200 px-4 py-2.5 text-sm font-medium text-tinta-700 transition-colors hover:border-pino-300 hover:text-pino-700"
            >
              <IconoWhatsapp className="h-4 w-4" />
              Escribir por WhatsApp
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
