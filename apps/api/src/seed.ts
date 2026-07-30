import { readFileSync } from 'node:fs';
import { config } from './config.js';
import { db, migrar } from './db.js';

type Catalogo = {
  areas: {
    slug: string;
    codigoOriginal: string | null;
    nombre: string;
    descripcion: string | null;
    destacada: boolean;
  }[];
  grupos: { slug: string; nombre: string; area: string }[];
  marcas: { slug: string; nombre: string }[];
  productos: {
    id: number;
    slug: string;
    nombre: string;
    marca: string | null;
    area: string | null;
    grupo: string | null;
    descripcion: string | null;
    especificaciones: unknown[];
    precio: number | null;
    moneda: string;
    alquilable: boolean;
    urlOriginal: string | null;
  }[];
  sucursales: {
    slug: string;
    nombre: string;
    referencia: string | null;
    direccion: string | null;
    codigoPostal: string | null;
    ciudad: string;
    provincia: string;
    telefono: string | null;
    whatsapp: string | null;
    email: string | null;
    horarios: unknown[];
    servicios: string[];
    casaCentral: boolean;
    centroDeSki: string | null;
    urlOriginal: string | null;
  }[];
  rental: {
    sucursales: string[];
    categorias: {
      slug: string;
      nombre: string;
      descripcion: string | null;
      incluye: string[];
      tarifaPorDia: number | null;
      moneda: string;
    }[];
  };
};

export function sembrar(): void {
  migrar();

  const catalogo = JSON.parse(readFileSync(config.rutaCatalogo, 'utf8')) as Catalogo;

  db.exec('BEGIN');
  try {
    const insertarArea = db.prepare(
      `INSERT INTO areas (slug, codigo_original, nombre, descripcion, destacada, orden)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         codigo_original = excluded.codigo_original,
         nombre          = excluded.nombre,
         descripcion     = excluded.descripcion,
         destacada       = excluded.destacada,
         orden           = excluded.orden`,
    );
    catalogo.areas.forEach((area, i) => {
      insertarArea.run(
        area.slug,
        area.codigoOriginal,
        area.nombre,
        area.descripcion,
        area.destacada ? 1 : 0,
        i,
      );
    });

    const insertarGrupo = db.prepare(
      `INSERT INTO grupos (slug, nombre, area_slug) VALUES (?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET nombre = excluded.nombre, area_slug = excluded.area_slug`,
    );
    for (const grupo of catalogo.grupos) insertarGrupo.run(grupo.slug, grupo.nombre, grupo.area);

    const insertarMarca = db.prepare(
      `INSERT INTO marcas (slug, nombre) VALUES (?, ?)
       ON CONFLICT(slug) DO UPDATE SET nombre = excluded.nombre`,
    );
    for (const marca of catalogo.marcas) insertarMarca.run(marca.slug, marca.nombre);

    const insertarSucursal = db.prepare(
      `INSERT INTO sucursales
         (slug, nombre, referencia, direccion, codigo_postal, ciudad, provincia,
          telefono, whatsapp, email, horarios, servicios, casa_central, centro_de_ski, url_original)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         nombre = excluded.nombre, referencia = excluded.referencia,
         direccion = excluded.direccion, codigo_postal = excluded.codigo_postal,
         ciudad = excluded.ciudad, provincia = excluded.provincia,
         telefono = excluded.telefono, whatsapp = excluded.whatsapp, email = excluded.email,
         horarios = excluded.horarios, servicios = excluded.servicios,
         casa_central = excluded.casa_central, centro_de_ski = excluded.centro_de_ski,
         url_original = excluded.url_original`,
    );
    for (const s of catalogo.sucursales) {
      insertarSucursal.run(
        s.slug,
        s.nombre,
        s.referencia,
        s.direccion,
        s.codigoPostal,
        s.ciudad,
        s.provincia,
        s.telefono,
        s.whatsapp,
        s.email,
        JSON.stringify(s.horarios),
        JSON.stringify(s.servicios),
        s.casaCentral ? 1 : 0,
        s.centroDeSki,
        s.urlOriginal,
      );
    }

    const insertarProducto = db.prepare(
      `INSERT INTO productos
         (id, slug, nombre, marca_slug, area_slug, grupo_slug, descripcion,
          especificaciones, precio, moneda, alquilable, url_original, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug, nombre = excluded.nombre, marca_slug = excluded.marca_slug,
         area_slug = excluded.area_slug, grupo_slug = excluded.grupo_slug,
         descripcion = excluded.descripcion, especificaciones = excluded.especificaciones,
         precio = excluded.precio, moneda = excluded.moneda,
         alquilable = excluded.alquilable, url_original = excluded.url_original`,
    );
    for (const p of catalogo.productos) {
      insertarProducto.run(
        p.id,
        p.slug,
        p.nombre,
        p.marca,
        p.area,
        p.grupo,
        p.descripcion,
        JSON.stringify(p.especificaciones ?? []),
        p.precio,
        p.moneda ?? 'ARS',
        p.alquilable ? 1 : 0,
        p.urlOriginal,
      );
    }

    const insertarRental = db.prepare(
      `INSERT INTO rental_categorias (slug, nombre, descripcion, incluye, tarifa_por_dia, moneda)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         nombre = excluded.nombre, descripcion = excluded.descripcion,
         incluye = excluded.incluye, tarifa_por_dia = excluded.tarifa_por_dia,
         moneda = excluded.moneda`,
    );
    for (const c of catalogo.rental.categorias) {
      insertarRental.run(
        c.slug,
        c.nombre,
        c.descripcion,
        JSON.stringify(c.incluye ?? []),
        c.tarifaPorDia,
        c.moneda ?? 'ARS',
      );
    }

    // El parque de equipos se declara vacio: las unidades reales las carga ECO
    // por sucursal desde el panel. Insertamos la fila para que la sucursal
    // aparezca como punto de rental habilitado sin inventar cantidades.
    const insertarInventario = db.prepare(
      `INSERT INTO rental_inventario (categoria_slug, sucursal_slug, unidades)
       VALUES (?, ?, 0)
       ON CONFLICT(categoria_slug, sucursal_slug) DO NOTHING`,
    );
    for (const categoria of catalogo.rental.categorias) {
      for (const sucursal of catalogo.rental.sucursales) {
        insertarInventario.run(categoria.slug, sucursal);
      }
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const ejecutadoDirectamente = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');

if (ejecutadoDirectamente) {
  sembrar();
  const total = db.prepare('SELECT COUNT(*) AS n FROM productos').get() as { n: number };
  const sucursales = db.prepare('SELECT COUNT(*) AS n FROM sucursales').get() as { n: number };
  console.log(
    `Base cargada en ${config.rutaBase}: ${total.n} productos, ${sucursales.n} sucursales.`,
  );
}
