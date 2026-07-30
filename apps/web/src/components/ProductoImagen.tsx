import { useState } from 'react';
import { rutaFoto } from '@/lib/formato.ts';
import { iniciales } from '@/lib/formato.ts';

type Props = {
  nombre: string;
  marca?: string | null;
  /** Rutas relativas a public/, p. ej. 'fotos/productos/x.jpg'. */
  imagenes?: string[];
  className?: string;
  grande?: boolean;
};

/**
 * Muestra la foto del producto cuando esta cargada. Mientras no lo este —o si
 * el archivo falta— dibuja un marcador con el isotipo de ECO, para que la
 * grilla nunca quede con imagenes rotas.
 */
export function ProductoImagen({
  nombre,
  marca,
  imagenes = [],
  className = '',
  grande = false,
}: Props) {
  const [fallo, setFallo] = useState(false);
  const foto = imagenes[0];

  if (foto && !fallo) {
    return (
      <img
        src={rutaFoto(foto)}
        alt={nombre}
        loading="lazy"
        decoding="async"
        onError={() => setFallo(true)}
        className={`bg-nieve-100 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-nieve-100 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 120"
        className="absolute inset-x-0 bottom-0 w-full"
        preserveAspectRatio="none"
      >
        <path d="M0 120V78l38-30 28 22 32-42 34 44 26-18 42 34v32z" fill="#e2ded7" />
        <path d="M0 120V96l46-24 30 18 40-30 38 32 46-20v48z" fill="#d4cec4" />
      </svg>

      <span
        className={`relative font-extrabold italic tracking-tight text-marca-500/70 ${
          grande ? 'text-6xl' : 'text-2xl'
        }`}
      >
        {iniciales(marca ?? nombre)}
      </span>
    </div>
  );
}
