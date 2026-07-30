# ECO > Eurocamping — plataforma de venta y alquiler

Modernización del comercio online de **ECO > Eurocamping**, *The Outdoor Store Since 1965*.
Frontend moderno + backend preparado para operar varias sucursales y el alquiler de equipos
de nieve con disponibilidad real por fechas.

> **Toda la información del sitio proviene de [eurocampingonline.com.ar](https://www.eurocampingonline.com.ar/).**
> No se inventaron productos, precios, direcciones ni teléfonos. Lo que el sitio original no
> publica de forma verificable queda en `null` y la web lo muestra como *"Consultar"*.
> Ver [Estado de los datos](#3-estado-de-los-datos).

---

## 1. Cómo ver la página (guía para no programadores)

Hay tres formas, de la más fácil a la más completa.

### Opción A — Publicarla en internet con GitHub Pages (recomendada)

Es gratis y deja la web con un link público que podés compartir. Se hace **una sola vez**:

1. Entrá al repositorio en GitHub: `https://github.com/quintoluque/ecorental`
2. Hacé clic en la pestaña **Settings** (Configuración), arriba a la derecha.
3. En el menú de la izquierda, buscá **Pages**.
4. En **Source** (Origen), elegí **GitHub Actions** en el desplegable. No hace falta guardar nada más.
5. Andá a la pestaña **Actions**, arriba. Vas a ver un flujo llamado
   *"Publicar sitio en GitHub Pages"*. Si dice que está esperando, hacé clic en
   **Run workflow** y elegí la rama `claude/eco-eurocamping-modernization-m244jr`.
6. Esperá unos 2 minutos. Cuando el círculo se ponga verde ✅, la web queda publicada en:

   **`https://quintoluque.github.io/ecorental/`**

A partir de ahí, **cada vez que se suba un cambio la web se actualiza sola**.

> Si el círculo se pone rojo ❌, hacé clic encima para ver qué paso falló.

### Opción B — Verla en tu computadora

Necesitás [Node.js 22 o superior](https://nodejs.org) instalado (descarga e instalación normal,
siguiente-siguiente-finalizar). Después, abrí una terminal y pegá:

```bash
git clone https://github.com/quintoluque/ecorental.git
cd ecorental
npm install
npm run dev
```

Abrí en el navegador la dirección que aparece (normalmente `http://localhost:5173`).

### Opción C — Con el backend en marcha

Igual que la B, pero en **dos terminales** distintas:

```bash
# Terminal 1 — el backend
npm run dev:api

# Terminal 2 — la web
cd apps/web
cp .env.example .env      # editá el archivo y descomentá la línea VITE_API_URL
cd ../..
npm run dev
```

Con el backend conectado, la web deja de leer el archivo de datos y pasa a usar la base:
stock por sucursal, disponibilidad de alquiler real y reservas que quedan guardadas.

---

## 2. Qué incluye

### La web (frontend)

| Página | Ruta | Qué hace |
|---|---|---|
| Inicio | `/` | Portada, actividades, rental y catálogo destacado |
| Catálogo | `/productos` | Filtros por actividad, categoría, marca, búsqueda y orden |
| Ficha de producto | `/producto/:slug` | Detalle, especificaciones, carrito y alquiler |
| **Rental** | `/rental` | **Reserva con fechas y disponibilidad real** |
| Taller | `/taller` | Servicio de instalación, reparación y mantenimiento |
| Sucursales | `/sucursales` | Direcciones, horarios y servicios de cada local |
| Marcas | `/marcas` | Marcas trabajadas |
| Quiénes somos | `/nosotros` | Historia y servicios |
| Novedades | `/novedades` | Novedades (se cargan desde el panel) |
| Clima | `/clima` | Centros de invierno donde ECO tiene presencia |
| Contacto | `/contacto` | Formulario, teléfonos y horarios |
| Carrito | `/carrito` | Pedido con retiro en sucursal o envío |

Es responsive (funciona en celular), accesible por teclado y no usa imágenes externas:
carga rápido incluso con mala señal en la montaña.

### El backend (API)

Pensado para el volumen que ECO va a manejar cuando esté en todos los centros de ski.

```
GET    /api/health                    Estado del servicio
GET    /api/empresa                   Datos institucionales
GET    /api/referencias               Áreas, categorías y marcas
GET    /api/productos                 Catálogo con filtros y paginado
GET    /api/productos/:slug           Producto + stock por sucursal
GET    /api/sucursales                Sucursales con horarios y servicios
GET    /api/rental/categorias         Equipos de alquiler y su parque por sucursal
GET    /api/rental/disponibilidad     Disponibilidad para un rango de fechas
POST   /api/rental/reservas           Crear una reserva
GET    /api/rental/reservas/:codigo   Consultar una reserva
POST   /api/pedidos                   Crear un pedido
GET    /api/pedidos/:codigo           Consultar un pedido
POST   /api/contacto                  Registrar una consulta
GET    /api/resumen                   Resumen operativo del día
```

**La pieza importante es la disponibilidad de alquiler.** Se calcula día por día sobre el
rango pedido y se toma el peor día, así una reserva que solapa parcialmente no bloquea fechas
libres de más. El alta se hace dentro de una transacción, por lo que **dos clientes no pueden
reservar el mismo último equipo al mismo tiempo** — el segundo recibe un error 409 con la
cantidad real que queda.

Ejemplo real (3 equipos en Bariloche, con una reserva de 2 equipos del 12 al 16 de agosto):

| Consulta | Disponibles |
|---|---|
| 10 – 11 ago (sin solape) | 3 |
| 10 – 14 ago (solape parcial) | 1 |
| 17 – 20 ago (posterior) | 3 |

### Base de datos

SQLite a través del módulo `node:sqlite` que ya trae Node 22: **cero dependencias binarias**,
no hay que instalar ni administrar un motor de base de datos. El esquema
(`apps/api/src/db.ts`) ya está normalizado y modelado para migrar a PostgreSQL sin rehacer
nada cuando el volumen lo pida.

---

## 3. Estado de los datos

El sitio original bloquea la lectura automática, así que el catálogo se relevó desde sus
páginas públicas indexadas. Lo que está cargado y verificado:

**Completo:** empresa, teléfonos, e-mail, WhatsApp, redes, las 11 actividades, las 8 áreas de
producto, los servicios y páginas del sitio, y la casa central (La Paz 830, Martínez, con
dirección, código postal, teléfonos y horarios).

**Parcial — falta completar:**

| Dato | Estado |
|---|---|
| Productos | **7 cargados** con nombre, marca, área y especificaciones reales |
| Marcas | 5 verificadas (Rossignol, Doite, Outside, X-Terra, Hydrox) |
| Precios | El sitio original no los publica de forma accesible → se muestra *"Consultar"* |
| Sucursales | Las 7 ciudades están; falta dirección y teléfono de 6 de ellas |
| Parque de alquiler | En 0: las unidades por sucursal las carga ECO |
| Tarifas de rental | Sin publicar en el sitio original |

**Deliberadamente no se completó nada de esto con datos inventados.** Un precio o una
dirección falsa en una propuesta comercial es peor que un campo vacío.

### Cómo cargar el catálogo completo

Exportá los productos a un archivo `productos.csv` con estas columnas:

```csv
id,nombre,marca,area,grupo,descripcion,precio,alquilable,url
1542,ROSSIGNOL SKI BLACK OPS,Rossignol,invierno,skis,Ski all-mountain,1250000,si,
```

Y corré:

```bash
node scripts/importar-catalogo.mjs productos.csv
npm run seed     # sólo si usás el backend
```

Da de alta solo las marcas y categorías nuevas, actualiza los productos que ya existen por
`id` y no borra nada. Las direcciones y horarios que falten se editan a mano en
`data/catalog.json`.

### Cómo cargar las fotos

Copiá las imágenes en estas carpetas, nombrando cada archivo con el *slug* del producto,
área o sucursal:

```
apps/web/public/fotos/productos/     rossignol-ski-black-ops.jpg
apps/web/public/fotos/actividades/   invierno.jpg
apps/web/public/fotos/sucursales/    bariloche.jpg
```

Y corré:

```bash
node scripts/vincular-fotos.mjs
```

El script las conecta solo mirando los nombres; no hay que editar nada a mano. Para varias
fotos de un mismo producto, agregá `-2`, `-3` al final (la que no tiene número es la
portada). Si un archivo no coincide con ningún slug, el script te lista los disponibles.

Instrucciones completas, tamaños recomendados y formatos aceptados en
[`apps/web/public/fotos/LEEME.md`](apps/web/public/fotos/LEEME.md).

**Mientras no haya fotos no pasa nada:** la web dibuja un marcador con el isotipo de ECO,
así que se pueden ir cargando de a poco sin que el sitio quede roto en el medio.

> Usá fotos propias de ECO o de los catálogos oficiales de las marcas que distribuye. Las
> imágenes de otras tiendas tienen derechos de autor y no se pueden republicar.

---

## 4. Estructura del proyecto

```
data/catalog.json         ← TODOS los datos del sitio (fuente única)
apps/web/                 ← La página (React + Vite + Tailwind)
apps/web/public/fotos/    ← Acá van las imágenes
apps/api/                 ← El backend (Express + SQLite)
scripts/                  ← Importador de catálogo y vinculador de fotos
.github/workflows/        ← Publicación automática en GitHub Pages
```

Para cambiar un teléfono, un horario o el texto de una sección, se edita
**`data/catalog.json`** y listo: la web y el backend leen del mismo archivo.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la web en modo desarrollo |
| `npm run dev:api` | Levanta el backend |
| `npm run build` | Compila todo para producción |
| `npm run check` | Verifica que no haya errores de tipos |
| `npm run seed` | Carga `data/catalog.json` en la base |
| `node scripts/vincular-fotos.mjs` | Conecta las fotos de `public/fotos/` con el catálogo |

---

## 5. Identidad visual

La paleta y el logotipo salen del logo oficial de ECO:

| Rol | Color | Uso |
|---|---|---|
| Naranja de marca | `#F7931E` | Botones principales, acentos, isotipo |
| Naranja oscuro | `#B35F00` | Enlaces sobre fondo claro (contraste AA) |
| Carbón | `#1B1A19` / `#262523` | Fondos oscuros, titulares |
| Nieve | `#FAF9F7` | Fondo general |

Detalles que replican el logotipo:

- **Isotipo** (`components/Logo.tsx`): la contraforma de la "O" con el pico de montaña y
  el sol, dibujada en SVG. Escala sin perder nitidez y también es el favicon.
- **"ECO" en itálica pesada** con `eurocamping.com.ar` al lado, igual que el original.
- **Bajada en versalitas serif** — *The Outdoor Store Since 1965* — con la clase
  `.versalitas`.
- **Silueta de cordillera** (`.cordillera`) rematando las secciones oscuras, y veladuras
  naranjas suaves sobre carbón (`.textura-carbon`) como el fondo del logo.

Sobre el naranja el texto va **oscuro, no blanco**: `#F7931E` con blanco da 2,5:1 y no
pasa accesibilidad; con carbón da 9:1. Por eso los botones naranjas llevan texto carbón,
igual que el isotipo.

---

## 6. Decisiones técnicas

**El mismo código funciona con y sin backend.** Si la variable `VITE_API_URL` está definida,
la web consulta la API; si no, resuelve todo contra `data/catalog.json`. Por eso la versión
publicada en GitHub Pages es completamente navegable sin servidor, y pasar a producción es
sólo definir esa variable. En modo sin servidor, las reservas y pedidos avisan claramente que
no quedaron guardados.

**Rutas con `#`.** GitHub Pages no reescribe URLs, así que se usa `HashRouter`: cualquier
enlace profundo funciona al recargarlo o al compartirlo por WhatsApp.

**Sin imágenes externas.** Las fotos de producto todavía no están migradas, así que cada ficha
muestra un marcador generado a partir del nombre — estable y sin imágenes rotas. Cuando se
suban las fotos reales se reemplaza el componente `ProductoImagen`.

**Sobre `npm audit`.** Aparece un aviso de `react-router` por un fallo de CSRF en *modo RSC*
(renderizado en servidor). Esta app es 100% cliente con `HashRouter`, no usa RSC ni acciones
de servidor, así que ese código no se ejecuta. Se dejó la versión más nueva (7.18.2) a
propósito: las versiones anteriores no afectadas por ese aviso concreto arrastran 14
advertencias peores.

---

## 7. Próximos pasos sugeridos

1. **Cargar el catálogo completo** con el importador y **subir las fotos** (ver arriba).
2. **Panel de administración** para que cada sucursal cargue su stock y su parque de alquiler
   sin tocar archivos.
3. **Pagos online** (Mercado Pago) y facturación.
4. **Talles y variantes** por producto — el esquema de la tabla `stock` ya los contempla.
5. **Clima en vivo** en los centros de invierno conectando un proveedor meteorológico.
