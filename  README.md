## Devhub Marketplace SPA (sin build)

Esta carpeta contiene una SPA estática (HTML/CSS/JS) con estética "Liquid Glass" y un perfil de creador (tabs, portafolio, social, reputación).

### Cómo correrla

- Abre `index.html` en el navegador, o sirve la carpeta con cualquier servidor estático.

Ejemplo (si tienes Python):

```bash
python -m http.server 5173
```

Luego abre `http://localhost:5173`.

### Qué incluye

- UI estilo Apple: glassmorphism, blur, bordes redondeados, tipografía system (San Francisco en macOS).
- Navegación SPA con tabs y animaciones.
- Accesibilidad: Guided Focus Management + live region para lectores de pantalla.
- Stubs de Realtime: simulación de eventos tipo SSE/WS (sin backend).

