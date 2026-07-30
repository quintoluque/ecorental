import { useState } from 'react';
import { IconoCheck, IconoTelefono, IconoUbicacion, IconoWhatsapp } from '@/components/Iconos.tsx';
import { catalogo, enviarConsulta } from '@/lib/api.ts';

export function Contacto() {
  const { empresa, sucursales } = catalogo;
  const casaCentral = sucursales.find((s) => s.casaCentral);

  const [datos, setDatos] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ enviadoAlServidor: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await enviarConsulta({
        nombre: datos.nombre,
        email: datos.email,
        telefono: datos.telefono || undefined,
        asunto: datos.asunto || undefined,
        mensaje: datos.mensaje,
      });
      setEnviado(respuesta);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No pudimos enviar la consulta.');
    } finally {
      setEnviando(false);
    }
  };

  const claseCampo =
    'w-full rounded-lg border border-nieve-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-pino-300';
  const claseEtiqueta =
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-500';

  return (
    <div className="contenedor py-12 lg:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold lg:text-4xl">Contacto</h1>
        <p className="mt-3 leading-relaxed text-tinta-500">
          Escribinos por el equipo que buscás, una reserva de alquiler o una consulta de taller.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="tarjeta p-6 lg:p-8">
          {enviado ? (
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-pino-100 text-pino-700">
                <IconoCheck className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">Recibimos tu consulta</h2>
              <p className="mt-2 max-w-lg leading-relaxed text-tinta-700">
                Te respondemos a <strong>{datos.email}</strong> a la brevedad. Si es urgente,
                escribinos por WhatsApp.
              </p>
              {!enviado.enviadoAlServidor && (
                <p className="mt-4 rounded-lg border border-ambar-400/50 bg-ambar-400/10 px-4 py-3 text-sm text-tinta-700">
                  Esta demostración está publicada sin servidor conectado, así que el mensaje no fue
                  enviado. Con el backend en línea, la consulta queda registrada en el panel.
                </p>
              )}
              <a
                href={empresa.whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-pino-900 px-6 py-3 text-sm font-semibold text-white hover:bg-pino-700"
              >
                <IconoWhatsapp className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            </div>
          ) : (
            <form onSubmit={enviar} className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className={claseEtiqueta}>Nombre y apellido</span>
                <input
                  required
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="block">
                <span className={claseEtiqueta}>Email</span>
                <input
                  required
                  type="email"
                  value={datos.email}
                  onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="block">
                <span className={claseEtiqueta}>Teléfono (opcional)</span>
                <input
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="block">
                <span className={claseEtiqueta}>Asunto (opcional)</span>
                <input
                  value={datos.asunto}
                  onChange={(e) => setDatos({ ...datos, asunto: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={claseEtiqueta}>Mensaje</span>
                <textarea
                  required
                  rows={6}
                  value={datos.mensaje}
                  onChange={(e) => setDatos({ ...datos, mensaje: e.target.value })}
                  className={claseCampo}
                />
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="rounded-full bg-pino-900 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-pino-700 disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
              >
                {enviando ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="tarjeta p-6">
            <h2 className="text-base font-semibold">Datos de contacto</h2>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-2.5">
                <IconoTelefono className="mt-0.5 h-4 w-4 shrink-0 text-pino-600" />
                <a
                  href={`tel:${empresa.telefono.replace(/[^+\d]/g, '')}`}
                  className="text-tinta-700 enlace-suave"
                >
                  {empresa.telefono}
                </a>
              </li>
              <li className="flex gap-2.5">
                <IconoWhatsapp className="mt-0.5 h-4 w-4 shrink-0 text-pino-600" />
                <a
                  href={empresa.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-tinta-700 enlace-suave"
                >
                  {empresa.whatsapp}
                </a>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-pino-600" aria-hidden="true">
                  @
                </span>
                <a href={`mailto:${empresa.email}`} className="break-all text-tinta-700 enlace-suave">
                  {empresa.email}
                </a>
              </li>
              {casaCentral?.direccion && (
                <li className="flex gap-2.5">
                  <IconoUbicacion className="mt-0.5 h-4 w-4 shrink-0 text-pino-600" />
                  <span className="text-tinta-700">
                    {casaCentral.direccion}
                    <span className="block text-tinta-500">
                      ({casaCentral.codigoPostal}) {casaCentral.ciudad}, {casaCentral.provincia}
                    </span>
                  </span>
                </li>
              )}
            </ul>
          </div>

          {casaCentral && casaCentral.horarios.length > 0 && (
            <div className="tarjeta p-6">
              <h2 className="text-base font-semibold">Horarios de atención</h2>
              <ul className="mt-4 space-y-2 text-sm text-tinta-700">
                {casaCentral.horarios.map((horario) => (
                  <li key={horario.dias} className="flex justify-between gap-4">
                    <span className="text-tinta-500">{horario.dias}</span>
                    <span className="font-medium">{horario.horario}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
