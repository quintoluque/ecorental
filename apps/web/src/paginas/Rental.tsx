import { useEffect, useMemo, useState } from 'react';
import {
  IconoCalendario,
  IconoCerrar,
  IconoCheck,
  IconoHerramienta,
  IconoMas,
  IconoPersonas,
  IconoUbicacion,
} from '@/components/Iconos.tsx';
import { catalogo, consultarDisponibilidad, crearReserva, hayBackend } from '@/lib/api.ts';
import { diasEntre, fechaLarga, hoyISO, precio as formatearPrecio, sumarDias } from '@/lib/formato.ts';
import type { CategoriaRental, Disponibilidad, Participante } from '@/lib/tipos.ts';

type Paso = 1 | 2 | 3 | 'listo';

const CAMPO =
  'w-full rounded-lg border border-nieve-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-marca-300';
const ETIQUETA =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon-500';

/** Hasta los 12 años el equipo es Junior y el casco va incluido. */
const EDAD_JUNIOR = 12;

function publicoSegunEdad(edad: number | null): 'adulto' | 'junior' {
  return edad != null && edad <= EDAD_JUNIOR ? 'junior' : 'adulto';
}

/**
 * Elige el equipo que mejor encaja con lo que declaró la persona. Es una
 * sugerencia: el select queda igual para cambiarla.
 */
function categoriaSugerida(
  categorias: CategoriaRental[],
  disciplina: string,
  edad: number | null,
  nivel: string,
): string {
  const publico = publicoSegunEdad(edad);
  const dePublico = categorias.filter(
    (c) => c.disciplina === disciplina && c.publico === publico,
  );
  const candidatas = dePublico.length
    ? dePublico
    : categorias.filter((c) => c.disciplina === disciplina);
  if (candidatas.length === 0) return '';

  // No toda disciplina tiene equipo para todos los niveles: si falta el exacto
  // se elige el más cercano, y ante un empate el más técnico de los dos.
  const RANGO = ['principiante', 'intermedio', 'avanzado'];
  const buscado = RANGO.indexOf(nivel);

  const distancia = (categoria: CategoriaRental) => {
    const suyo = RANGO.indexOf(categoria.nivel);
    return Math.abs(suyo - buscado) * 2 - (suyo > buscado ? 1 : 0);
  };

  return [...candidatas].sort((a, b) => distancia(a) - distancia(b))[0]!.slug;
}

function participanteVacio(categorias: CategoriaRental[]): Participante {
  return {
    nombre: '',
    edad: null,
    altura: null,
    peso: null,
    calzado: '',
    nivel: 'principiante',
    disciplina: 'ski',
    categoria: categoriaSugerida(categorias, 'ski', null, 'principiante'),
    adicionales: [],
  };
}

