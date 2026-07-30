import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo.tsx';
import {
  IconoBuscar,
  IconoCarrito,
  IconoCerrar,
  IconoInstagram,
  IconoMenu,
  IconoWhatsapp,
} from './Iconos.tsx';
import { catalogo } from '@/lib/api.ts';
import { useCarrito } from '@/lib/carrito.tsx';

const enlaces = [
  { a: '/rental', texto: 'Rental' },
  { a: '/taller', texto: 'Taller' },
  { a: '/sucursales', texto: 'Sucursales' },
  { a: '/marcas', texto: 'Marcas' },
  { a: '/nosotros', texto: 'Nosotros' },
];

export function Encabezado() {
  const { empresa, areas } = catalogo;
  const { cantidadTotal } = useCarrito();
  const navegar = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [areasAbiertas, setAreasAbiertas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedorAreas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!areasAbiertas) return;
    const alClicFuera = (evento: MouseEvent) => {
      if (!contenedorAreas.current?.contains(evento.target as Node)) setAreasAbiertas(false);
    };
    const alEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAreasAbiertas(false);
    };
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, [areasAbiertas]);

  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    navegar(`/productos?q=${encodeURIComponent(busqueda.trim())}`);
    setMenuAbierto(false);
  };

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-marca-700' : 'text-carbon-700 hover:text-marca-600'
    }`;

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-carbon-900 text-nieve-100">
        <div className="contenedor flex h-9 items-center justify-between text-[12px]">
          <p className="truncate">
            Asesoramiento experto y servicio de taller · Desde {empresa.desde}
          </p>
          <div className="flex items-center gap-4">
            <a
              href={empresa.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-white"
            >
              <IconoWhatsapp className="h-4 w-4" />
              <span className="hidden sm:inline">{empresa.whatsapp}</span>
            </a>
            <a
              href={empresa.redes.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="hover:text-white"
            >
              <IconoInstagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-nieve-200 bg-white/95 backdrop-blur">
        <div className="contenedor flex h-[68px] items-center gap-6">
          <Link to="/" aria-label="Inicio" onClick={() => setMenuAbierto(false)}>
            <Logo />
          </Link>

          <nav className="ml-auto hidden items-center gap-6 lg:flex">
            <div className="relative" ref={contenedorAreas}>
              <button
                type="button"
                onClick={() => setAreasAbiertas((v) => !v)}
                aria-expanded={areasAbiertas}
                className="flex items-center gap-1 text-sm font-medium text-carbon-700 transition-colors hover:text-marca-600"
              >
                Productos
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {areasAbiertas && (
                <div className="absolute left-1/2 top-full z-50 mt-3 w-[520px] -translate-x-1/2 rounded-xl2 border border-nieve-200 bg-white p-3 shadow-xl shadow-carbon-900/10">
                  <div className="grid grid-cols-2 gap-1">
                    {areas.map((area) => (
                      <Link
                        key={area.slug}
                        to={`/productos?area=${area.slug}`}
                        onClick={() => setAreasAbiertas(false)}
                        className="rounded-lg px-3 py-2.5 transition-colors hover:bg-nieve-100"
                      >
                        <span className="block text-sm font-medium text-carbon-900">{area.nombre}</span>
                        {area.descripcion && (
                          <span className="mt-0.5 block text-xs leading-snug text-carbon-500">
                            {area.descripcion}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/productos"
                    onClick={() => setAreasAbiertas(false)}
                    className="mt-2 block rounded-lg bg-carbon-900 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-carbon-700"
                  >
                    Ver todo el catálogo
                  </Link>
                </div>
              )}
            </div>

            {enlaces.map((enlace) => (
              <NavLink key={enlace.a} to={enlace.a} className={claseEnlace}>
                {enlace.texto}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={buscar} className="ml-auto hidden items-center lg:ml-0 lg:flex">
            <label className="relative">
              <span className="sr-only">Buscar productos</span>
              <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-500" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar"
                className="w-44 rounded-full border border-nieve-200 bg-nieve-50 py-2 pl-9 pr-3 text-sm outline-none transition-all focus:w-56 focus:border-marca-300 focus:bg-white"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link
              to="/carrito"
              className="relative rounded-full p-2.5 text-carbon-700 transition-colors hover:bg-nieve-100"
              aria-label={`Carrito (${cantidadTotal})`}
            >
              <IconoCarrito />
              {cantidadTotal > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-marca-500 px-1 text-[11px] font-semibold text-carbon-900">
                  {cantidadTotal}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="rounded-full p-2.5 text-carbon-700 transition-colors hover:bg-nieve-100 lg:hidden"
              aria-label="Menú"
              aria-expanded={menuAbierto}
            >
              {menuAbierto ? <IconoCerrar /> : <IconoMenu />}
            </button>
          </div>
        </div>
      </div>

      {menuAbierto && (
        <div className="border-b border-nieve-200 bg-white lg:hidden">
          <div className="contenedor space-y-4 py-5">
            <form onSubmit={buscar}>
              <label className="relative block">
                <span className="sr-only">Buscar productos</span>
                <IconoBuscar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-500" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar productos"
                  className="w-full rounded-full border border-nieve-200 bg-nieve-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-marca-300 focus:bg-white"
                />
              </label>
            </form>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                Productos
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {areas.map((area) => (
                  <Link
                    key={area.slug}
                    to={`/productos?area=${area.slug}`}
                    onClick={() => setMenuAbierto(false)}
                    className="rounded-lg bg-nieve-100 px-3 py-2 text-sm font-medium text-carbon-900"
                  >
                    {area.nombre}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-nieve-200 pt-3">
              {[{ a: '/productos', texto: 'Ver todo el catálogo' }, ...enlaces, { a: '/contacto', texto: 'Contacto' }].map(
                (enlace) => (
                  <Link
                    key={enlace.a}
                    to={enlace.a}
                    onClick={() => setMenuAbierto(false)}
                    className="rounded-lg px-1 py-2 text-[15px] font-medium text-carbon-700"
                  >
                    {enlace.texto}
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
