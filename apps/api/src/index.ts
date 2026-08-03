import { readFileSync } from 'node:fs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { db } from './db.js';
import { rutasCatalogo } from './routes/catalogo.js';
import { rutasComercio } from './routes/comercio.js';
import { rutasRental } from './routes/rental.js';
import { sembrar } from './seed.js';

// Migra y carga la fuente de datos en cada arranque: el JSON del repositorio es
// la unica verdad del catalogo, la base solo agrega stock, reservas y pedidos.
sembrar();

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: config.origenes.includes('*') ? true : config.origenes }));
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, base: config.rutaBase, hora: new Date().toISOString() });
});

/** Datos institucionales tal como figuran en data/catalog.json. */
app.get('/api/empresa', (_req, res) => {
  const catalogo = JSON.parse(readFileSync(config.rutaCatalogo, 'utf8'));
  res.json({
    empresa: catalogo.empresa,
    taxonomia: catalogo.taxonomia,
    servicios: catalogo.servicios,
    rental: { descripcion: catalogo.rental.descripcion },
    clima: catalogo.clima,
    novedades: catalogo.novedades,
    paginasOriginales: catalogo.paginasOriginales,
  });
});

app.use('/api', rutasCatalogo);
app.use('/api/rental', rutasRental);
app.use('/api', rutasComercio);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(error.status ?? 500).json({ error: error.message || 'Error interno' });
});

const servidor = app.listen(config.puerto, () => {
  console.log(`API de ECO > Eurocamping escuchando en http://localhost:${config.puerto}`);
});

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    servidor.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
