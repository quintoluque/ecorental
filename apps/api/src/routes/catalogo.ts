import { Router } from 'express';
import { db } from '../db.js';

export const rutasCatalogo = Router();

type FilaProducto = {
  id: number;
  slug: string;
  nombre: string;
  marca_slug: string | null;
  marca_nombre: string | null;
  area_slug: string | null;
  area_nombre: string | null;
  grupo_slug: string | null;
  grupo_nombre: string | null;
  descripcion: string | null;
  especificaciones: string;
  precio: number | null;
  moneda: string;
  alquilable: number;
  tipo: string | null;
  publico: string | null;
  temporada: string | null;
  deportes: string | null;
  url_original: string | null;
  stock_total: number | null;
};

function mapearProducto(fila: FilaProducto) {
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    marca: fila.marca_slug ? { slug: fila.marca_slug, nombre: fila.marca_nombre } : null,
    area: fila.area_slug ? { slug: fila.area_slug, nombre: fila.area_nombre } : null,
    grupo: fila.grupo_slug ? { slug: fila.grupo_slug, nombre: fila.grupo_nombre } : null,
    descripcion: fila.descripcion,
    especificaciones: JSON.parse(fila.especificaciones) as { nombre: string; valor: string }[],
    precio: fila.precio,
    moneda: fila.moneda,
    alquilable: fila.alquilable === 1,
    deportes: fila.deportes ? fila.deportes.split(',') : [],
    tipo: fila.tipo,
    publico: fila.publico,
    temporada: fila.temporada,
    urlOriginal: fila.url_original,
    stockTotal: fila.stock_total ?? 0,
  };
}

const SELECT_PRODUCTO = `
  SELECT p.*, m.nombre AS marca_nombre, a.nombre AS area_nombre, g.nombre AS grupo_nombre,
         (SELECT COALESCE(SUM(cantidad), 0) FROM stock s WHERE s.producto_id = p.id) AS stock_total,
         (SELECT group_concat(deporte) FROM producto_deportes d WHERE d.producto_id = p.id) AS deportes
    FROM productos p
    LEFT JOIN marcas m ON m.slug = p.marca_slug
    LEFT JOIN areas  a ON a.slug = p.area_slug
    LEFT JOIN grupos g ON g.slug = p.grupo_slug`;

/** Datos de referencia que el frontend necesita para armar la navegacion. */
rutasCatalogo.get('/referencias', (_req, res) => {
  const areas = db.prepare('SELECT * FROM areas ORDER BY orden').all();
  const grupos = db.prepare('SELECT * FROM grupos ORDER BY nombre').all();
  const marcas = db.prepare('SELECT * FROM marcas ORDER BY nombre').all();
  res.json({ areas, grupos, marcas });
});

/** Los rubros multiples llegan como lista separada por coma. */
function aLista(valor: string | undefined): string[] {
  return (valor ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

rutasCatalogo.get('/productos', (req, res) => {
  const { area, grupo, marca, deporte, tipo, publico, temporada, q, alquilable, sucursal } =
    req.query as Record<string, string>;

  const limite = Math.min(Number(req.query.limite ?? 48) || 48, 200);
  const pagina = Math.max(Number(req.query.pagina ?? 1) || 1, 1);

  const condiciones: string[] = ['p.activo = 1'];
  const valores: (string | number)[] = [];

  if (area) {
    condiciones.push('p.area_slug = ?');
    valores.push(area);
  }

  // Dentro de un rubro los valores suman (OR); entre rubros se acumulan (AND).
  const enColumna = (columna: string, lista: string[]) => {
    if (lista.length === 0) return;
    condiciones.push(`${columna} IN (${lista.map(() => '?').join(', ')})`);
    valores.push(...lista);
  };

  enColumna('p.grupo_slug', aLista(grupo));
  enColumna('p.marca_slug', aLista(marca));
  enColumna('p.tipo', aLista(tipo));
  enColumna('p.publico', aLista(publico));
  enColumna('p.temporada', aLista(temporada));

  const deportes = aLista(deporte);
  if (deportes.length > 0) {
    condiciones.push(
      `EXISTS (SELECT 1 FROM producto_deportes d
                WHERE d.producto_id = p.id
                  AND d.deporte IN (${deportes.map(() => '?').join(', ')}))`,
    );
    valores.push(...deportes);
  }

  // Un producto sin precio publicado no puede entrar en un rango de precios.
  const precioMin = Number(req.query.precioMin);
  const precioMax = Number(req.query.precioMax);
  if (Number.isFinite(precioMin)) {
    condiciones.push('p.precio IS NOT NULL AND p.precio >= ?');
    valores.push(precioMin);
  }
  if (Number.isFinite(precioMax)) {
    condiciones.push('p.precio IS NOT NULL AND p.precio <= ?');
    valores.push(precioMax);
  }

  if (alquilable === 'true') condiciones.push('p.alquilable = 1');
  if (q) {
    condiciones.push('(LOWER(p.nombre) LIKE ? OR LOWER(COALESCE(p.descripcion, "")) LIKE ?)');
    const patron = `%${q.toLowerCase()}%`;
    valores.push(patron, patron);
  }
  if (sucursal) {
    condiciones.push(
      'EXISTS (SELECT 1 FROM stock s WHERE s.producto_id = p.id AND s.sucursal_slug = ? AND s.cantidad > 0)',
    );
    valores.push(sucursal);
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`;

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM productos p ${donde}`)
    .get(...valores) as { total: number };

  const orden =
    { nombre: 'p.nombre ASC', 'precio-asc': 'p.precio ASC', 'precio-desc': 'p.precio DESC' }[
      String(req.query.orden ?? '')
    ] ?? 'p.nombre ASC';

  const filas = db
    .prepare(`${SELECT_PRODUCTO} ${donde} ORDER BY ${orden} LIMIT ? OFFSET ?`)
    .all(...valores, limite, (pagina - 1) * limite) as unknown as FilaProducto[];

  res.json({
    total,
    pagina,
    limite,
    paginas: Math.max(1, Math.ceil(total / limite)),
    productos: filas.map(mapearProducto),
  });
});

rutasCatalogo.get('/productos/:slug', (req, res) => {
  const fila = db.prepare(`${SELECT_PRODUCTO} WHERE p.slug = ?`).get(req.params.slug) as
    | FilaProducto
    | undefined;

  if (!fila) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }

  const stock = db
    .prepare(
      `SELECT s.sucursal_slug, su.nombre AS sucursal_nombre, su.ciudad, s.talle, s.cantidad
         FROM stock s
         JOIN sucursales su ON su.slug = s.sucursal_slug
        WHERE s.producto_id = ?
        ORDER BY su.nombre`,
    )
    .all(fila.id);

  res.json({ ...mapearProducto(fila), stock });
});

rutasCatalogo.get('/sucursales', (_req, res) => {
  const filas = db
    .prepare('SELECT * FROM sucursales ORDER BY casa_central DESC, nombre')
    .all() as unknown as Record<string, unknown>[];

  res.json(
    filas.map((f) => ({
      ...f,
      horarios: JSON.parse(String(f.horarios)),
      servicios: JSON.parse(String(f.servicios)),
      casa_central: f.casa_central === 1,
    })),
  );
});
