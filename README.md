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
   **Run workflow** y elegí la rama `main`.
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
| **Catálogo** | `/productos` | **Barra lateral de filtros: deporte, tipo de artículo, familia, marca, público, temporada y precio** |
| Ficha de producto | `/producto/:slug` | Detalle, especificaciones, clasificación, carrito y alquiler |
| **Rental** | `/rental` | **Reserva del viaje entero: varias personas, cada una con su equipo y sus adicionales** |
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
GET    /api/rental/adicionales        Casco, antiparras, ropa de nieve
GET    /api/rental/disponibilidad     Disponibilidad para un rango de fechas
POST   /api/rental/reservas           Crear una reserva (una o varias personas)
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

**Una reserva es del viaje entero, no de un equipo suelto.** Una familia de cuatro puede pedir
2 equipos de ski Standard, 1 de snowboard Performance y 1 Junior en la misma solicitud: cada
línea descuenta parque de *su* categoría (tabla `rental_reserva_items`), y las cuatro se
verifican y se dan de alta dentro de la misma transacción. Si falla una, no se reserva ninguna.

### Base de datos

SQLite a través del módulo `node:sqlite` que ya trae Node 22: **cero dependencias binarias**,
no hay que instalar ni administrar un motor de base de datos. El esquema
(`apps/api/src/db.ts`) ya está normalizado y modelado para migrar a PostgreSQL sin rehacer
nada cuando el volumen lo pida.

---

## 3. Estado de los datos

El sitio original bloquea la lectura automática, así que el catálogo se relevó desde sus
páginas públicas indexadas. Lo que está cargado y verificado:

**Completo:** empresa, teléfonos, e-mail, WhatsApp, redes, los 11 deportes, las 8 áreas de
producto, los servicios y páginas del sitio, y la casa central (La Paz 830, Martínez, con
dirección, código postal, teléfonos y horarios).

**Parcial — falta completar:**

| Dato | Estado |
|---|---|
| Productos | **182 cargados** con nombre, marca, área, familia y clasificación |
| Marcas | 43 relevadas del sitio original |
| Precios | El sitio original no los publica de forma accesible → se muestra *"Consultar"* |
| Sucursales | Las 7 ciudades están; falta dirección y teléfono de 6 de ellas |
| Parque de alquiler | En 0: las unidades por sucursal las carga ECO |
| Tarifas de rental | Sin publicar en el sitio original |
| Condiciones de rental | Redactadas según el estándar del rubro, **a confirmar por ECO** |

**Deliberadamente no se completó nada de esto con datos inventados.** Un precio o una
dirección falsa en una propuesta comercial es peor que un campo vacío.

### De dónde salen los 182 productos

El sitio original bloquea la lectura automática, así que los productos se relevaron de sus
páginas públicas indexadas: de cada una salen el **nombre real**, el **id** (`detalle.php?id=…`)
y la marca. El área y la familia se asignaron según la propia taxonomía del sitio
(*Botas Ski*, *Trajes de neoprene*, *Bolsas de dormir*…).

La lista queda en [`data/productos-relevados.csv`](data/productos-relevados.csv), así que
**agregar los que falten es sumar filas a ese archivo** y volver a correr el importador. No es
el catálogo completo de ECO: es todo lo que el índice público deja ver.

Lo único derivado —no relevado— es la marca `alquilable` en el equipamiento de nieve
(skis, tablas, botas, fijaciones, bastones y cascos), puesta a partir del servicio de rental
que ECO sí publica. Se corrige en el CSV con la columna `alquilable`.

### Cómo cargar el catálogo completo

Exportá los productos a un archivo `productos.csv` con estas columnas:

```csv
id,nombre,marca,area,grupo,descripcion,precio,alquilable,url
1542,ROSSIGNOL SKI BLACK OPS,Rossignol,invierno,Skis,Ski all-mountain,1250000,si,
```

Y corré:

```bash
node scripts/importar-catalogo.mjs productos.csv
npm run seed     # sólo si usás el backend
```

Da de alta solo las marcas y categorías nuevas, actualiza los productos que ya existen por
`id` y no borra nada: lo que ya estaba cargado a mano (descripción, especificaciones, fotos)
se conserva. Las direcciones y horarios que falten se editan a mano en `data/catalog.json`.

---

### Cómo cargar las fotos

Las fotos ya están en `eurocampingonline.com.ar`, una por producto: se pueden traer todas
solas, sin cargarlas a mano.

#### Opción A — Con un botón, desde la página de GitHub (recomendada)

**No hay que instalar nada ni escribir ningún comando.** Es el mismo mecanismo que publica
el sitio:

1. Entrá a `https://github.com/quintoluque/ecorental`
2. Hacé clic en la pestaña **Actions**, arriba.
3. En la lista de la izquierda, elegí **"Bajar las fotos de los productos"**.
4. A la derecha aparece el botón **Run workflow**. Hacé clic.
   - Se abre un cuadrito con tres casilleros. **Se pueden dejar como están.**
   - Si querés probar con pocos primero, escribí `5` en *"Cuantos productos probar"*.
