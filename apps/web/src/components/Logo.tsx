type Props = {
  /** Sobre fondo oscuro. */
  claro?: boolean;
  /** Muestra la bajada en versalitas (pie de pagina, portadas). */
  conBajada?: boolean;
};

/**
 * Isotipo de ECO: la contraforma de la "O" con el pico de montana y el sol,
 * tal como aparece en el logotipo oficial.
 */
export function Isotipo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--color-marca-500)" />
      <path
        d="M6.5 29.5 20 12.2l13.5 17.3-8.1 0L20 22.3l-5.4 7.2z"
        fill="var(--color-carbon-900)"
      />
      <ellipse cx="14.6" cy="24.6" rx="3.1" ry="2.5" fill="var(--color-carbon-900)" />
    </svg>
  );
}

export function Logo({ claro = false, conBajada = false }: Props) {
  return (
    <span className="flex items-center gap-2.5">
      <Isotipo className="h-9 w-9 shrink-0" />

      <span className="leading-none">
        <span
          className={`block text-[19px] font-extrabold italic tracking-tight ${
            claro ? 'text-white' : 'text-carbon-900'
          }`}
        >
          ECO
          <span className="ml-1.5 text-[13px] font-bold not-italic tracking-normal text-marca-500">
            eurocamping.com.ar
          </span>
        </span>

        {conBajada && (
          <span
            className={`versalitas mt-1 block whitespace-nowrap text-[10px] ${
              claro ? 'text-marca-300' : 'text-marca-700'
            }`}
          >
            The Outdoor Store Since 1965
          </span>
        )}
      </span>
    </span>
  );
}
