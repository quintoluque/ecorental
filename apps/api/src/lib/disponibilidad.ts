import { db } from '../db.js';
import { cantidadDias, diasDelRango } from './fechas.js';

export type Disponibilidad = {
  categoria: string;
  sucursal: string;
  desde: string;
  hasta: string;
  unidadesTotales: number;
  unidadesDisponibles: number;
  dias: number;
  disponible: boolean;
  detallePorDia: { fecha: string; disponibles: number }[];
};

type FilaReserva = { desde: string; hasta: string; unidades: number };

const ESTADOS_QUE_OCUPAN = ['pendiente', 'confirmada', 'entregada'];

/**
 * Cuantas unidades quedan libres de una categoria en una sucursal para un rango.
 *
 * Se calcula dia por dia y se toma el peor dia: una reserva que solapa solo
 * parcialmente no debe bloquear todo el rango, pero el dia mas cargado es el
 * que limita cuantos equipos podemos comprometer.
 */
export function calcularDisponibilidad(
  categoria: string,
  sucursal: string,
  desde: string,
  hasta: string,
): Disponibilidad {
  const inventario = db
    .prepare('SELECT unidades FROM rental_inventario WHERE categoria_slug = ? AND sucursal_slug = ?')
    .get(categoria, sucursal) as { unidades: number } | undefined;

  const unidadesTotales = inventario?.unidades ?? 0;

  const marcadores = ESTADOS_QUE_OCUPAN.map(() => '?').join(', ');
  const reservas = db
    .prepare(
      `SELECT desde, hasta, unidades
         FROM rental_reservas
        WHERE categoria_slug = ?
          AND sucursal_slug = ?
          AND estado IN (${marcadores})
          AND desde <= ?
          AND hasta >= ?`,
    )
    .all(categoria, sucursal, ...ESTADOS_QUE_OCUPAN, hasta, desde) as unknown as FilaReserva[];

  const ocupadasPorDia = new Map<string, number>();
  for (const reserva of reservas) {
    for (const dia of diasDelRango(reserva.desde, reserva.hasta)) {
      ocupadasPorDia.set(dia, (ocupadasPorDia.get(dia) ?? 0) + reserva.unidades);
    }
  }

  const detallePorDia = diasDelRango(desde, hasta).map((fecha) => ({
    fecha,
    disponibles: Math.max(0, unidadesTotales - (ocupadasPorDia.get(fecha) ?? 0)),
  }));

  const unidadesDisponibles = detallePorDia.length
    ? Math.min(...detallePorDia.map((d) => d.disponibles))
    : unidadesTotales;

  return {
    categoria,
    sucursal,
    desde,
    hasta,
    unidadesTotales,
    unidadesDisponibles,
    dias: cantidadDias(desde, hasta),
    disponible: unidadesDisponibles > 0,
    detallePorDia,
  };
}

/** Genera un codigo legible para que el cliente cite su reserva o pedido. */
export function generarCodigo(prefijo: string): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let cuerpo = '';
  for (let i = 0; i < 6; i++) {
    cuerpo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `${prefijo}-${cuerpo}`;
}
