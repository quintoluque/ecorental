import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App.tsx';
import { ProveedorCarrito } from './lib/carrito.tsx';
import './index.css';

// HashRouter: en GitHub Pages no hay servidor que reescriba las rutas, y con
// hash cualquier URL profunda funciona al recargar o compartirla.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProveedorCarrito>
        <App />
      </ProveedorCarrito>
    </HashRouter>
  </StrictMode>,
);
