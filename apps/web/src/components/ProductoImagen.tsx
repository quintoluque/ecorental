import { iniciales, tonoDeTexto } from '@/lib/formato.ts';

type Props = {
  nombre: string;
  marca?: string | null;
  className?: string;
  grande?: boolean;
};

/**
 * El sitio original publica fotos de cada producto; hasta que se migren esos
 * archivos, cada ficha muestra un marcador generado a partir de su nombre.
 * Es estable (mismo producto, mismo color) y evita imagenes rotas.
 */
export function ProductoImagen({ nombre, marca, className = '', grande = false }: Props) {
  const tono = tonoDeTexto(marca ?? nombre);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${tono} 32% 94%), hsl(${(tono + 40) % 360} 26% 87%))`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 120"
        className="absolute inset-x-0 bottom-0 w-full"
        preserveAspectRatio="none"
      >
        <path
          d="M0 120V78l38-30 28 22 32-42 34 44 26-18 42 34v32z"
          fill={`hsl(${tono} 30% 100%)`}
          fillOpacity="0.55"
        />
        <path
          d="M0 120V96l46-24 30 18 40-30 38 32 46-20v48z"
          fill={`hsl(${(tono + 200) % 360} 40% 30%)`}
          fillOpacity="0.13"
        />
      </svg>
      <span
        className={`relative font-semibold tracking-tight ${grande ? 'text-6xl' : 'text-2xl'}`}
        style={{ color: `hsl(${(tono + 200) % 360} 45% 28%)`, opacity: 0.5 }}
      >
        {iniciales(marca ?? nombre)}
      </span>
    </div>
  );
}
