import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Encabezado } from './components/Encabezado.tsx';
import { PiePagina } from './components/PiePagina.tsx';
import { Carrito } from './paginas/Carrito.tsx';
import { Catalogo } from './paginas/Catalogo.tsx';
import { Clima } from './paginas/Clima.tsx';
import { Contacto } from './paginas/Contacto.tsx';
import { FichaProducto } from './paginas/FichaProducto.tsx';
import { Inicio } from './paginas/Inicio.tsx';
import { Marcas } from './paginas/Marcas.tsx';
import { Nosotros } from './paginas/Nosotros.tsx';
import { Novedades } from './paginas/Novedades.tsx';
import { Rental } from './paginas/Rental.tsx';
import { Sucursales } from './paginas/Sucursales.tsx';
import { Taller } from './paginas/Taller.tsx';
import { NoEncontrada } from './paginas/NoEncontrada.tsx';

/** Al cambiar de pagina la vista vuelve arriba, como espera un sitio comun. */
function AlSubirAlNavegar() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-pino-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Saltar al contenido
      </a>

      <AlSubirAlNavegar />
      <Encabezado />

      <main id="contenido" className="flex-1">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/productos" element={<Catalogo />} />
          <Route path="/producto/:slug" element={<FichaProducto />} />
          <Route path="/rental" element={<Rental />} />
          <Route path="/taller" element={<Taller />} />
          <Route path="/sucursales" element={<Sucursales />} />
          <Route path="/marcas" element={<Marcas />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/novedades" element={<Novedades />} />
          <Route path="/clima" element={<Clima />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>

      <PiePagina />
    </div>
  );
}
