export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={claro ? '#F7F9F8' : '#07301F'} />
        <path d="M6 24l7-12 4 6.5 2.5-4L26 24z" fill={claro ? '#07301F' : '#F7F9F8'} />
      </svg>
      <span className="leading-none">
        <span
          className={`block text-[17px] font-bold tracking-tight ${claro ? 'text-white' : 'text-tinta-900'}`}
        >
          ECO <span className="text-pino-500">&gt;</span> Eurocamping
        </span>
        <span
          className={`mt-0.5 block whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.1em] sm:text-[10px] sm:tracking-[0.16em] ${
            claro ? 'text-nieve-200' : 'text-tinta-500'
          }`}
        >
          The Outdoor Store Since 1965
        </span>
      </span>
    </span>
  );
}
