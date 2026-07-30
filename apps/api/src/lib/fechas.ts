/** Utilidades de fechas para el alquiler. Todo se maneja como 'YYYY-MM-DD'. */

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaValida(valor: string): boolean {
  if (!FORMATO.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

export function aDia(valor: string): number {
  return Math.floor(new Date(`${valor}T00:00:00Z`).getTime() / 86_400_000);
}

export function desdeDia(dia: number): string {
  return new Date(dia * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Dias de alquiler facturables entre dos fechas inclusive.
 * Retirar y devolver el mismo dia cuenta como 1 dia.
 */
export function cantidadDias(desde: string, hasta: string): number {
  return aDia(hasta) - aDia(desde) + 1;
}

/** Lista de dias 'YYYY-MM-DD' cubiertos por el rango, inclusive. */
export function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let d = aDia(desde); d <= aDia(hasta); d++) dias.push(desdeDia(d));
  return dias;
}
