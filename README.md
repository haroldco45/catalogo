catalogo-fotos/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── index.css
    └── CatalogoApp.jsx
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Catálogo de Fotos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
{
  "name": "catalogo-fotos",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import CatalogoApp from './CatalogoApp'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CatalogoApp />
  </React.StrictMode>,
)
body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
  background: #f9fafb;
}
input, button, select {
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 6px;
}


aqui los productos distribuidos por distrileco
