/*
 * Reconstruccion vectorial del logotipo oficial de ECO > Eurocamping.
 *
 * Todo el dibujo vive en un unico sistema de coordenadas para que el isotipo
 * suelto (la "O") y el logotipo completo sean literalmente la misma pieza:
 *
 *   - "ECO" se traza con altura de mayuscula 240 y se inclina con skewX(-13),
 *     que es la cursiva del original.
 *   - "eurocamping.com.ar" se dibuja aparte con altura de x 100 y trazo 28, y
 *     se reduce a escala 0.465 para que quede a la medida de "ECO".
 *   - La bajada va en versalitas serif, con textLength fijo para que ocupe
 *     siempre el mismo ancho aunque cambie la tipografia del sistema.
 */

const NARANJA = 'var(--color-marca-500)';
const HUECO = 'var(--color-carbon-900)';

/** Caja de la "O" dentro del logotipo completo. */
const O_X = 673;
const O_ANCHO = 307;
const O_ALTO = 240;

type PropsColor = {
  className?: string;
  /** Color de los recortes (montana y sol). Por defecto, el carbon de marca. */
  hueco?: string;
};

/** Montana y sol recortados en la "O", en coordenadas locales de la letra. */
function RecorteMontana({ hueco }: { hueco: string }) {
  return (
    <>
      <path d="M9 181 186 37 262 186 190 106Z" fill={hueco} />
      <ellipse cx="135" cy="156" rx="24" ry="19" fill={hueco} transform="rotate(-25 135 156)" />
    </>
  );
}

/**
 * Isotipo de ECO: la "O" del logotipo, con su misma cursiva y su mismo pico de
 * montana. Es la marca que se usa suelta (pestana del navegador, encabezado).
 * La caja es la de la letra inclinada, asi que es mas ancha que alta.
 */
export function Isotipo({ className = 'h-8 w-12', hueco = HUECO }: PropsColor) {
  return (
    <svg viewBox="0 0 363 240" className={className} aria-hidden="true">
      <g transform="translate(56 0) skewX(-13)">
        <rect width={O_ANCHO} height={O_ALTO} rx="88" fill={NARANJA} />
        <RecorteMontana hueco={hueco} />
      </g>
    </svg>
  );
}

/*
 * "eurocamping.com.ar": cada letra se dibuja con trazo uniforme sobre una
 * altura de x de 100 unidades, con la linea de base en y = 0. `avance` es el
 * ancho que ocupa la letra antes de la siguiente.
 */
type Glifo = {
  avance: number;
  trazos?: string[];
  /** Puntos macizos (el de la "i" y los de ".com.ar"): [cx, cy, r]. */
  puntos?: [number, number, number][];
};

const GLIFOS: Record<string, Glifo> = {
  e: {
    avance: 112,
    trazos: ['M84 -51V-73A13 13 0 0 0 71 -86H27A13 13 0 0 0 14 -73V-27A13 13 0 0 0 27 -14H84', 'M14 -51H84'],
  },
  u: { avance: 112, trazos: ['M14 -86V-27A13 13 0 0 0 27 -14H71A13 13 0 0 0 84 -27V-86'] },
  r: { avance: 78, trazos: ['M14 0V-73A13 13 0 0 1 27 -86H60'] },
  o: {
    avance: 112,
    trazos: ['M27 -86H71A13 13 0 0 1 84 -73V-27A13 13 0 0 1 71 -14H27A13 13 0 0 1 14 -27V-73A13 13 0 0 1 27 -86Z'],
  },
  c: { avance: 108, trazos: ['M80 -86H27A13 13 0 0 0 14 -73V-27A13 13 0 0 0 27 -14H80'] },
  a: {
    avance: 110,
    trazos: ['M84 -86H27A13 13 0 0 0 14 -73V-27A13 13 0 0 0 27 -14H84', 'M84 -86V0'],
  },
  m: {
    avance: 170,
    trazos: [
      'M14 0V-73A13 13 0 0 1 27 -86H58A13 13 0 0 1 71 -73V0',
      'M71 -73A13 13 0 0 1 84 -86H115A13 13 0 0 1 128 -73V0',
    ],
  },
  p: { avance: 112, trazos: ['M14 40V-73A13 13 0 0 1 27 -86H71A13 13 0 0 1 84 -73V-27A13 13 0 0 1 71 -14H14'] },
  i: { avance: 48, trazos: ['M24 0V-86'], puntos: [[24, -108, 13]] },
  n: { avance: 112, trazos: ['M14 0V-73A13 13 0 0 1 27 -86H71A13 13 0 0 1 84 -73V0'] },
  g: {
    avance: 112,
    trazos: [
      'M84 -86H27A13 13 0 0 0 14 -73V-27A13 13 0 0 0 27 -14H84',
      'M84 -86V27A13 13 0 0 1 71 40H27A13 13 0 0 1 14 27',
    ],
  },
  '.': { avance: 48, puntos: [[24, -14, 14]] },
};

