import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { calcularDisponibilidad, generarCodigo } from '../lib/disponibilidad.js';
import { cantidadDias, esFechaValida } from '../lib/fechas.js';

export const rutasRental = Router();

const fecha = z.string().refine(esFechaValida, 'Formato de fecha esperado: YYYY-MM-DD');

rutasRental.get('/categorias', (_req, res) => {
  const filas = db
    .prepare('SELECT * FROM rental_categorias ORDER BY orden, nombre')
    .all() as unknown as Record<string, unknown>[];

  res.json(
    filas.map((f) => ({
      ...f,
      tarifaPorDia: f.tarifa_por_dia ?? null,
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

/** Casco, antiparras, ropa: lo que se suma al equipo completo. */
rutasRental.get('/adicionales', (_req, res) => {
  const filas = db
    .prepare('SELECT * FROM rental_adicionales ORDER BY orden, nombre')
    .all() as unknown as Record<string, unknown>[];

  res.json(filas.map((f) => ({ ...f, tarifaPorDia: f.tarifa_por_dia ?? null })));
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

const equipo = z.object({
  categoria: z.string().min(1),
  unidades: z.number().int().min(1).max(20),
});

const participante = z.object({
  nombre: z.string().min(1).max(120),
  edad: z.number().int().min(1).max(110).nullable().optional(),
  altura: z.number().int().min(50).max(250).nullable().optional(),
  peso: z.number().min(10).max(250).nullable().optional(),
  calzado: z.string().max(10).optional(),
  nivel: z.string().max(30).optional(),
  disciplina: z.string().max(30).optional(),
  categoria: z.string().max(60).optional(),
  adicionales: z.array(z.string().max(60)).max(10).optional(),
});

const nuevaReserva = z
  .object({
    sucursal: z.string().min(1),
    desde: fecha,
    hasta: fecha,
    // Forma nueva: varios equipos en una reserva.
    equipos: z.array(equipo).min(1).max(20).optional(),
    // Forma vieja: un solo equipo. Se sigue aceptando.
    categoria: z.string().min(1).optional(),
    unidades: z.number().int().min(1).max(20).optional(),
    participantes: z.array(participante).max(20).default([]),
    adicionales: z
      .array(z.object({ slug: z.string().min(1), unidades: z.number().int().min(1).max(40) }))
      .max(20)
      .default([]),
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
  })
  .refine((v) => (v.equipos?.length ?? 0) > 0 || Boolean(v.categoria), {
    message: 'Hay que pedir al menos un equipo',
    path: ['equipos'],
  });

rutasRental.post('/reservas', (req, res) => {
  const parseo = nuevaReserva.safeParse(req.body);
  if (!parseo.success) {
    res.status(400).json({ error: 'Datos invalidos', detalle: parseo.error.issues });
    return;
  }

  const { sucursal, desde, hasta, cliente, participantes, adicionales } = parseo.data;

  // Se normaliza a una lista de equipos, sumando repetidos por categoria.
  const pedidos = new Map<string, number>();
  for (const item of parseo.data.equipos ?? [
    { categoria: parseo.data.categoria!, unidades: parseo.data.unidades ?? 1 },
  ]) {
    pedidos.set(item.categoria, (pedidos.get(item.categoria) ?? 0) + item.unidades);
  }

  const dias = cantidadDias(desde, hasta);

  // Verificacion y alta en una sola transaccion: sin esto dos clientes pueden
  // reservar el ultimo equipo al mismo tiempo.
  db.exec('BEGIN IMMEDIATE');
  try {
    const tarifaDe = db.prepare('SELECT tarifa_por_dia FROM rental_categorias WHERE slug = ?');
    const tarifaAdicional = db.prepare('SELECT tarifa_por_dia FROM rental_adicionales WHERE slug = ?');

    let total: number | null = 0;

    for (const [categoria, unidades] of pedidos) {
      const disponibilidad = calcularDisponibilidad(categoria, sucursal, desde, hasta);

      if (disponibilidad.unidadesTotales === 0) {
        db.exec('ROLLBACK');
        res.status(409).json({
          error: 'Sin parque de equipos cargado',
          mensaje:
            'Esta sucursal todavia no tiene unidades cargadas para esa categoria. Escribinos y lo resolvemos por WhatsApp.',
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
              ? 'Queda 1 equipo de esa categoria para ese rango de fechas.'
              : `Quedan ${disponibilidad.unidadesDisponibles} equipos de esa categoria para ese rango de fechas.`,
          disponibilidad,
        });
        return;
      }

      const tarifa = tarifaDe.get(categoria) as { tarifa_por_dia: number | null } | undefined;
      // Con una sola tarifa sin publicar, el total deja de ser calculable.
      if (total != null && tarifa?.tarifa_por_dia != null) total += tarifa.tarifa_por_dia * dias * unidades;
      else total = null;
    }

    for (const adicional of adicionales) {
      const tarifa = tarifaAdicional.get(adicional.slug) as
        | { tarifa_por_dia: number | null }
        | undefined;
      if (total != null && tarifa?.tarifa_por_dia != null) {
        total += tarifa.tarifa_por_dia * dias * adicional.unidades;
      } else total = null;
    }

    // La categoria "principal" de la reserva es la de mas unidades: deja la
    // fila legible en los listados sin abrir los items.
    const ordenados = [...pedidos].sort((a, b) => b[1] - a[1]);
    const categoriaPrincipal = ordenados[0]![0];
    const unidadesTotales = [...pedidos.values()].reduce((suma, n) => suma + n, 0);

    const codigo = generarCodigo('R');
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO rental_reservas
           (codigo, categoria_slug, sucursal_slug, desde, hasta, unidades,
            cliente, participantes, adicionales, estado, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
      )
      .run(
        codigo,
        categoriaPrincipal,
        sucursal,
        desde,
        hasta,
        unidadesTotales,
        JSON.stringify(cliente),
        JSON.stringify(participantes),
        JSON.stringify(adicionales),
        total,
      );

    const insertarItem = db.prepare(
      `INSERT INTO rental_reserva_items (reserva_id, categoria_slug, unidades) VALUES (?, ?, ?)`,
    );
    for (const [categoria, unidades] of pedidos) {
      insertarItem.run(lastInsertRowid, categoria, unidades);
    }

    db.exec('COMMIT');
    res.status(201).json({
      codigo,
      estado: 'pendiente',
      desde,
      hasta,
      dias,
      equipos: [...pedidos].map(([categoria, unidades]) => ({ categoria, unidades })),
      adicionales,
      unidades: unidadesTotales,
      total,
    });
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

  const equipos = db
    .prepare(
      `SELECT i.categoria_slug, c.nombre, i.unidades
         FROM rental_reserva_items i
         JOIN rental_categorias c ON c.slug = i.categoria_slug
        WHERE i.reserva_id = ?`,
    )
    .all(fila.id as number);

  res.json({
    ...fila,
    cliente: JSON.parse(String(fila.cliente)),
    participantes: JSON.parse(String(fila.participantes ?? '[]')),
    adicionales: JSON.parse(String(fila.adicionales ?? '[]')),
    equipos,
  });
});
