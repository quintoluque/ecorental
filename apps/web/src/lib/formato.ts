const formateadorARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/**
 * El sitio original no publica precios en todos los productos. Cuando el dato
 * no existe mostramos "Consultar" en vez de inventar un valor.
 */
export function precio(valor: number | null | undefined): string {
  if (valor == null) return 'Consultar';
  return formateadorARS.format(valor);
}

export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function sumarDias(fechaISO: string, dias: number): string {
  return new Date(Date.parse(`${fechaISO}T00:00:00Z`) + dias * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function fechaLarga(fechaISO: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${fechaISO}T12:00:00Z`));
}

/** Iniciales de marca usadas en el marcador visual de cada producto. */
export function iniciales(texto: string): string {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Tono estable por texto, para que cada producto conserve siempre su color. */
export function tonoDeTexto(texto: string): number {
  let acumulado = 0;
  for (let i = 0; i < texto.length; i++) acumulado = (acumulado * 31 + texto.charCodeAt(i)) % 360;
  return acumulado;
}
