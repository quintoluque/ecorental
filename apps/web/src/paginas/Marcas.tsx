import { Link } from 'react-router-dom';
import { catalogo } from '@/lib/api.ts';
import { iniciales, tonoDeTexto } from '@/lib/formato.ts';

export function Marcas() {
  const { marcas, productos } = catalogo;

  return (
    <div className="contenedor py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">Marcas</h1>
        <p className="mt-3 leading-relaxed text-carbon-500">
          Trabajamos un stock amplio de las mejores marcas del mercado outdoor, elegidas por su
          rendimiento en montaña y respaldadas por nuestro taller.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {marcas.map((marca) => {
          const cantidad = productos.filter((p) => p.marca === marca.slug).length;
          const tono = tonoDeTexto(marca.nombre);

          return (
            <Link
              key={marca.slug}
              to={`/productos?marca=${marca.slug}`}
              className="tarjeta flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md"
            >
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                style={{
                  background: `hsl(${tono} 35% 94%)`,
                  color: `hsl(${(tono + 200) % 360} 45% 30%)`,
                }}
                aria-hidden="true"
              >
                {iniciales(marca.nombre)}
              </span>
              <span>
                <span className="block text-base font-semibold text-carbon-900">{marca.nombre}</span>
                <span className="mt-0.5 block text-sm text-carbon-500">
                  {cantidad} {cantidad === 1 ? 'producto' : 'productos'} publicados
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
