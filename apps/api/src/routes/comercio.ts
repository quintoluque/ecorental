import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { generarCodigo } from '../lib/disponibilidad.js';

export const rutasComercio = Router();

const nuevoPedido = z.object({
  cliente: z.object({
    nombre: z.string().min(2),
    email: z.email(),
    telefono: z.string().min(6),
    documento: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        productoId: z.number().int(),
        talle: z.string().default('UNICO'),
        cantidad: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
  entrega: z.enum(['retiro', 'envio']).default('retiro'),
  sucursal: z.string().optional(),
  direccionEnvio: z.string().optional(),
});

rutasComercio.post('/pedidos', (req, res) => {
  const parseo = nuevoPedido.safeParse(req.body);
  if (!parseo.success) {
    res.status(400).json({ error: 'Datos invalidos', detalle: parseo.error.issues });
    return;
  }

  const { cliente, items, entrega, sucursal, direccionEnvio } = parseo.data;

  if (entrega === 'retiro' && !sucursal) {
    res.status(400).json({ error: 'Elegi una sucursal para retirar el pedido' });
    return;
  }
  if (entrega === 'envio' && !direccionEnvio) {
    res.status(400).json({ error: 'Indica la direccion de envio' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const itemsResueltos = items.map((item) => {
      const producto = db
        .prepare('SELECT id, nombre, precio, moneda FROM productos WHERE id = ? AND activo = 1')
        .get(item.productoId) as
        | { id: number; nombre: string; precio: number | null; moneda: string }
        | undefined;

      if (!producto) throw Object.assign(new Error(`Producto ${item.productoId} inexistente`), { status: 400 });

      return {
        ...item,
        nombre: producto.nombre,
        precioUnitario: producto.precio,
        moneda: producto.moneda,
        subtotal: producto.precio != null ? producto.precio * item.cantidad : null,
      };
    });

    // Si algun producto todavia no tiene precio publicado, el pedido queda como
    // consulta a confirmar por el local en lugar de cerrar un total incorrecto.
    const total = itemsResueltos.every((i) => i.subtotal != null)
      ? itemsResueltos.reduce((suma, i) => suma + (i.subtotal ?? 0), 0)
      : null;

    const codigo = generarCodigo('P');
    db.prepare(
      `INSERT INTO pedidos (codigo, cliente, items, total, entrega, sucursal_slug, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      codigo,
      JSON.stringify({ ...cliente, direccionEnvio: direccionEnvio ?? null }),
      JSON.stringify(itemsResueltos),
      total,
      entrega,
      sucursal ?? null,
      total == null ? 'a-confirmar' : 'pendiente',
    );

    db.exec('COMMIT');
    res.status(201).json({ codigo, total, estado: total == null ? 'a-confirmar' : 'pendiente' });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

rutasComercio.get('/pedidos/:codigo', (req, res) => {
  const fila = db.prepare('SELECT * FROM pedidos WHERE codigo = ?').get(req.params.codigo) as
    | Record<string, unknown>
    | undefined;

  if (!fila) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  res.json({
    ...fila,
    cliente: JSON.parse(String(fila.cliente)),
    items: JSON.parse(String(fila.items)),
  });
});

const nuevaConsulta = z.object({
  nombre: z.string().min(2),
  email: z.email(),
  telefono: z.string().optional(),
  asunto: z.string().max(200).optional(),
  mensaje: z.string().min(5).max(4000),
});

rutasComercio.post('/contacto', (req, res) => {
  const parseo = nuevaConsulta.safeParse(req.body);
  if (!parseo.success) {
    res.status(400).json({ error: 'Datos invalidos', detalle: parseo.error.issues });
    return;
  }

  const { nombre, email, telefono, asunto, mensaje } = parseo.data;
  db.prepare(
    'INSERT INTO consultas (nombre, email, telefono, asunto, mensaje) VALUES (?, ?, ?, ?, ?)',
  ).run(nombre, email, telefono ?? null, asunto ?? null, mensaje);

  res.status(201).json({ ok: true, mensaje: 'Recibimos tu consulta. Te respondemos a la brevedad.' });
});

/** Resumen operativo: lo que ECO necesita ver de un vistazo cada manana. */
rutasComercio.get('/resumen', (_req, res) => {
  const contar = (sql: string) => (db.prepare(sql).get() as { n: number }).n;

  res.json({
    productos: contar('SELECT COUNT(*) AS n FROM productos WHERE activo = 1'),
    sucursales: contar('SELECT COUNT(*) AS n FROM sucursales'),
    marcas: contar('SELECT COUNT(*) AS n FROM marcas'),
    reservasPendientes: contar("SELECT COUNT(*) AS n FROM rental_reservas WHERE estado = 'pendiente'"),
    pedidosPendientes: contar("SELECT COUNT(*) AS n FROM pedidos WHERE estado IN ('pendiente','a-confirmar')"),
    consultasSinResponder: contar('SELECT COUNT(*) AS n FROM consultas'),
    unidadesRental: contar('SELECT COALESCE(SUM(unidades), 0) AS n FROM rental_inventario'),
  });
});