function aNumeroONulo(valor: string): number | null {
  if (valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function Rental() {
  const { rental, sucursales, empresa } = catalogo;
  const sucursalesRental = sucursales.filter((s) => rental.sucursales.includes(s.slug));

  const [paso, setPaso] = useState<Paso>(1);
  const [sucursal, setSucursal] = useState(sucursalesRental[0]?.slug ?? '');
  const [desde, setDesde] = useState(sumarDias(hoyISO(), 1));
  const [hasta, setHasta] = useState(sumarDias(hoyISO(), 4));
  const [participantes, setParticipantes] = useState<Participante[]>([
    participanteVacio(rental.categorias),
  ]);
  const [cliente, setCliente] = useState({ nombre: '', email: '', telefono: '', comentario: '' });
  const [acepta, setAcepta] = useState(false);

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; enviadoAlServidor: boolean } | null>(
    null,
  );

  const rangoInvalido = desde > hasta;
  const dias = rangoInvalido ? 0 : diasEntre(desde, hasta);
  const sucursalActual = sucursales.find((s) => s.slug === sucursal);

  const categoriaPorSlug = useMemo(
    () => new Map(rental.categorias.map((c) => [c.slug, c])),
    [rental.categorias],
  );
  const adicionalPorSlug = useMemo(
    () => new Map(rental.adicionales.map((a) => [a.slug, a])),
    [rental.adicionales],
  );

  /** Cuántos equipos de cada categoría hay que reservar. */
  const equipos = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of participantes) {
      if (p.categoria) cuenta.set(p.categoria, (cuenta.get(p.categoria) ?? 0) + 1);
    }
    return [...cuenta].map(([categoria, unidades]) => ({ categoria, unidades }));
  }, [participantes]);

  const adicionales = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of participantes) {
      for (const slug of p.adicionales) cuenta.set(slug, (cuenta.get(slug) ?? 0) + 1);
    }
    return [...cuenta].map(([slug, unidades]) => ({ slug, unidades }));
  }, [participantes]);

  /**
   * Total estimado. Mientras ECO no publique las tarifas, cada línea vale null
   * y el resumen muestra "Consultar" en vez de un número inventado.
   */
  const totalEstimado = useMemo(() => {
    const lineas = [
      ...equipos.map((e) => ({
        tarifa: categoriaPorSlug.get(e.categoria)?.tarifaPorDia ?? null,
        unidades: e.unidades,
      })),
      ...adicionales.map((a) => ({
        tarifa: adicionalPorSlug.get(a.slug)?.tarifaPorDia ?? null,
        unidades: a.unidades,
      })),
    ];
    if (lineas.length === 0 || lineas.some((l) => l.tarifa == null)) return null;
    return lineas.reduce((suma, l) => suma + l.tarifa! * l.unidades * dias, 0);
  }, [equipos, adicionales, categoriaPorSlug, adicionalPorSlug, dias]);

  // Cambiar el viaje invalida lo que ya se había consultado.
  useEffect(() => {
    setDisponibilidades([]);
    setError(null);
  }, [sucursal, desde, hasta, participantes]);

  const cambiarParticipante = (indice: number, cambios: Partial<Participante>) => {
    setParticipantes((previos) =>
      previos.map((p, i) => {
        if (i !== indice) return p;
        const actualizado = { ...p, ...cambios };
        // Si cambió la disciplina, la edad o el nivel, se resugiere el equipo.
        if (
          cambios.disciplina !== undefined ||
          cambios.edad !== undefined ||
          cambios.nivel !== undefined
        ) {
          actualizado.categoria = categoriaSugerida(
            rental.categorias,
            actualizado.disciplina,
            actualizado.edad,
            actualizado.nivel,
          );
        }
        return actualizado;
      }),
    );
  };

  const agregarParticipante = () =>
    setParticipantes((previos) => [...previos, participanteVacio(rental.categorias)]);

  const quitarParticipante = (indice: number) =>
    setParticipantes((previos) => previos.filter((_, i) => i !== indice));

  const consultar = async () => {
    setConsultando(true);
    setError(null);
    try {
      // Una consulta por categoría: cada una tiene su propio parque de equipos.
      const respuestas = await Promise.all(
        equipos.map((equipo) =>
          consultarDisponibilidad({ categoria: equipo.categoria, sucursal, desde, hasta }),
        ),
      );
      setDisponibilidades(respuestas);
      setPaso(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        sucursal,
        desde,
        hasta,
        equipos,
        participantes,
        adicionales,
        cliente: {
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          comentario: cliente.comentario || undefined,
        },
      });
      setResultado(respuesta);
      setPaso('listo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : 'No pudimos registrar la reserva. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const participantesCompletos = participantes.every(
    (p) => p.nombre.trim() !== '' && p.categoria !== '',
  );

  return (
    <>
      <section className="bg-carbon-900 text-white">
        <div className="contenedor py-14 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marca-400">
            Rental · Alquiler de ski y snowboard
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight lg:text-5xl">
            Reservá el equipo de todo el viaje
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-nieve-200/85">{rental.resumen}</p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {rental.disciplinas.map((disciplina) => (
              <div
                key={disciplina.slug}
                className="rounded-xl2 border border-white/10 bg-white/5 p-5"
              >
                <h2 className="text-base font-semibold">Equipo completo de {disciplina.nombre}</h2>
                <p className="mt-1 text-sm leading-snug text-nieve-200/70">
                  {disciplina.descripcion}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {disciplina.incluye.map((parte) => (
                    <li key={parte} className="flex items-center gap-1.5 text-sm text-nieve-200/85">
                      <IconoCheck className="h-3.5 w-3.5 text-marca-300" />
                      {parte}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="contenedor py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-6">
            {paso === 'listo' && resultado ? (
              <div className="tarjeta p-6 lg:p-8">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-marca-100 text-marca-700">
                  <IconoCheck className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-2xl font-semibold">
                  Solicitud registrada · {resultado.codigo}
                </h2>
                <p className="mt-3 max-w-lg leading-relaxed text-carbon-700">
                  Guardá el código <strong>{resultado.codigo}</strong>. La sucursal de{' '}
                  {sucursalActual?.ciudad} te escribe a <strong>{cliente.email}</strong> para
                  confirmar el equipo de {participantes.length}{' '}
                  {participantes.length === 1 ? 'persona' : 'personas'} y la tarifa final.
                </p>
                {!resultado.enviadoAlServidor && (
                  <p className="mt-4 rounded-lg border border-marca-400/50 bg-marca-400/10 px-4 py-3 text-sm leading-relaxed text-carbon-700">
                    Esta demostración está publicada sin servidor conectado, así que la reserva no
                    quedó guardada. Con el backend en línea, la solicitud se registra y descuenta
                    stock automáticamente.
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
                {/* Paso 1 — el viaje */}
                <section className="tarjeta p-6 lg:p-8">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <IconoCalendario className="h-5 w-5 text-marca-600" />
                    1 · Tu viaje
                  </h2>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className={ETIQUETA}>Sucursal de retiro</span>
                      <select
                        value={sucursal}
                        onChange={(e) => setSucursal(e.target.value)}
                        className={CAMPO}
                      >
                        {sucursalesRental.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.nombre} · {s.ciudad}
                            {s.centroDeSki ? ` (${s.centroDeSki})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className={ETIQUETA}>Retiro</span>
                      <input
                        type="date"
                        value={desde}
                        min={hoyISO()}
                        onChange={(e) => {
                          setDesde(e.target.value);
                          if (e.target.value > hasta) setHasta(e.target.value);
                        }}
                        className={CAMPO}
                      />
                    </label>

                    <label className="block">
                      <span className={ETIQUETA}>Devolución</span>
                      <input
                        type="date"
                        value={hasta}
                        min={desde}
                        onChange={(e) => setHasta(e.target.value)}
                        className={CAMPO}
                      />
                    </label>
                  </div>

                  {rangoInvalido ? (
                    <p className="mt-4 text-sm text-red-600">
                      La fecha de devolución no puede ser anterior al retiro.
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-carbon-500">
                      {fechaLarga(desde)} → {fechaLarga(hasta)} ·{' '}
                      <strong className="font-medium text-carbon-900">
                        {dias} {dias === 1 ? 'día' : 'días'}
                      </strong>{' '}
                      de alquiler
                    </p>
                  )}

                  {paso === 1 && (
                    <button
                      type="button"
                      onClick={() => setPaso(2)}
                      disabled={rangoInvalido}
                      className="mt-6 w-full rounded-full bg-carbon-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-carbon-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Elegir los equipos
                    </button>
                  )}
                </section>

                {/* Paso 2 — los equipos, persona por persona */}
                {paso !== 1 && (
                  <section className="tarjeta p-6 lg:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                          <IconoPersonas className="h-5 w-5 text-marca-600" />
                          2 · Quiénes van y qué necesitan
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-carbon-500">
                          Con la altura, el peso y el talle preparamos el equipo antes de que
                          llegues: las fijaciones se ajustan a cada persona.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-5">
                      {participantes.map((participante, indice) => {
                        const categoriasDeDisciplina = rental.categorias.filter(
                          (c) => c.disciplina === participante.disciplina,
                        );
                        const categoria = categoriaPorSlug.get(participante.categoria);

                        return (
                          <div
                            key={indice}
                            className="rounded-xl2 border border-nieve-200 bg-nieve-50 p-5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-carbon-500">
                                Persona {indice + 1}
                              </h3>
                              {participantes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => quitarParticipante(indice)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-carbon-500 hover:text-red-600"
                                >
                                  <IconoCerrar className="h-3.5 w-3.5" />
                                  Quitar
                                </button>
                              )}
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <label className="block sm:col-span-2">
                                <span className={ETIQUETA}>Nombre y apellido</span>
                                <input
                                  required
                                  value={participante.nombre}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, { nombre: e.target.value })
                                  }
                                  className={CAMPO}
                                />
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Edad</span>
                                <input
                                  type="number"
                                  min={2}
                                  max={99}
                                  value={participante.edad ?? ''}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, {
                                      edad: aNumeroONulo(e.target.value),
                                    })
                                  }
                                  className={CAMPO}
                                />
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Talle de calzado</span>
                                <input
                                  value={participante.calzado}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, { calzado: e.target.value })
                                  }
                                  placeholder="42"
                                  className={CAMPO}
                                />
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Altura (cm)</span>
                                <input
                                  type="number"
                                  min={80}
                                  max={230}
                                  value={participante.altura ?? ''}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, {
                                      altura: aNumeroONulo(e.target.value),
                                    })
                                  }
                                  placeholder="175"
                                  className={CAMPO}
                                />
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Peso (kg)</span>
                                <input
                                  type="number"
                                  min={15}
                                  max={200}
                                  value={participante.peso ?? ''}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, {
                                      peso: aNumeroONulo(e.target.value),
                                    })
                                  }
                                  placeholder="75"
                                  className={CAMPO}
                                />
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Disciplina</span>
                                <select
                                  value={participante.disciplina}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, { disciplina: e.target.value })
                                  }
                                  className={CAMPO}
                                >
                                  {rental.disciplinas.map((d) => (
                                    <option key={d.slug} value={d.slug}>
                                      {d.nombre}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block">
                                <span className={ETIQUETA}>Nivel</span>
                                <select
                                  value={participante.nivel}
                                  onChange={(e) =>
                                    cambiarParticipante(indice, { nivel: e.target.value })
                                  }
                                  className={CAMPO}
                                >
                                  {rental.niveles.map((n) => (
                                    <option key={n.slug} value={n.slug}>
                                      {n.nombre}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block sm:col-span-2">
                                <span className={ETIQUETA}>Equipo</span>
                                <select
                                  value={participante.categoria}
                                  onChange={(e) =>
                                    setParticipantes((previos) =>
                                      previos.map((p, i) =>
                                        i === indice ? { ...p, categoria: e.target.value } : p,
                                      ),
                                    )
                                  }
                                  className={CAMPO}
                                >
                                  {categoriasDeDisciplina.map((c) => (
                                    <option key={c.slug} value={c.slug}>
                                      {c.nombre}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            {categoria && (
                              <p className="mt-3 text-xs leading-relaxed text-carbon-500">
                                {categoria.descripcion} Incluye: {categoria.incluye.join(', ')}.
                              </p>
                            )}

                            <fieldset className="mt-4 border-t border-nieve-200 pt-4">
                              <legend className={ETIQUETA}>Adicionales</legend>
                              <div className="flex flex-wrap gap-2">
                                {rental.adicionales.map((adicional) => {
                                  const incluido = categoria?.incluye.some(
                                    (parte) => parte.toLowerCase() === adicional.nombre.toLowerCase(),
                                  );
                                  const activo = participante.adicionales.includes(adicional.slug);
                                  return (
                                    <label
                                      key={adicional.slug}
                                      title={adicional.descripcion ?? undefined}
                                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                                        incluido
                                          ? 'cursor-default border-marca-300 bg-marca-50 text-marca-700'
                                          : activo
                                            ? 'border-carbon-900 bg-carbon-900 text-white'
                                            : 'border-nieve-200 bg-white text-carbon-700 hover:border-marca-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        disabled={incluido}
                                        checked={activo || Boolean(incluido)}
                                        onChange={() =>
                                          cambiarParticipante(indice, {
                                            adicionales: activo
                                              ? participante.adicionales.filter(
                                                  (s) => s !== adicional.slug,
                                                )
                                              : [...participante.adicionales, adicional.slug],
                                          })
                                        }
                                      />
                                      {(activo || incluido) && <IconoCheck className="h-3 w-3" />}
                                      {adicional.nombre}
                                      {incluido && ' (incluido)'}
                                    </label>
                                  );
                                })}
                              </div>
                            </fieldset>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={agregarParticipante}
                      className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-dashed border-nieve-200 px-5 py-2.5 text-sm font-medium text-carbon-700 transition-colors hover:border-marca-300 hover:text-marca-700"
                    >
                      <IconoMas className="h-4 w-4" />
                      Agregar otra persona
                    </button>

                    {paso === 2 && (
                      <button
                        type="button"
                        onClick={consultar}
                        disabled={consultando || !participantesCompletos}
                        className="mt-6 block w-full rounded-full bg-carbon-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-carbon-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {consultando ? 'Consultando…' : 'Ver disponibilidad y continuar'}
                      </button>
                    )}

                    {paso === 2 && !participantesCompletos && (
                      <p className="mt-3 text-sm text-carbon-500">
                        Completá el nombre de cada persona para seguir.
                      </p>
                    )}
                  </section>
                )}

                {/* Paso 3 — datos de contacto */}
                {paso === 3 && (
                  <section className="tarjeta p-6 lg:p-8">
                    <h2 className="text-lg font-semibold">3 · Tus datos</h2>

                    {hayBackend && disponibilidades.some((d) => d.unidadesTotales > 0) ? (
                      <ul className="mt-5 space-y-2">
                        {disponibilidades.map((disponibilidad) => {
                          const pedidas =
                            equipos.find((e) => e.categoria === disponibilidad.categoria)
                              ?.unidades ?? 0;
                          const alcanza = disponibilidad.unidadesDisponibles >= pedidas;
                          return (
                            <li
                              key={disponibilidad.categoria}
                              className={`rounded-lg px-3.5 py-2.5 text-sm ${
                                alcanza ? 'bg-marca-50 text-carbon-900' : 'bg-amber-50 text-amber-900'
                              }`}
                            >
                              <strong className="font-medium">
                                {categoriaPorSlug.get(disponibilidad.categoria)?.nombre}
                              </strong>{' '}
                              — pedís {pedidas}, hay {disponibilidad.unidadesDisponibles} para esas
                              fechas.
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm leading-relaxed text-carbon-500">
                        Dejanos tus datos y la sucursal de {sucursalActual?.ciudad} te confirma los
                        equipos disponibles y la tarifa para esas fechas.
                      </p>
                    )}

                    <form onSubmit={reservar} className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={ETIQUETA}>Nombre y apellido</span>
                        <input
                          required
                          value={cliente.nombre}
                          onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                          className={CAMPO}
                        />
                      </label>
                      <label className="block">
                        <span className={ETIQUETA}>Email</span>
                        <input
                          required
                          type="email"
                          value={cliente.email}
                          onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                          className={CAMPO}
                        />
                      </label>
                      <label className="block">
                        <span className={ETIQUETA}>Teléfono</span>
                        <input
                          required
                          value={cliente.telefono}
                          onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                          className={CAMPO}
                        />
                      </label>
                      <label className="block">
                        <span className={ETIQUETA}>Talles de ropa, horario de retiro…</span>
                        <input
                          value={cliente.comentario}
                          onChange={(e) => setCliente({ ...cliente, comentario: e.target.value })}
                          placeholder="Lo que nos sirva saber"
                          className={CAMPO}
                        />
                      </label>

                      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-carbon-700 sm:col-span-2">
                        <input
                          type="checkbox"
                          required
                          checked={acepta}
                          onChange={(e) => setAcepta(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-nieve-200 accent-marca-600"
                        />
                        Acepto las condiciones de alquiler que figuran en esta página.
                      </label>

                      {error && (
                        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">
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
                  </section>
                )}

                {error && paso !== 3 && (
                  <p className="rounded-xl2 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
                )}
              </>
            )}
          </div>

          {/* Resumen y condiciones */}
          <aside className="space-y-5 lg:sticky lg:top-32">
            <div className="tarjeta p-6">
              <h2 className="text-base font-semibold">Tu reserva</h2>

              <dl className="mt-4 space-y-2 border-b border-nieve-200 pb-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-carbon-500">Sucursal</dt>
                  <dd className="text-right font-medium">{sucursalActual?.ciudad ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-carbon-500">Fechas</dt>
                  <dd className="text-right font-medium">
                    {rangoInvalido ? '—' : `${dias} ${dias === 1 ? 'día' : 'días'}`}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-carbon-500">Personas</dt>
                  <dd className="text-right font-medium">{participantes.length}</dd>
                </div>
              </dl>

              <ul className="mt-4 space-y-2 text-sm">
                {equipos.map((equipo) => (
                  <li key={equipo.categoria} className="flex justify-between gap-3">
                    <span className="text-carbon-700">
                      {equipo.unidades}× {categoriaPorSlug.get(equipo.categoria)?.nombre}
                    </span>
                    <span className="shrink-0 text-carbon-500">
                      {formatearPrecio(categoriaPorSlug.get(equipo.categoria)?.tarifaPorDia)}
                    </span>
                  </li>
                ))}
                {adicionales.map((adicional) => (
                  <li key={adicional.slug} className="flex justify-between gap-3">
                    <span className="text-carbon-500">
                      {adicional.unidades}× {adicionalPorSlug.get(adicional.slug)?.nombre}
                    </span>
                    <span className="shrink-0 text-carbon-500">
                      {formatearPrecio(adicionalPorSlug.get(adicional.slug)?.tarifaPorDia)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-nieve-200 pt-4">
                <span className="text-sm text-carbon-500">Total estimado</span>
                <span className="text-lg font-semibold">{formatearPrecio(totalEstimado)}</span>
              </p>
              {totalEstimado == null && (
                <p className="mt-1.5 text-xs leading-relaxed text-carbon-500">
                  Las tarifas de la temporada las confirma la sucursal al responder la solicitud.
                </p>
              )}
            </div>

            <div className="tarjeta bg-marca-50 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <IconoHerramienta className="h-4 w-4 text-marca-600" />
                Siempre incluido
              </h2>
              <ul className="mt-3 space-y-2">
                {rental.incluyeSiempre.map((texto) => (
                  <li key={texto} className="flex items-start gap-2 text-sm text-carbon-700">
                    <IconoCheck className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>

            {sucursalActual && (
              <div className="tarjeta p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <IconoUbicacion className="h-4 w-4 text-marca-600" />
                  {sucursalActual.nombre}
                </h2>
                <p className="mt-2 text-sm text-carbon-500">
                  {sucursalActual.direccion
                    ? `${sucursalActual.direccion}, ${sucursalActual.ciudad}`
                    : 'Consultá la dirección por WhatsApp'}
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

            <div className="tarjeta p-6">
              <h2 className="text-base font-semibold">Condiciones</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-carbon-700">
                {rental.condiciones.map((condicion) => (
                  <li key={condicion} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-marca-500" aria-hidden="true" />
                    {condicion}
                  </li>
                ))}
              </ul>
              {rental.condicionesPendientesDeValidacion && (
                <p className="mt-4 rounded-lg bg-nieve-100 px-3 py-2.5 text-xs leading-relaxed text-carbon-500">
                  Condiciones sujetas a confirmación de la sucursal: el sitio original todavía no las
                  publica.
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Por qué pedimos cada dato */}
        <section className="mt-14 border-t border-nieve-200 pt-10">
          <h2 className="text-2xl font-bold">Por qué te pedimos estos datos</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rental.datosQuePedimos.map((dato) => (
              <div key={dato.campo} className="tarjeta p-5">
                <h3 className="text-sm font-semibold text-carbon-900">{dato.campo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-carbon-500">{dato.motivo}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