5. Hacé clic en el botón verde **Run workflow** y esperá.

Cuando el círculo se ponga verde ✅, las fotos ya están cargadas **y el sitio se vuelve a
publicar solo**: en un par de minutos se ven en la web.

Si hacés clic en la corrida, abajo de todo hay un resumen que dice cuántas fotos bajó y qué
productos quedaron sin foto, con el motivo.

> El botón aparece en la pestaña **Actions** recién cuando estos cambios estén en la rama
> `main`. Si todavía no los ves, es que falta aprobar y mergear el Pull Request.

#### Opción B — Desde tu computadora

Si ya tenés el proyecto instalado (ver [Opción B del comienzo](#opción-b--verla-en-tu-computadora)):

```bash
npm run fotos
```

Para probar de a poco:

```bash
npm run fotos -- --limite 5      # sólo los primeros 5
npm run fotos -- --listar        # muestra qué bajaría, sin bajar nada
npm run fotos -- --pausa 3000    # más lento, si el sitio corta los pedidos
```

#### Qué hace, en las dos opciones

Recorre la página de cada producto (`detalle.php?id=…`), baja la foto, descarta logos,
banners y miniaturas, se queda con la de mejor resolución y la guarda con el nombre que
espera la web. **Como cada producto del catálogo ya tiene su dirección original, la foto que
baja es la de ese producto y no la de otro:** no hay que revisar 182 asignaciones a mano.

Lo que ya bajó queda guardado, así que se puede cortar y seguir después. Al terminar avisa
qué productos quedaron sin foto y por qué.

> Si el sitio muestra su cartel de *"sin imagen"* en vez de una foto, lo detecta
> —es el mismo archivo repetido en productos de marcas distintas— y no lo guarda, para que
> no quede un cartel haciendo de foto de producto.

#### Opción C — A mano

**Alcanza con copiar los archivos en la carpeta correcta**, nombrando cada uno con el
*slug* del producto, área o sucursal. No hay que correr ningún comando: la web las detecta
sola al compilar.

```
apps/web/src/fotos/productos/     rossignol-ski-black-ops.jpg
apps/web/src/fotos/actividades/   invierno.jpg
apps/web/src/fotos/sucursales/    bariloche.jpg
```

Se pueden subir desde la web de GitHub (**Add file → Upload files**) sin instalar nada: al
confirmar, el sitio se recompila y publica con las fotos nuevas.

Para varias fotos de un mismo producto, agregá `-2`, `-3` al final; la que no tiene número
es la portada.

Instrucciones completas, tamaños y formatos en
[`apps/web/src/fotos/LEEME.md`](apps/web/src/fotos/LEEME.md).

**Mientras no haya fotos no pasa nada:** la web dibuja un marcador con el isotipo de ECO,
así que se pueden ir cargando de a poco sin que el sitio quede roto en el medio.

> Usá fotos propias de ECO o de los catálogos oficiales de las marcas que distribuye. Las
> imágenes de otras tiendas tienen derechos de autor y no se pueden republicar.

---

## 4. Cómo se clasifica cada artículo

Cada producto entra en varios rubros a la vez, y con eso se arma la barra lateral del
catálogo:

| Rubro | Valores |
|---|---|
| **Deporte** | Ski, Snowboard, Camping, Trekking, Montañismo, Escalada, Pesca, Náutica, Kayak, Surf, Kitesurf |
| **Tipo de artículo** | Equipamiento, Indumentaria, Calzado, Accesorios |
| **Público** | Unisex, Hombre, Mujer, Niños |
| **Temporada** | Invierno, Verano, Todo el año |
| **Familia** | Las 41 del sitio original: Camperas, Carpas, Mochilas, Botas Ski… |
| **Marca** y **Precio** | Multiselección y rango |

Un artículo puede tener **varios deportes**: una campera de nieve sirve para ski y para
snowboard, y aparece con los dos filtros.

**No hay que clasificar nada a mano.** `scripts/clasificador.mjs` lo deduce del nombre, el
área y la familia, con reglas que contemplan los casos molestos: unos *escarpines de bota de
ski* son accesorio y no calzado; un *salvavidas ski pro* es náutica y no nieve; una campera
*Venture 2 W* es de mujer.

```bash
node scripts/clasificar-catalogo.mjs            # completa lo que falte
node scripts/clasificar-catalogo.mjs --rehacer  # reclasifica todo de cero
```

El importador lo corre solo, así que un producto nuevo queda filtrable apenas se importa. Si
alguno queda mal clasificado, se corrige poniendo el valor en el CSV (columnas `deportes`,
`tipo`, `publico`, `temporada`): **lo que viene en el CSV siempre le gana al clasificador.**

### El filtro de precio

Está listo pero hoy no tiene con qué trabajar: como el sitio original no publica precios,
todos los artículos valen *"Consultar"* y la barra lo dice en vez de mostrar un control roto.
Apenas se importe un CSV con precios, el filtro se activa solo y calcula los tramos sobre el
rango real del catálogo.

---

## 5. La sección de alquiler

`/rental` reserva **el equipo de todo el viaje**, no un equipo suelto, porque a la nieve se
va en familia o en grupo. Son tres pasos:

1. **Tu viaje** — sucursal de retiro, fecha de retiro y de devolución (calcula los días).
2. **Quiénes van** — una ficha por persona: nombre, edad, altura, peso, talle de calzado,
   nivel, disciplina, equipo y adicionales. Se agregan y quitan personas sin límite.
3. **Tus datos** — contacto, comentario, condiciones y envío.

**El equipo se sugiere solo** a partir de lo que declara cada persona: hasta 12 años va
Junior con el casco incluido, y el nivel elige entre Standard, Performance y Premium. La
sugerencia se puede cambiar.

| Equipos | Adicionales |
|---|---|
| Ski Standard · Performance · Premium · Junior | Casco · Antiparras · Ropa de nieve · Guantes · Bolso porta equipo |
| Snowboard Standard · Performance · Junior | |

Se piden altura, peso, talle y nivel porque **son los datos con los que se prepara el equipo**:
definen el largo del ski o de la tabla y el ajuste de las fijaciones. La página lo explica.

Las tarifas quedan en `null` (*"Consultar"*) hasta que ECO cargue las de la temporada, y las
condiciones de alquiler se muestran marcadas como *sujetas a confirmación de la sucursal*:
son las estándar del rubro, no las de ECO, porque el sitio original no las publica. Se editan
en `data/catalog.json` → `rental.condiciones`, y al confirmarlas se pone
`condicionesPendientesDeValidacion: false` para que desaparezca el aviso.

## 6. Estructura del proyecto

```
data/catalog.json             ← TODOS los datos del sitio (fuente única)
data/productos-relevados.csv  ← Los productos, para seguir sumando
apps/web/                     ← La página (React + Vite + Tailwind)
apps/web/src/fotos/           ← Acá van las imágenes
apps/api/                     ← El backend (Express + SQLite)
scripts/clasificador.mjs      ← Las reglas de clasificación
scripts/                      ← Importador, clasificador y vinculador de fotos
.github/workflows/            ← Publicación automática y botón para bajar las fotos
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
| `npm run fotos` | Baja las fotos de los productos desde el sitio actual de ECO |
| `node scripts/importar-catalogo.mjs productos.csv` | Importa productos desde un CSV y los clasifica |
| `node scripts/clasificar-catalogo.mjs` | Reclasifica el catálogo y sincroniza la taxonomía |
| `node scripts/vincular-fotos.mjs` | Anota las fotos en el catálogo (sólo si usás el backend) |

---

## 7. Identidad visual

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

## 8. Decisiones técnicas

**El mismo código funciona con y sin backend.** Si la variable `VITE_API_URL` está definida,
la web consulta la API; si no, resuelve todo contra `data/catalog.json`. Por eso la versión
publicada en GitHub Pages es completamente navegable sin servidor, y pasar a producción es
sólo definir esa variable. En modo sin servidor, las reservas y pedidos avisan claramente que
no quedaron guardados.

**Rutas con `#`.** GitHub Pages no reescribe URLs, así que se usa `HashRouter`: cualquier
enlace profundo funciona al recargarlo o al compartirlo por WhatsApp.

**Sin imágenes externas.** Las fotos se sirven desde el propio sitio: nunca se enlaza a otro
servidor, así que no hay imágenes rotas cuando un tercero cambia o borra un archivo. Mientras
un producto no tenga foto cargada, la ficha muestra un marcador generado a partir del nombre.

**Las fotos se bajan, no se capturan.** `scripts/importar-fotos.mjs` descarga el archivo
original de cada producto. Una captura de pantalla daría menos definición (queda limitada a
la resolución del monitor y se recomprime), así que siempre conviene el archivo original.
El script tampoco busca las fotos en internet por nombre de producto: un mismo nombre —
*"ROSSIGNOL SKI BLACK OPS"*— corresponde a varios modelos y temporadas distintas, y una foto
equivocada en una web donde se compra es peor que no tener foto.

**Sobre `npm audit`.** Aparece un aviso de `react-router` por un fallo de CSRF en *modo RSC*
(renderizado en servidor). Esta app es 100% cliente con `HashRouter`, no usa RSC ni acciones
de servidor, así que ese código no se ejecuta. Se dejó la versión más nueva (7.18.2) a
propósito: las versiones anteriores no afectadas por ese aviso concreto arrastran 14
advertencias peores.

---

## 9. Próximos pasos sugeridos

1. **Completar el catálogo** sumando filas a `data/productos-relevados.csv`, **cargar los
   precios** en la columna `precio` (con eso se enciende el filtro de precio) y **subir las
   fotos** (ver arriba).
2. **Panel de administración** para que cada sucursal cargue su stock y su parque de alquiler
   sin tocar archivos.
3. **Pagos online** (Mercado Pago) y facturación.
4. **Talles y variantes** por producto — el esquema de la tabla `stock` ya los contempla.
5. **Clima en vivo** en los centros de invierno conectando un proveedor meteorológico.