const DOMINIO = 'eurocamping.com.ar';

function Dominio() {
  let x = 0;
  const letras = [...DOMINIO].map((letra, indice) => {
    const glifo = GLIFOS[letra];
    const izquierda = x;
    x += glifo.avance;
    return (
      <g key={`${letra}-${indice}`} transform={`translate(${izquierda} 0)`}>
        {glifo.trazos?.map((trazo) => (
          <path key={trazo} d={trazo} />
        ))}
        {glifo.puntos?.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={NARANJA} stroke="none" />
        ))}
      </g>
    );
  });

  return (
    <g
      transform="translate(4 308) scale(0.465) skewX(-13)"
      fill="none"
      stroke={NARANJA}
      strokeWidth="28"
      strokeLinecap="butt"
    >
      {letras}
    </g>
  );
}

type PropsLogotipo = PropsColor & {
  /** Agrega "The Outdoor Store Since 1965" en versalitas, como el original. */
  conBajada?: boolean;
};

/**
 * Logotipo completo, tal cual el original: "ECO" en cursiva, el dominio debajo
 * y (opcionalmente) la bajada en versalitas.
 */
export function Logotipo({ className = 'w-72', conBajada = false, hueco = HUECO }: PropsLogotipo) {
  const etiqueta = conBajada
    ? 'ECO eurocamping.com.ar · The Outdoor Store Since 1965'
    : 'ECO eurocamping.com.ar';

  return (
    <svg
      viewBox={`0 0 1000 ${conBajada ? 390 : 335}`}
      className={className}
      role="img"
      aria-label={etiqueta}
    >
      <g transform="translate(0 8) skewX(-13)">
        {/* E */}
        <path
          d="M380 26.5H151.5a30 30 0 0 0-30 30v127a30 30 0 0 0 30 30H380"
          fill="none"
          stroke={NARANJA}
          strokeWidth="53"
        />
        <path d="M121.5 120H330" fill="none" stroke={NARANJA} strokeWidth="53" />
        {/* C */}
        <path
          d="M621 88V70A70 70 0 0 0 551 0H456A70 70 0 0 0 386 70V170A70 70 0 0 0 456 240H551A70 70 0 0 0 621 170V152H568V165A22 22 0 0 1 546 187H461A22 22 0 0 1 439 165V75A22 22 0 0 1 461 53H546A22 22 0 0 1 568 75V88Z"
          fill={NARANJA}
        />
        {/* O */}
        <g transform={`translate(${O_X} 0)`}>
          <rect width={O_ANCHO} height={O_ALTO} rx="88" fill={NARANJA} />
          <RecorteMontana hueco={hueco} />
        </g>
      </g>

      <Dominio />

      {conBajada && (
        <text
          x="10"
          y="373"
          fontSize="50"
          textLength="865"
          lengthAdjust="spacing"
          fill={NARANJA}
          style={{ fontFamily: 'var(--font-serif)', fontVariantCaps: 'small-caps' }}
        >
          The Outdoor Store Since 1965
        </text>
      )}
    </svg>
  );
}

/**
 * Marca en linea para barras angostas: el isotipo con el nombre al lado. El
 * logotipo apilado no se lee a la altura de un encabezado, por eso aca el
 * dominio va en texto y a mayor tamano relativo que en el original.
 */
export function Logo({ claro = false }: { /** Sobre fondo oscuro. */ claro?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Isotipo className="h-8 w-12 shrink-0" />

      <span
        className={`text-[19px] leading-none font-extrabold italic tracking-tight ${
          claro ? 'text-white' : 'text-carbon-900'
        }`}
      >
        ECO
        <span className="ml-1.5 text-[13px] font-bold not-italic tracking-normal text-marca-500">
          eurocamping.com.ar
        </span>
      </span>
    </span>
  );
}
