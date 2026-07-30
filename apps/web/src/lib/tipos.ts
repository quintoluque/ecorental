export type Especificacion = { nombre: string; valor: string };

export type Marca = { slug: string; nombre: string };

export type Area = {
  slug: string;
  codigoOriginal: string | null;
  nombre: string;
  descripcion: string | null;
  actividades: string[];
  destacada: boolean;
  imagen: string | null;
};

export type Grupo = { slug: string; nombre: string; area: string };

export type Producto = {
  id: number;
  slug: string;
  nombre: string;
  marca: string | null;
  area: string | null;
  grupo: string | null;
  descripcion: string | null;
  especificaciones: Especificacion[];
  precio: number | null;
  moneda: string;
  alquilable: boolean;
  urlOriginal: string | null;
  /** Rutas relativas a apps/web/public, p. ej. 'fotos/productos/x.jpg'. */
  imagenes: string[];
};

export type Horario = { dias: string; horario: string };

export type Sucursal = {
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
  horarios: Horario[];
  servicios: string[];
  casaCentral: boolean;
  centroDeSki: string | null;
  urlOriginal: string | null;
  imagen: string | null;
};

export type Servicio = {
  slug: string;
  nombre: string;
  resumen: string;
  detalle: string;
  urlOriginal: string;
};

export type CategoriaRental = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  incluye: string[];
  tarifaPorDia: number | null;
  moneda: string;
};

export type Empresa = {
  nombre: string;
  nombreCorto: string;
  tagline: string;
  desde: number;
  descripcion: string;
  descripcionCorta: string;
  email: string;
  telefono: string;
  whatsapp: string;
  whatsappLink: string;
  sitioOriginal: string;
  redes: {
    instagram: string;
    instagramUsuario: string;
    facebook: string;
    facebookUsuario: string;
  };
};

export type Catalogo = {
  empresa: Empresa;
  actividades: string[];
  areas: Area[];
  grupos: Grupo[];
  marcas: Marca[];
  productos: Producto[];
  sucursales: Sucursal[];
  servicios: Servicio[];
  rental: {
    descripcion: string;
    sucursales: string[];
    categorias: CategoriaRental[];
  };
  clima: {
    titulo: string;
    descripcion: string;
    urlOriginal: string;
    centros: { nombre: string; provincia: string; sucursal: string }[];
  };
  novedades: { titulo: string; urlOriginal: string; items: unknown[] };
  paginasOriginales: { titulo: string; url: string }[];
};

export type Disponibilidad = {
  categoria: string;
  sucursal: string;
  desde: string;
  hasta: string;
  unidadesTotales: number;
  unidadesDisponibles: number;
  dias: number;
  disponible: boolean;
  tarifaPorDia: number | null;
  moneda: string;
  totalEstimado: number | null;
};

export type FiltrosProducto = {
  area?: string;
  grupo?: string;
  marca?: string;
  q?: string;
  alquilable?: boolean;
  sucursal?: string;
  orden?: 'nombre' | 'precio-asc' | 'precio-desc';
};
