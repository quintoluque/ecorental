import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { calcularDisponibilidad, generarCodigo } from '../lib/disponibilidad.js';
import { cantidadDias, esFechaValida } from '../lib/fechas.js';

export const rutasRental = Router();

const fecha = z.string().refine(esFechaValida, 'Formato de fecha esperado: YYYY-MM-DD');

rutasRental.get('/categorias', (_req, res) => {
  const filas = db
    .prepare('SELECT * FROM rental_categorias ORDER BY nombre')
    .all() as unknown as Record<string, unknown>[];

  res.json(
    filas.map((f) => ({
      ...f,
      incluye: JSON.parse(String(f.incluye)),
      sucursales: db
        .prepare(
          `SELECT i.sucursal_slug, s.nombre, s.ciudad, i.unidades
             FROM rental_inventario i
             JOIN sucursales s ON s.slug = i.sucursal_slug
            WHERE i.categoria_slug = ?
            ORDER BY s.nombre`,
        )
        .all(String(f.slug)),
    })),
  );
});

const consultaDisponibilidad = z
  .object({
    categoria: z.string().min(1),
    sucursal: z.string().min(1),
    desde: fecha,
    hasta: fecha,
  })
  .refine((v) => v.desde <= v.hasta, {
    message: 'La fecha de devolucion no puede ser anterior al retiro',
    path: ['hasta'],
  });

rutasRental.get('/disponibilidad', (req, res) => {
  const parseo = consultaDisponibilidad.safeParse(req.query);
  if (!parseo.success) {
    res.status(400).json({ error: 'Parametros invalidos', detalle: parseo.error.issues });
    return;
  }

  const { categoria, sucursal, desde, hasta } = parseo.data;
  const disponibilidad = calcularDisponibilidad(categoria, sucursal, desde, hasta);

  const tarifa = db
    .prepare('SELECT tarifa_por_dia, moneda FROM rental_categorias WHERE slug = ?')
    .get(categoria) as { tarifa_por_dia: number | null; moneda: string } | undefined;

  res.json({
    ...disponibilidad,
    tarifaPorDia: tarifa?.tarifa_por_dia ?? null,
    moneda: tarifa?.moneda ?? 'ARS',
    totalEstimado:
      tarifa?.tarifa_por_dia != null ? tarifa.tarifa_por_dia * disponibilidad.dias : null,
  });
});

const nuevaReserva = z
  .object({
    categoria: z.string().min(1),
    sucursal: z.string().min(1),
    desde: fecha,
    hasta: fecha,
    unidades: z.number().int().min(1).max(20).default(1),
    cliente: z.object({
      nombre: z.string().min(2),
      email: z.email(),
      telefono: z.string().min(6),
      comentario: z.string().max(1000).optional(),
    }),
  })
  .refine((v) => v.desde <= v.hasta, {
    message: 'La fecha de devolucion no puede ser anterior al retiro',
    path: ['hasta'],
  });

rutasRental.post('/reservas', (req, res) => {
  const parseo = nuevaReserva.safeParse(req.body);
  if (!parseo.success) {
    res.status(400).json({ error: 'Datos invalidos', detalle: parseo.error.issues });
    return;
  }

  const { categoria, sucursal, desde, hasta, unidades, cliente } = parseo.data;

  // Verificacion y alta en una sola transaccion: sin esto dos clientes pueden
  // reservar el ultimo equipo al mismo tiempo.
  db.exec('BEGIN IMMEDIATE');
  try {
    const disponibilidad = calcularDisponibilidad(categoria, sucursal, desde, hasta);

    if (disponibilidad.unidadesTotales === 0) {
      db.exec('ROLLBACK');
      res.status(409).json({
        error: 'Sin parque de equipos cargado',
        mensaje:
          'Esta sucursal todavia no tiene unidades cargadas para esta categoria. Escribinos y lo resolvemos por WhatsApp.',
        disponibilidad,
      });
      return;
    }

    if (disponibilidad.unidadesDisponibles < unidades) {
      db.exec('ROLLBACK');
      res.status(409).json({
        error: 'Sin disponibilidad',
        mensaje:
          disponibilidad.unidadesDisponibles === 1
            ? 'Queda 1 equipo para ese rango de fechas.'
            : `Quedan ${disponibilidad.unidadesDisponibles} equipos para ese rango de fechas.`,
        disponibilidad,
      });
      return;
    }

    const tarifa = db
      .prepare('SELECT tarifa_por_dia FROM rental_categorias WHERE slug = ?')
      .get(categoria) as { tarifa_por_dia: number | null } | undefined;

    const total =
      tarifa?.tarifa_por_dia != null
        ? tarifa.tarifa_por_dia * cantidadDias(desde, hasta) * unidades
        : null;

    const codigo = generarCodigo('R');
    db.prepare(
      `INSERT INTO rental_reservas
         (codigo, categoria_slug, sucursal_slug, desde, hasta, unidades, cliente, estado, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
    ).run(codigo, categoria, sucursal, desde, hasta, unidades, JSON.stringify(cliente), total);

    db.exec('COMMIT');
    res.status(201).json({ codigo, estado: 'pendiente', desde, hasta, unidades, total });
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

rutasRental.get('/reservas/:codigo', (req, res) => {
  const fila = db
    .prepare('SELECT * FROM rental_reservas WHERE codigo = ?')
    .get(req.params.codigo) as Record<string, unknown> | undefined;

  if (!fila) {
    res.status(404).json({ error: 'Reserva no encontrada' });
    return;
  }

  res.json({ ...fila, cliente: JSON.parse(String(fila.cliente)) });
});
