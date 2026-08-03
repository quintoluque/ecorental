export type Especificacion = { nombre: string; valor: string };

export type Marca = { slug: string; nombre: string };

export type Area = {
  slug: string;
  codigoOriginal: string | null;
  nombre: string;
  descripcion: string | null;
  deportes: string[];
  destacada: boolean;
  imagen: string | null;
};

export type Grupo = { slug: string; nombre: string; area: string };

/** Una opcion de cualquiera de los rubros de clasificacion. */
export type OpcionTaxonomia = {
  slug: string;
  nombre: string;
  descripcion?: string;
  area?: string;
};

/**
 * Los rubros con los que se clasifica cada articulo. Se cargan desde el
 * catalogo (scripts/clasificador.mjs es la fuente) para que agregar un rubro
 * no obligue a tocar el codigo de la web.
 */
export type Taxonomia = {
  deportes: OpcionTaxonomia[];
  tipos: OpcionTaxonomia[];
  publicos: OpcionTaxonomia[];
  temporadas: OpcionTaxonomia[];
};

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
  /** Clasificacion: los rubros por los que se puede filtrar el articulo. */
  deportes: string[];
  tipo: string | null;
  publico: string | null;
  temporada: string | null;
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
  /** 'ski' | 'snowboard' */
  disciplina: string;
  /** 'adulto' | 'junior' */
  publico: string;
  nivel: string;
  incluye: string[];
  tarifaPorDia: number | null;
  moneda: string;
};

export type AdicionalRental = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  tarifaPorDia: number | null;
  moneda: string;
};

export type Rental = {
  descripcion: string;
  resumen: string;
  sucursales: string[];
  disciplinas: { slug: string; nombre: string; descripcion: string; incluye: string[] }[];
  niveles: { slug: string; nombre: string; descripcion: string }[];
  publicos: { slug: string; nombre: string; descripcion: string }[];
  categorias: CategoriaRental[];
  adicionales: AdicionalRental[];
  datosQuePedimos: { campo: string; motivo: string }[];
  incluyeSiempre: string[];
  condicionesPendientesDeValidacion: boolean;
  condiciones: string[];
};

/** Una persona del viaje, con lo que hace falta para preparar su equipo. */
export type Participante = {
  nombre: string;
  edad: number | null;
  altura: number | null;
  peso: number | null;
  calzado: string;
  nivel: string;
  disciplina: string;
  categoria: string;
  adicionales: string[];
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
  areas: Area[];
  taxonomia: Taxonomia;
  grupos: Grupo[];
  marcas: Marca[];
  productos: Producto[];
  sucursales: Sucursal[];
  servicios: Servicio[];
  rental: Rental;
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

/**
 * Filtros del catalogo. Los rubros aceptan varios valores a la vez (en la URL
 * viajan separados por coma) y se combinan con OR dentro de cada rubro y AND
 * entre rubros, que es como espera funcionar cualquier tienda.
 */
export type FiltrosProducto = {
  area?: string;
  grupo?: string[];
  marca?: string[];
  deporte?: string[];
  tipo?: string[];
  publico?: string[];
  temporada?: string[];
  q?: string;
  alquilable?: boolean;
  precioMin?: number;
  precioMax?: number;
  sucursal?: string;
  orden?: 'nombre' | 'precio-asc' | 'precio-desc';
};
