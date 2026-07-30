import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductoImagen } from '@/components/ProductoImagen.tsx';
import { IconoCarrito, IconoCheck, IconoFlecha } from '@/components/Iconos.tsx';
import { catalogo, crearPedido } from '@/lib/api.ts';
import { fotosDeProducto } from '@/lib/fotos.ts';
import { useCarrito } from '@/lib/carrito.tsx';
import { precio as formatearPrecio } from '@/lib/formato.ts';

export function Carrito() {
  const { items, total, cantidadTotal, cambiarCantidad, quitar, vaciar } = useCarrito();
  const { sucursales, empresa } = catalogo;

  const [cliente, setCliente] = useState({ nombre: '', email: '', telefono: '' });
  const [entrega, setEntrega] = useState<'retiro' | 'envio'>('retiro');
  const [sucursal, setSucursal] = useState(sucursales[0]?.slug ?? '');
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; enviadoAlServidor: boolean } | null>(
    null,
  );

  const confirmar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await crearPedido({
        cliente,
        items: items.map((i) => ({
          productoId: i.productoId,
          talle: i.talle,
          cantidad: i.cantidad,
        })),
        entrega,
        sucursal: entrega === 'retiro' ? sucursal : undefined,
        direccionEnvio: entrega === 'envio' ? direccionEnvio : undefined,
      });
      setResultado(respuesta);
      vaciar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No pudimos registrar el pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const claseCampo =
    'w-full rounded-lg border border-nieve-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-marca-300';
  const claseEtiqueta =
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500';

  if (resultado) {
    return (
      <div className="contenedor py-20">
        <div className="tarjeta mx-auto max-w-xl p-8 text-center lg:p-10">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-marca-100 text-marca-700">
            <IconoCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold">Pedido registrado</h1>
          <p className="mt-2 text-carbon-700">
            Tu código es <strong>{resultado.codigo}</strong>. Te escribimos a{' '}
            <strong>{cliente.email}</strong> para coordinar el pago y la entrega.
          </p>
          {!resultado.enviadoAlServidor && (
            <p className="mt-5 rounded-lg border border-marca-400/50 bg-marca-400/10 px-4 py-3 text-left text-sm text-carbon-700">
              Esta demostración está publicada sin servidor conectado, así que el pedido no quedó
              guardado. Con el backend en línea, el pedido entra al panel y descuenta stock de la
              sucursal elegida.
            </p>
          )}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={empresa.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-carbon-900 px-6 py-3 text-sm font-semibold text-white hover:bg-carbon-700"
            >
              Coordinar por WhatsApp
            </a>
            <Link
              to="/productos"
              className="rounded-full border border-nieve-200 px-6 py-3 text-sm font-medium text-carbon-700 hover:border-marca-300 hover:text-marca-700"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="contenedor py-24 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-nieve-100 text-carbon-500">
          <IconoCarrito className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="mt-2 text-carbon-500">Empezá por el catálogo o reservá tu equipo de nieve.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/productos"
            className="rounded-full bg-carbon-900 px-6 py-3 text-sm font-semibold text-white hover:bg-carbon-700"
          >
            Ver catálogo
          </Link>
          <Link
            to="/rental"
            className="rounded-full border border-nieve-200 px-6 py-3 text-sm font-medium text-carbon-700 hover:border-marca-300 hover:text-marca-700"
          >
            Alquilar equipo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor py-12 lg:py-16">
      <h1 className="text-3xl font-bold lg:text-4xl">Tu pedido</h1>
      <p className="mt-2 text-carbon-500">
        {cantidadTotal} {cantidadTotal === 1 ? 'artículo' : 'artículos'}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={`${item.productoId}-${item.talle}`} className="tarjeta flex gap-4 p-4">
              <Link to={`/producto/${item.slug}`} className="shrink-0">
                <ProductoImagen
                  nombre={item.nombre}
                  marca={catalogo.marcas.find((m) => m.slug === item.marca)?.nombre}
                  imagenes={fotosDeProducto(item.slug)}
                  className="h-24 w-24 rounded-lg"
                />
              </Link>

              <div className="flex flex-1 flex-col">
                <Link
                  to={`/producto/${item.slug}`}
                  className="text-[15px] font-medium leading-snug enlace-suave"
                >
                  {item.nombre}
                </Link>
                <p className="mt-1 text-sm text-carbon-500">{formatearPrecio(item.precio)}</p>

                <div className="mt-auto flex items-center gap-3 pt-3">
                  <label className="flex items-center gap-2 text-sm text-carbon-500">
                    <span className="sr-only">Cantidad de {item.nombre}</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={item.cantidad}
                      onChange={(e) =>
                        cambiarCantidad(item.productoId, item.talle, Number(e.target.value) || 1)
                      }
                      className="w-16 rounded-lg border border-nieve-200 px-2.5 py-1.5 text-sm text-carbon-900 outline-none focus:border-marca-300"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => quitar(item.productoId, item.talle)}
                    className="text-sm text-carbon-500 hover:text-red-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <p className="shrink-0 self-end text-base font-semibold">
                {item.precio == null ? '—' : formatearPrecio(item.precio * item.cantidad)}
              </p>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <form onSubmit={confirmar} className="tarjeta space-y-5 p-6">
            <div className="flex items-baseline justify-between border-b border-nieve-200 pb-4">
              <span className="text-sm text-carbon-500">Total</span>
              <span className="text-2xl font-bold">
                {total == null ? 'A confirmar' : formatearPrecio(total)}
              </span>
            </div>

            {total == null && (
              <p className="rounded-lg bg-nieve-100 px-4 py-3 text-sm leading-relaxed text-carbon-700">
                Algunos productos no tienen precio publicado. Registramos tu pedido como consulta y
                la sucursal te pasa el total antes de cobrarte.
              </p>
            )}

            <fieldset>
              <legend className={claseEtiqueta}>Entrega</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { valor: 'retiro', texto: 'Retiro en sucursal' },
                    { valor: 'envio', texto: 'Envío a domicilio' },
                  ] as const
                ).map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setEntrega(opcion.valor)}
                    aria-pressed={entrega === opcion.valor}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      entrega === opcion.valor
                        ? 'border-marca-500 bg-marca-50 text-marca-700'
                        : 'border-nieve-200 text-carbon-700 hover:border-marca-300'
                    }`}
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
            </fieldset>

            {entrega === 'retiro' ? (
              <label className="block">
                <span className={claseEtiqueta}>Sucursal</span>
                <select
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  className={claseCampo}
                >
                  {sucursales.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.nombre} · {s.ciudad}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className={claseEtiqueta}>Dirección de envío</span>
                <input
                  required
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  placeholder="Calle, número, ciudad, provincia"
                  className={claseCampo}
                />
              </label>
            )}

            <label className="block">
              <span className={claseEtiqueta}>Nombre y apellido</span>
              <input
                required
                value={cliente.nombre}
                onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                className={claseCampo}
              />
            </label>
            <label className="block">
              <span className={claseEtiqueta}>Email</span>
              <input
                required
                type="email"
                value={cliente.email}
                onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                className={claseCampo}
              />
            </label>
            <label className="block">
              <span className={claseEtiqueta}>Teléfono</span>
              <input
                required
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                className={claseCampo}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-full bg-carbon-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-carbon-700 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : total == null ? 'Enviar consulta' : 'Confirmar pedido'}
            </button>

            <Link
              to="/productos"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-carbon-500 hover:text-marca-700"
            >
              Seguir comprando <IconoFlecha className="h-4 w-4" />
            </Link>
          </form>
        </aside>
      </div>
    </div>
  );
}
