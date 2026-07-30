import { Link } from 'react-router-dom';
import { TarjetaProducto } from '@/components/TarjetaProducto.tsx';
import {
  IconoCalendario,
  IconoCheck,
  IconoFlecha,
  IconoHerramienta,
  IconoUbicacion,
} from '@/components/Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function Inicio() {
  const { empresa, areas, productos, marcas, sucursales, actividades, rental } = catalogo;

  const destacados = productos.slice(0, 4);
  const areasDestacadas = areas.filter((a) => a.destacada);
  const conRental = sucursales.filter((s) => s.servicios.includes('rental'));

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden bg-pino-900 text-white">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(120% 90% at 15% 0%, #0e6748 0%, transparent 55%), radial-gradient(90% 80% at 90% 20%, #0284c7 0%, transparent 50%)',
          }}
          aria-hidden="true"
        />
        <div className="cordillera absolute inset-x-0 bottom-0 h-32" aria-hidden="true" />

        <div className="contenedor relative py-20 lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pino-300">
            {empresa.tagline}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Todo el equipo para tu próxima salida.
            <span className="block text-pino-300">Venta y alquiler, desde 1965.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-nieve-100/85 sm:text-lg">
            {empresa.descripcion}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/productos"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-pino-900 transition-transform hover:-translate-y-0.5"
            >
              Ver catálogo
              <IconoFlecha className="h-4 w-4" />
            </Link>
            <Link
              to="/rental"
              className="inline-flex items-center gap-2 rounded-full bg-ambar-500 px-6 py-3.5 text-sm font-semibold text-tinta-900 transition-transform hover:-translate-y-0.5"
            >
              <IconoCalendario className="h-4 w-4" />
              Alquilar equipo de nieve
            </Link>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm text-nieve-100/75">
            {actividades.map((actividad) => (
              <li key={actividad} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-pino-300" aria-hidden="true" />
                {actividad}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Franja de confianza */}
      <section className="border-b border-nieve-200 bg-white">
        <div className="contenedor grid grid-cols-2 gap-6 py-8 lg:grid-cols-4">
          {[
            {
              icono: <IconoCheck className="h-5 w-5" />,
              titulo: `${new Date().getFullYear() - empresa.desde} años de experiencia`,
              texto: `Tienda de referencia desde ${empresa.desde}`,
            },
            {
              icono: <IconoUbicacion className="h-5 w-5" />,
              titulo: `${sucursales.length} sucursales`,
              texto: 'Buenos Aires, Córdoba y Patagonia',
            },
            {
              icono: <IconoCalendario className="h-5 w-5" />,
              titulo: 'Rental de ski y snowboard',
              texto: `En ${conRental.length} puntos de montaña`,
            },
            {
              icono: <IconoHerramienta className="h-5 w-5" />,
              titulo: 'Taller propio',
              texto: 'Instalación, reparación y mantenimiento',
            },
          ].map((item) => (
            <div key={item.titulo} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pino-50 text-pino-600">
                {item.icono}
              </span>
              <div>
                <p className="text-sm font-semibold text-tinta-900">{item.titulo}</p>
                <p className="mt-0.5 text-xs leading-snug text-tinta-500">{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Areas */}
      <section className="contenedor py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold lg:text-4xl">Elegí tu actividad</h2>
            <p className="mt-2 max-w-lg text-tinta-500">
              Cada disciplina con su equipo, sus marcas y el asesoramiento de gente que la practica.
            </p>
          </div>
          <Link
            to="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
          >
            Todo el catálogo <IconoFlecha className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areasDestacadas.map((area, indice) => (
            <Link
              key={area.slug}
              to={`/productos?area=${area.slug}`}
              className="group relative flex min-h-[190px] flex-col justify-end overflow-hidden rounded-xl2 p-6 text-white transition-transform hover:-translate-y-0.5"
              style={{
                // Gama acotada al verde-azul de montaña: evita que las ultimas
                // tarjetas se vayan a violetas que no son de la marca.
                background: (() => {
                  const tono = 158 + (indice / Math.max(1, areasDestacadas.length - 1)) * 46;
                  return `linear-gradient(150deg, hsl(${tono} 46% 21%), hsl(${tono + 14} 42% 33%))`;
                })(),
              }}
            >
              <div className="cordillera absolute inset-x-0 bottom-0 h-24 opacity-80" aria-hidden="true" />
              <div className="relative">
                <h3 className="text-xl font-semibold">{area.nombre}</h3>
                {area.descripcion && (
                  <p className="mt-1.5 max-w-sm text-sm leading-snug text-white/80">
                    {area.descripcion}
                  </p>
                )}
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-transform group-hover:translate-x-0.5">
                  Ver productos <IconoFlecha className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Rental */}
      <section className="bg-tinta-900 text-white">
        <div className="contenedor grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ambar-400">
              Rental · Alquiler
            </p>
            <h2 className="mt-4 text-3xl font-bold lg:text-4xl">
              Reservá tu equipo antes de subir a la montaña.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-nieve-200/80">{rental.descripcion}</p>

            <ul className="mt-6 space-y-2.5">
              {[
                'Elegís fechas y sucursal, y ves la disponibilidad real',
                'Personal especializado en la elección del equipo',
                'Renovación periódica de los modelos',
                'Reparación y mantenimiento en nuestro taller',
              ].map((texto) => (
                <li key={texto} className="flex items-start gap-2.5 text-sm text-nieve-200/85">
                  <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-ambar-400" />
                  {texto}
                </li>
              ))}
            </ul>

            <Link
              to="/rental"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-ambar-500 px-6 py-3.5 text-sm font-semibold text-tinta-900 transition-transform hover:-translate-y-0.5"
            >
              Consultar disponibilidad
              <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {rental.categorias.map((categoria) => (
              <div key={categoria.slug} className="rounded-xl2 border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold">{categoria.nombre}</h3>
                {categoria.descripcion && (
                  <p className="mt-1 text-sm text-nieve-200/70">{categoria.descripcion}</p>
                )}
                <ul className="mt-4 space-y-1.5">
                  {categoria.incluye.map((parte) => (
                    <li key={parte} className="flex items-center gap-2 text-sm text-nieve-200/85">
                      <IconoCheck className="h-3.5 w-3.5 text-pino-300" />
                      {parte}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-xl2 border border-white/10 bg-white/5 p-5 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pino-300">
                Puntos de rental
              </p>
              <p className="mt-2 text-sm text-nieve-200/85">
                {conRental.map((s) => s.ciudad).join(' · ')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Productos */}
      <section className="contenedor py-16 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold lg:text-4xl">Del catálogo</h2>
          <Link
            to="/productos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
          >
            Ver los {productos.length} productos <IconoFlecha className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {destacados.map((producto) => (
            <TarjetaProducto key={producto.slug} producto={producto} />
          ))}
        </div>
      </section>

      {/* Marcas y sucursales */}
      <section className="contenedor grid gap-10 pb-4 lg:grid-cols-2">
        <div className="tarjeta p-8">
          <h2 className="text-2xl font-bold">Marcas que trabajamos</h2>
          <p className="mt-2 text-sm text-tinta-500">
            Un stock amplio de las mejores marcas, elegidas por rendimiento en montaña.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {marcas.map((marca) => (
              <Link
                key={marca.slug}
                to={`/productos?marca=${marca.slug}`}
                className="rounded-full border border-nieve-200 bg-nieve-50 px-4 py-2 text-sm font-medium text-tinta-700 transition-colors hover:border-pino-300 hover:text-pino-700"
              >
                {marca.nombre}
              </Link>
            ))}
          </div>
        </div>

        <div className="tarjeta p-8">
          <h2 className="text-2xl font-bold">Estamos donde vas</h2>
          <p className="mt-2 text-sm text-tinta-500">
            Presencia en Buenos Aires, Córdoba y los principales centros de montaña del país.
          </p>
          <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {sucursales.map((sucursal) => (
              <li key={sucursal.slug} className="flex items-start gap-2.5">
                <IconoUbicacion className="mt-0.5 h-4 w-4 shrink-0 text-pino-600" />
                <span>
                  <span className="block text-sm font-medium text-tinta-900">{sucursal.ciudad}</span>
                  <span className="block text-xs text-tinta-500">{sucursal.provincia}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link
            to="/sucursales"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-pino-700 hover:text-pino-600"
          >
            Direcciones y horarios <IconoFlecha className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
