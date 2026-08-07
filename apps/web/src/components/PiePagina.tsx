import { Link } from 'react-router-dom';
import { Logotipo } from './Logo.tsx';
import { IconoFacebook, IconoInstagram, IconoWhatsapp } from './Iconos.tsx';
import { catalogo } from '@/lib/api.ts';

export function PiePagina() {
  const { empresa, areas, sucursales, servicios } = catalogo;

  return (
    <footer className="mt-24 bg-carbon-900 text-nieve-100">
      <div className="contenedor grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logotipo conBajada className="w-60" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-nieve-200/80">
            {empresa.descripcionCorta}
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href={empresa.redes.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-white/15 p-2.5 transition-colors hover:bg-white/10"
            >
              <IconoInstagram className="h-[18px] w-[18px]" />
            </a>
            <a
              href={empresa.redes.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="rounded-full border border-white/15 p-2.5 transition-colors hover:bg-white/10"
            >
              <IconoFacebook className="h-[18px] w-[18px]" />
            </a>
            <a
              href={empresa.whatsappLink}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="rounded-full border border-white/15 p-2.5 transition-colors hover:bg-white/10"
            >
              <IconoWhatsapp className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>

        <nav>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-marca-300">
            Productos
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-nieve-200/85">
            {areas.map((area) => (
              <li key={area.slug}>
                <Link to={`/productos?area=${area.slug}`} className="hover:text-white">
                  {area.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-marca-300">
            Servicios
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-nieve-200/85">
            <li>
              <Link to="/rental" className="hover:text-white">
                Rental - Alquiler
              </Link>
            </li>
            <li>
              <Link to="/taller" className="hover:text-white">
                Taller
              </Link>
            </li>
            <li>
              <Link to="/marcas" className="hover:text-white">
                Marcas
              </Link>
            </li>
            <li>
              <Link to="/clima" className="hover:text-white">
                Clima en los centros de invierno
              </Link>
            </li>
            <li>
              <Link to="/novedades" className="hover:text-white">
                Novedades
              </Link>
            </li>
            <li>
              <Link to="/nosotros" className="hover:text-white">
                Quiénes somos
              </Link>
            </li>
            <li className="sr-only">{servicios.length} servicios</li>
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-marca-300">
            Contacto
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-nieve-200/85">
            <li>
              <a href={`mailto:${empresa.email}`} className="hover:text-white">
                {empresa.email}
              </a>
            </li>
            <li>
              <a href={`tel:${empresa.telefono.replace(/[^+\d]/g, '')}`} className="hover:text-white">
                {empresa.telefono}
              </a>
            </li>
            <li>
              <a href={empresa.whatsappLink} target="_blank" rel="noreferrer" className="hover:text-white">
                WhatsApp {empresa.whatsapp}
              </a>
            </li>
          </ul>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-marca-300">
            Sucursales
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-nieve-200/85">
            {sucursales.map((s) => s.ciudad).join(' · ')}
          </p>
          <Link
            to="/sucursales"
            className="mt-3 inline-block text-sm font-medium text-marca-300 hover:text-white"
          >
            Ver todas las sucursales
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="contenedor flex flex-col gap-2 py-5 text-xs text-nieve-200/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {empresa.nombre} · {empresa.tagline}
          </p>
          <a href={empresa.sitioOriginal} target="_blank" rel="noreferrer" className="hover:text-white">
            eurocampingonline.com.ar
          </a>
        </div>
      </div>
    </footer>
  );
}
