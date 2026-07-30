import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Producto } from './tipos.ts';

export type ItemCarrito = {
  productoId: number;
  slug: string;
  nombre: string;
  marca: string | null;
  precio: number | null;
  talle: string;
  cantidad: number;
};

type EstadoCarrito = {
  items: ItemCarrito[];
  cantidadTotal: number;
  total: number | null;
  agregar: (producto: Producto, talle?: string, cantidad?: number) => void;
  quitar: (productoId: number, talle: string) => void;
  cambiarCantidad: (productoId: number, talle: string, cantidad: number) => void;
  vaciar: () => void;
};

const CLAVE = 'eco.carrito.v1';
const ContextoCarrito = createContext<EstadoCarrito | null>(null);

function leerAlmacenado(): ItemCarrito[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

export function ProveedorCarrito({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>(leerAlmacenado);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch {
      // Sin almacenamiento disponible el carrito vive solo en memoria.
    }
  }, [items]);

  const agregar = useCallback((producto: Producto, talle = 'UNICO', cantidad = 1) => {
    setItems((previos) => {
      const indice = previos.findIndex(
        (i) => i.productoId === producto.id && i.talle === talle,
      );
      if (indice >= 0) {
        const copia = previos.slice();
        const existente = copia[indice]!;
        copia[indice] = { ...existente, cantidad: existente.cantidad + cantidad };
        return copia;
      }
      return [
        ...previos,
        {
          productoId: producto.id,
          slug: producto.slug,
          nombre: producto.nombre,
          marca: producto.marca,
          precio: producto.precio,
          talle,
          cantidad,
        },
      ];
    });
  }, []);

  const quitar = useCallback((productoId: number, talle: string) => {
    setItems((previos) => previos.filter((i) => !(i.productoId === productoId && i.talle === talle)));
  }, []);

  const cambiarCantidad = useCallback((productoId: number, talle: string, cantidad: number) => {
    setItems((previos) =>
      previos.flatMap((i) =>
        i.productoId === productoId && i.talle === talle
          ? cantidad > 0
            ? [{ ...i, cantidad }]
            : []
          : [i],
      ),
    );
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const valor = useMemo<EstadoCarrito>(() => {
    const cantidadTotal = items.reduce((suma, i) => suma + i.cantidad, 0);
    // Si algun item no tiene precio publicado el total no se puede cerrar:
    // el pedido pasa a "a confirmar" y lo cotiza la sucursal.
    const total = items.every((i) => i.precio != null)
      ? items.reduce((suma, i) => suma + (i.precio ?? 0) * i.cantidad, 0)
      : null;

    return { items, cantidadTotal, total, agregar, quitar, cambiarCantidad, vaciar };
  }, [items, agregar, quitar, cambiarCantidad, vaciar]);

  return <ContextoCarrito.Provider value={valor}>{children}</ContextoCarrito.Provider>;
}

export function useCarrito(): EstadoCarrito {
  const contexto = useContext(ContextoCarrito);
  if (!contexto) throw new Error('useCarrito debe usarse dentro de ProveedorCarrito');
  return contexto;
}
