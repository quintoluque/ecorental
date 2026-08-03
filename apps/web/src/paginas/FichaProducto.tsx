import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductoImagen } from '@/components/ProductoImagen.tsx';
import { TarjetaProducto } from '@/components/TarjetaProducto.tsx';
import { IconoCalendario, IconoCheck, IconoFlecha } from '@/components/Iconos.tsx';
import { catalogo, obtenerProducto } from '@/lib/api.ts';
import { fotosDeProducto } from '@/lib/fotos.ts';
import { useCarrito } from '@/lib/carrito.tsx';
import { precio as formatearPrecio } from '@/lib/formato.ts';
import type { Producto } from '@/lib/tipos.ts';

export function FichaProducto() {
  const { slug = '' } = useParams();
  const { agregar } = useCarrito();

  const [producto, setProducto] = useState<Producto | undefined>();
  const [cargando, setCargando] = useState(true);
  const [agregado, setAgregado] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setAgregado(false);
    obtenerProducto(slug)
      .then((resultado) => {
        if (vigente) setProducto(resultado);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    window.scrollTo({ top: 0 });
    return () => {
      vigente = false;
    };
  }, [slug]);

  if (cargando) {
    return (
      <div className="contenedor py-20">
        <div className="h-96 animate-pulse rounded-xl2 bg-nieve-100" />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="contenedor py-24 text-center">
        <h1 className="text-3xl font-bold">No encontramos ese producto</h1>
        <p className="mt-3 text-carbon-500">Puede que ya no esté publicado.</p>
        <Link
          to="/productos"
          className="mt-8 inline-flex rounded-full bg-carbon-900 px-6 py-3 text-sm font-medium text-white hover:bg-carbon-700"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const marca = catalogo.marcas.find((m) => m.slug === producto.marca);
  const area = catalogo.areas.find((a) => a.slug === producto.area);
  const grupo = catalogo.grupos.find((g) => g.slug === producto.grupo);

  const relacionados = catalogo.productos
    .filter((p) => p.slug !== producto.slug && (p.grupo === producto.grupo || p.marca === producto.marca))
    .slice(0, 4);

  // Los rubros del articulo, como enlaces al catalogo ya filtrado.
  const { taxonomia } = catalogo;
  const buscarNombre = (opciones: { slug: string; nombre: string }[], slug: string | null) =>
    slug ? (opciones.find((o) => o.slug === slug)?.nombre ?? null) : null;

  const clasificacion = [
    ...producto.deportes.map((deporte) => ({
      clave: 'deporte',
      valor: deporte,
      nombre: buscarNombre(taxonomia.deportes, deporte),
    })),
    { clave: 'tipo', valor: producto.tipo, nombre: buscarNombre(taxonomia.tipos, producto.tipo) },
    {
      clave: 'publico',
      valor: producto.publico,
      nombre: buscarNombre(taxonomia.publicos, producto.publico),
    },
    {
      clave: 'temporada',
      valor: producto.temporada,
      nombre: buscarNombre(taxonomia.temporadas, producto.temporada),
    },
  ].filter((e): e is { clave: string; valor: string; nombre: string } =>
    Boolean(e.valor && e.nombre),
  );

  const alAgregar = () => {
    agregar(producto);
    setAgregado(true);
  };

  return (
    <div className="contenedor py-8 lg:py-12">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-carbon-500">
        <Link to="/productos" className="enlace-suave">
          Catálogo
        </Link>
        {area && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/productos?area=${area.slug}`} className="enlace-suave">
              {area.nombre}
            </Link>
          </>
        )}
        {grupo && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={`/productos?grupo=${grupo.slug}`} className="enlace-suave">
              {grupo.nombre}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ProductoImagen
          nombre={producto.nombre}
          marca={marca?.nombre}
          imagenes={fotosDeProducto(producto.slug, producto.imagenes)}
          grande
          className="aspect-square w-full rounded-xl2 border border-nieve-200"
        />

        <div>
          {marca && (
            <Link
              to={`/productos?marca=${marca.slug}`}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-marca-600 hover:text-marca-700"
            >
              {marca.nombre}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-bold leading-tight lg:text-4xl">{producto.nombre}</h1>

          <p
            className={`mt-5 ${
              producto.precio == null
                ? 'text-lg font-medium text-carbon-500'
                : 'text-3xl font-bold text-carbon-900'
            }`}
          >
            {formatearPrecio(producto.precio)}
          </p>
          {producto.precio == null && (
            <p className="mt-1.5 text-sm text-carbon-500">
              Escribinos y te pasamos precio y disponibilidad al momento.
            </p>
          )}

          {producto.descripcion && (
            <p className="mt-6 leading-relaxed text-carbon-700">{producto.descripcion}</p>
          )}

          {clasificacion.length > 0 && (
            <div className="mt-6">
              <h2 className="sr-only">Clasificación</h2>
              <div className="flex flex-wrap gap-2">
                {clasificacion.map((etiqueta) => (
                  <Link
                    key={`${etiqueta.clave}-${etiqueta.valor}`}
                    to={`/productos?${etiqueta.clave}=${etiqueta.valor}`}
                    title={`Ver todo en ${etiqueta.nombre}`}
                    className="rounded-full border border-nieve-200 bg-nieve-50 px-3 py-1.5 text-xs font-medium text-carbon-700 transition-colors hover:border-marca-300 hover:text-marca-700"
                  >
                    {etiqueta.nombre}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={alAgregar}
              className="inline-flex items-center gap-2 rounded-full bg-carbon-900 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-carbon-700"
            >
              {agregado ? (
                <>
                  <IconoCheck className="h-4 w-4" /> Agregado al carrito
                </>
              ) : producto.precio == null ? (
                'Agregar a la consulta'
              ) : (
                'Agregar al carrito'
              )}
            </button>

            {producto.alquilable && (
              <Link
                to="/rental"
                className="inline-flex items-center gap-2 rounded-full border border-marca-500 px-6 py-3.5 text-sm font-semibold text-marca-700 transition-colors hover:bg-marca-500 hover:text-carbon-900"
              >
                <IconoCalendario className="h-4 w-4" />
                Alquilar por día
              </Link>
            )}
          </div>

          {agregado && (
            <Link
              to="/carrito"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-marca-700 hover:text-marca-600"
            >
              Ir al carrito <IconoFlecha className="h-4 w-4" />
            </Link>
          )}

          {producto.especificaciones.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-carbon-500">
                Especificaciones
              </h2>
              <dl className="mt-4 divide-y divide-nieve-200 border-y border-nieve-200">
                {producto.especificaciones.map((especificacion) => (
                  <div key={especificacion.nombre} className="flex gap-4 py-3 text-sm">
                    <dt className="w-40 shrink-0 text-carbon-500">{especificacion.nombre}</dt>
                    <dd className="font-medium text-carbon-900">{especificacion.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-8 rounded-xl2 bg-nieve-100 p-5 text-sm text-carbon-700">
            <p className="font-medium text-carbon-900">Retiro en sucursal o envío a todo el país</p>
            <p className="mt-1.5 leading-relaxed text-carbon-500">
              Consultá disponibilidad por sucursal antes de acercarte. Nuestro equipo te asesora en
              la elección del producto.
            </p>
            <Link
              to="/sucursales"
              className="mt-3 inline-flex items-center gap-1.5 font-medium text-marca-700 hover:text-marca-600"
            >
              Ver sucursales <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold">También te puede servir</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relacionados.map((relacionado) => (
              <TarjetaProducto key={relacionado.slug} producto={relacionado} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
