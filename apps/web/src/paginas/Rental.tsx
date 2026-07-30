import { useEffect, useState } from 'react';
import { IconoCalendario, IconoCheck, IconoHerramienta, IconoUbicacion } from '@/components/Iconos.tsx';
import { catalogo, consultarDisponibilidad, crearReserva, hayBackend } from '@/lib/api.ts';
import { fechaLarga, hoyISO, precio as formatearPrecio, sumarDias } from '@/lib/formato.ts';
import type { Disponibilidad } from '@/lib/tipos.ts';

type Paso = 'consulta' | 'datos' | 'listo';

export function Rental() {
  const { rental, sucursales, empresa } = catalogo;
  const sucursalesRental = sucursales.filter((s) => rental.sucursales.includes(s.slug));

  const [categoria, setCategoria] = useState(rental.categorias[0]?.slug ?? '');
  const [sucursal, setSucursal] = useState(sucursalesRental[0]?.slug ?? '');
  const [desde, setDesde] = useState(sumarDias(hoyISO(), 1));
  const [hasta, setHasta] = useState(sumarDias(hoyISO(), 4));
  const [unidades, setUnidades] = useState(1);

  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [paso, setPaso] = useState<Paso>('consulta');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; enviadoAlServidor: boolean } | null>(
    null,
  );

  const [cliente, setCliente] = useState({ nombre: '', email: '', telefono: '', comentario: '' });
  const [enviando, setEnviando] = useState(false);

  const rangoInvalido = desde > hasta;

  // Al mover cualquier parametro la disponibilidad previa deja de ser valida.
  useEffect(() => {
    setDisponibilidad(null);
    setPaso('consulta');
    setError(null);
  }, [categoria, sucursal, desde, hasta, unidades]);

  const consultar = async () => {
    if (rangoInvalido) return;
    setConsultando(true);
    setError(null);
    try {
      const respuesta = await consultarDisponibilidad({ categoria, sucursal, desde, hasta });
      setDisponibilidad(respuesta);
      setPaso('datos');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No pudimos consultar la disponibilidad.');
    } finally {
      setConsultando(false);
    }
  };

  const reservar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await crearReserva({
        categoria,
        sucursal,
        desde,
        hasta,
        unidades,
        cliente: {
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          comentario: cliente.comentario || undefined,
        },
      });
      setResultado(respuesta);
      setPaso('listo');
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : 'No pudimos registrar la reserva. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const categoriaActual = rental.categorias.find((c) => c.slug === categoria);
  const sucursalActual = sucursales.find((s) => s.slug === sucursal);

  const claseCampo =
    'w-full rounded-lg border border-nieve-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-marca-300';

  return (
    <>
      <section className="bg-carbon-900 text-white">
        <div className="contenedor py-14 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marca-400">
            Rental · Alquiler
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight lg:text-5xl">
            Reservá tu equipo de ski o snowboard
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-nieve-200/85">{rental.descripcion}</p>
        </div>
      </section>

      <div className="contenedor -mt-8 pb-16 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Formulario */}
          <div className="tarjeta overflow-hidden">
            <div className="border-b border-nieve-200 bg-white p-6 lg:p-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <IconoCalendario className="h-5 w-5 text-marca-600" />
                Elegí equipo, sucursal y fechas
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                    Equipo
                  </span>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className={claseCampo}
                  >
                    {rental.categorias.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                    Sucursal de retiro
                  </span>
                  <select
                    value={sucursal}
                    onChange={(e) => setSucursal(e.target.value)}
                    className={claseCampo}
                  >
                    {sucursalesRental.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.nombre} · {s.ciudad}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                    Retiro
                  </span>
                  <input
                    type="date"
                    value={desde}
                    min={hoyISO()}
                    onChange={(e) => {
                      setDesde(e.target.value);
                      if (e.target.value > hasta) setHasta(e.target.value);
                    }}
                    className={claseCampo}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                    Devolución
                  </span>
                  <input
                    type="date"
                    value={hasta}
                    min={desde}
                    onChange={(e) => setHasta(e.target.value)}
                    className={claseCampo}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                    Cantidad de equipos
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={unidades}
                    onChange={(e) => setUnidades(Math.max(1, Number(e.target.value) || 1))}
                    className={claseCampo}
                  />
                </label>
              </div>

              {rangoInvalido && (
                <p className="mt-4 text-sm text-red-600">
                  La fecha de devolución no puede ser anterior al retiro.
                </p>
              )}

              <button
                type="button"
                onClick={consultar}
                disabled={consultando || rangoInvalido}
                className="mt-6 w-full rounded-full bg-carbon-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-carbon-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {consultando ? 'Consultando…' : 'Consultar disponibilidad'}
              </button>
            </div>

            {/* Resultado */}
            {paso !== 'consulta' && disponibilidad && (
              <div className="bg-nieve-50 p-6 lg:p-8">
                {paso === 'listo' && resultado ? (
                  <div>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-marca-100 text-marca-700">
                      <IconoCheck className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold">
                      Solicitud registrada · {resultado.codigo}
                    </h3>
                    <p className="mt-2 max-w-lg leading-relaxed text-carbon-700">
                      Guardá el código <strong>{resultado.codigo}</strong>. Te vamos a contactar a{' '}
                      <strong>{cliente.email}</strong> para confirmar el equipo y la talla.
                    </p>
                    {!resultado.enviadoAlServidor && (
                      <p className="mt-4 rounded-lg border border-marca-400/50 bg-marca-400/10 px-4 py-3 text-sm text-carbon-700">
                        Esta demostración está publicada sin servidor conectado, así que la reserva
                        no quedó guardada. Con el backend en línea, la solicitud se registra y
                        descuenta stock automáticamente.
                      </p>
                    )}
                    <a
                      href={empresa.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex rounded-full bg-carbon-900 px-6 py-3 text-sm font-semibold text-white hover:bg-carbon-700"
                    >
                      Continuar por WhatsApp
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold">
                        {fechaLarga(desde)} → {fechaLarga(hasta)}
                        <span className="ml-2 text-sm font-normal text-carbon-500">
                          {disponibilidad.dias} {disponibilidad.dias === 1 ? 'día' : 'días'}
                        </span>
                      </h3>
                      {disponibilidad.totalEstimado != null && (
                        <p className="text-lg font-semibold">
                          {formatearPrecio(disponibilidad.totalEstimado * unidades)}
                          <span className="ml-1 text-sm font-normal text-carbon-500">estimado</span>
                        </p>
                      )}
                    </div>

                    {hayBackend && disponibilidad.unidadesTotales > 0 ? (
                      <p
                        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                          disponibilidad.unidadesDisponibles >= unidades
                            ? 'bg-marca-100 text-marca-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {disponibilidad.unidadesDisponibles >= unidades
                          ? `${disponibilidad.unidadesDisponibles} ${
                              disponibilidad.unidadesDisponibles === 1
                                ? 'equipo disponible'
                                : 'equipos disponibles'
                            }`
                          : disponibilidad.unidadesDisponibles === 1
                            ? 'Solo 1 equipo para esas fechas'
                            : `Solo ${disponibilidad.unidadesDisponibles} equipos para esas fechas`}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-carbon-500">
                        Dejanos tus datos y la sucursal de {sucursalActual?.ciudad} te confirma el
                        equipo disponible para esas fechas.
                      </p>
                    )}

                    <form onSubmit={reservar} className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                          Nombre y apellido
                        </span>
                        <input
                          required
                          value={cliente.nombre}
                          onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                          className={claseCampo}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                          Email
                        </span>
                        <input
                          required
                          type="email"
                          value={cliente.email}
                          onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                          className={claseCampo}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                          Teléfono
                        </span>
                        <input
                          required
                          value={cliente.telefono}
                          onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                          className={claseCampo}
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500">
                          Altura, peso y nivel (opcional)
                        </span>
                        <textarea
                          rows={3}
                          value={cliente.comentario}
                          onChange={(e) => setCliente({ ...cliente, comentario: e.target.value })}
                          placeholder="Nos ayuda a preparar el equipo antes de que llegues."
                          className={claseCampo}
                        />
                      </label>

                      {error && (
                        <p className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={enviando}
                        className="rounded-full bg-marca-500 px-7 py-3.5 text-sm font-semibold text-carbon-900 transition-colors hover:bg-marca-400 disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
                      >
                        {enviando ? 'Enviando…' : 'Solicitar reserva'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {error && paso === 'consulta' && (
              <p className="border-t border-nieve-200 bg-red-50 px-6 py-4 text-sm text-red-700 lg:px-8">
                {error}
              </p>
            )}
          </div>

          {/* Lateral */}
          <aside className="space-y-5">
            {categoriaActual && (
              <div className="tarjeta p-6">
                <h2 className="text-base font-semibold">{categoriaActual.nombre}</h2>
                {categoriaActual.descripcion && (
                  <p className="mt-1.5 text-sm text-carbon-500">{categoriaActual.descripcion}</p>
                )}
                <ul className="mt-4 space-y-2">
                  {categoriaActual.incluye.map((parte) => (
                    <li key={parte} className="flex items-center gap-2 text-sm text-carbon-700">
                      <IconoCheck className="h-4 w-4 text-marca-600" />
                      {parte}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-nieve-200 pt-4 text-sm">
                  <span className="text-carbon-500">Tarifa por día: </span>
                  <span className="font-semibold">{formatearPrecio(categoriaActual.tarifaPorDia)}</span>
                </p>
              </div>
            )}

            {sucursalActual && (
              <div className="tarjeta p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <IconoUbicacion className="h-4 w-4 text-marca-600" />
                  {sucursalActual.nombre}
                </h2>
                <p className="mt-2 text-sm text-carbon-500">
                  {sucursalActual.direccion ?? 'Consultá la dirección por WhatsApp'}
                  {sucursalActual.direccion ? `, ${sucursalActual.ciudad}` : ''}
                </p>
                {sucursalActual.horarios.map((h) => (
                  <p key={h.dias} className="mt-1 text-sm text-carbon-500">
                    {h.dias}: {h.horario}
                  </p>
                ))}
                {sucursalActual.centroDeSki && (
                  <p className="mt-3 inline-flex rounded-full bg-hielo-100 px-3 py-1 text-xs font-medium text-hielo-700">
                    Centro de ski: {sucursalActual.centroDeSki}
                  </p>
                )}
              </div>
            )}

            <div className="tarjeta bg-marca-50 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <IconoHerramienta className="h-4 w-4 text-marca-600" />
                Taller incluido
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-carbon-700">
                Todos los equipos de alquiler pasan por nuestro taller: instalación, reparación y
                mantenimiento antes de cada salida.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
