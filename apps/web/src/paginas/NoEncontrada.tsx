import { Link } from 'react-router-dom';

export function NoEncontrada() {
  return (
    <div className="contenedor py-28 text-center">
      <p className="text-6xl font-bold text-marca-300">404</p>
      <h1 className="mt-4 text-3xl font-bold">Esta página no existe</h1>
      <p className="mt-3 text-carbon-500">
        Puede que el enlace haya cambiado. Probá desde el catálogo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-carbon-900 px-6 py-3 text-sm font-semibold text-white hover:bg-carbon-700"
        >
          Volver al inicio
        </Link>
        <Link
          to="/productos"
          className="rounded-full border border-nieve-200 px-6 py-3 text-sm font-medium text-carbon-700 hover:border-marca-300 hover:text-marca-700"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
