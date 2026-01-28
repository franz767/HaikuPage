# Protocolo de Desarrollo y Arquitectura: Real-World Next.js

Este documento establece las directrices avanzadas, patrones de diseño y restricciones técnicas para el desarrollo profesional con Next.js, priorizando el rendimiento (Core Web Vitals), la seguridad y la escalabilidad.

## 1. Estrategias de Renderizado: El Enfoque Híbrido
Next.js no es solo SSR; su potencia radica en la **Renderización Híbrida**. [cite_start]La IA debe evaluar la necesidad de datos en cada página para elegir la estrategia correcta[cite: 458, 747].

### A. Static Site Generation (SSG) - *La opción por defecto*
* [cite_start]**Definición:** Las páginas se generan como HTML estático en el momento de la construcción (Build Time)[cite: 706].
* **Cuándo usar:** Páginas de marketing, blogs, documentación y cualquier contenido que no cambie en cada solicitud.
* [cite_start]**Beneficios:** Máximo rendimiento (TTFB bajo), cacheable en CDN y SEO óptimo[cite: 711, 713].
* [cite_start]**Restricción:** Si el contenido cambia, se requiere una nueva "build", a menos que se combine con ISR[cite: 721].

### B. Server-Side Rendering (SSR) - *Renderizado bajo demanda*
* [cite_start]**Definición:** Genera el HTML en el servidor para **cada** solicitud entrante[cite: 473].
* [cite_start]**Cuándo usar:** Solo cuando la página requiere datos en tiempo real, geolocalización, cookies específicas de la sesión o datos que cambian milisegundo a milisegundo[cite: 475, 486].
* **Implementación:** Usar `getServerSideProps`.
* **Costos:** Mayor latencia (TTFB más alto) y mayor carga computacional en el servidor. [cite_start]Pierde la optimización estática automática[cite: 489, 1507].

### C. Incremental Static Regeneration (ISR) - *El término medio*
* [cite_start]**Definición:** Permite actualizar páginas estáticas (SSG) después del despliegue sin reconstruir todo el sitio[cite: 724].
* **Mecanismo:** Se define un tiempo de `revalidate` (en segundos). [cite_start]La primera petición después de ese tiempo sirve la versión "vieja" (stale) mientras Next.js regenera la nueva versión en segundo plano[cite: 736, 741].
* [cite_start]**Caso de uso ideal:** E-commerce con miles de productos o feeds de noticias donde la inmediatez absoluta no es crítica pero el contenido no es estático[cite: 729].

### D. Client-Side Rendering (CSR) - *Delegación al navegador*
* [cite_start]**Definición:** El servidor envía un HTML básico y el navegador descarga el bundle JS para renderizar la interfaz y obtener datos[cite: 533, 566].
* [cite_start]**Cuándo usar:** Dashboards privados, paneles de administración y páginas detrás de un login donde el SEO no es prioritario[cite: 699].
* [cite_start]**Técnica:** Usar hooks como `useEffect` para disparar la carga de datos después de la hidratación o usar `next/dynamic` con `{ ssr: false }` para componentes que dependen del objeto `window`[cite: 588, 696].

---

## 2. Arquitectura y Organización del Proyecto
Next.js impone ciertas rutas (`pages/`), pero la organización interna debe seguir patrones de escalabilidad.

### A. Estructura de Directorios
* [cite_start]**Principio Atomic Design:** Se recomienda organizar los componentes en carpetas: `atoms` (botones, inputs), `molecules` (grupos de átomos), `organisms` (secciones complejas como un navbar) y `templates` (layouts de página)[cite: 1647, 1653].
* [cite_start]**Carpeta `src`:** Mover todo el código fuente (`components`, `lib`, `styles`, `pages`) dentro de una carpeta `src/` para mantener la raíz limpia (excepto archivos de configuración)[cite: 1627].
* **Archivos de Utilidad (`lib/` vs `utils/`):**
    * [cite_start]`lib/`: Para wrappers de librerías de terceros (ej. cliente de GraphQL, cliente de Stripe)[cite: 1753].
    * [cite_start]`utils/`: Para funciones puras y lógica de negocio genérica (ej. formateadores de fecha, validadores)[cite: 1675].

### B. Archivos Especiales y Personalización
* **`_app.js`:** Es el punto de entrada para inicializar páginas. Úsalo para mantener estado global (Context/Redux), estilos globales y layouts persistentes. [cite_start]**Advertencia:** Agregar `getInitialProps` aquí deshabilita la optimización estática automática en todas las páginas[cite: 1505, 1507].
* **`_document.js`:** Úsalo exclusivamente para modificar la estructura inicial del HTML (`<html>`, `<body>`). [cite_start]No incluyas lógica de aplicación ni data fetching aquí, ya que no se ejecuta en transiciones del lado del cliente[cite: 1563, 1570].

---

## 3. Gestión de Datos y Seguridad
La separación entre el cliente y el servidor es crítica para la seguridad.

### A. Patrón de "Proxy" con API Routes
* **Regla de Oro:** Nunca consultes una base de datos directamente desde un componente de UI (React). [cite_start]Esto expone credenciales y lógica de negocio al cliente[cite: 1770, 1853].
* **Solución:** Usa **API Routes** (`pages/api`) como un backend intermedio. [cite_start]El componente llama a la API Route (ej. `/api/user`), y la API Route (que corre en el servidor) consulta la base de datos o servicios externos usando secretos de entorno (`process.env`)[cite: 1892, 1896].

### B. Manejo de Secretos
* **Variables de Entorno:** Las claves privadas (API Secrets, Database URLs) solo deben estar disponibles en el entorno de Node.js.
* **Exposición al Cliente:** Solo las variables prefijadas con `NEXT_PUBLIC_` serán inyectadas en el bundle de JavaScript del navegador. [cite_start]Usar esto con extrema precaución[cite: 3663].

### C. Autenticación
* **Preferencias:** Evitar implementaciones de autenticación personalizadas ("The bad and the ugly"). [cite_start]Usar proveedores establecidos como Auth0, Firebase o NextAuth.js para manejar sesiones, seguridad y proveedores de identidad[cite: 3247, 3396].
* [cite_start]**Sesiones:** Preferir cookies `httpOnly` para almacenar tokens de sesión (como JWT) en lugar de `localStorage`, para mitigar ataques XSS[cite: 3295].

---

## 4. Rendimiento y Core Web Vitals
Next.js ofrece herramientas integradas para cumplir con las métricas de Google. La IA debe priorizar su uso.

### A. Optimización de Imágenes (`next/image`)
* **Problema:** Las imágenes estándar (`<img>`) causan **CLS** (Cumulative Layout Shift) si no tienen dimensiones, y son pesadas.
* **Solución:** Usar el componente `<Image />`.
    * Optimiza automáticamente el formato (WebP/AVIF).
    * [cite_start]Evita CLS obligando a definir `width`/`height` o usando `layout="fill"` con un contenedor padre[cite: 1025, 1075].
    * [cite_start]Genera variantes responsivas (`srcset`) automáticamente[cite: 1102].

### B. Navegación y Prefetching
* **Componente `Link`:** Usar `next/link` para navegación interna. [cite_start]Next.js hace **prefetch** (precarga) automático de las páginas enlazadas cuando entran en el viewport, haciendo la navegación casi instantánea[cite: 904, 916].
* [cite_start]**Router imperativo:** Evitar `router.push` a menos que sea una redirección posterior a una acción (ej. login), ya que no realiza prefetch[cite: 999].

### C. Web Vitals
* [cite_start]Usar la función `reportWebVitals` en `_app.js` para medir métricas reales (LCP, FID, CLS) y enviarlas a servicios de análisis[cite: 2990].

---

## 5. Estilos y CSS
Next.js es agnóstico, pero ciertas prácticas favorecen el rendimiento y la modularidad.

* **CSS Modules:** Es la opción recomendada para estilos tradicionales. [cite_start]Genera nombres de clase únicos (scoped) automáticamente, evitando colisiones y eliminando código muerto (dead code elimination)[cite: 2238, 2248].
* **SASS/SCSS:** Soportado nativamente. Útil si el equipo ya tiene una base de código en SASS. [cite_start]Se compila a CSS plano en build-time (cero costo en runtime)[cite: 2280, 2315].
* **Styled-JSX:** Librería CSS-in-JS por defecto. [cite_start]Útil para lógica dinámica en estilos, pero tiene un costo de rendimiento en tiempo de ejecución (runtime overhead) al regenerar estilos tras la hidratación[cite: 2212, 2311].
* [cite_start]**Tailwind CSS:** Altamente recomendado por su capacidad de purgar estilos no usados (PurgeCSS) generando bundles de CSS minúsculos en producción[cite: 2462, 2533].

---

## 6. Servidores Personalizados (Custom Servers)
* [cite_start]**Advertencia:** Aunque es posible usar Express.js o Fastify como servidor de Next.js, se debe **evitar** a menos que sea estrictamente necesario[cite: 2591].
* [cite_start]**Desventaja:** Usar un servidor personalizado desactiva las optimizaciones automáticas de "Serverless Functions" en plataformas como Vercel y complica la infraestructura[cite: 2600].
* [cite_start]**Excepción:** Migraciones de apps legacy o arquitecturas complejas multi-tenant que requieren middleware personalizado antes de que Next.js tome el control[cite: 2593, 2596].

## 7. Testing
Una aplicación robusta requiere tres capas de pruebas:
* [cite_start]**Unitarias:** Jest + React Testing Library para probar funciones aisladas y renderizado de componentes[cite: 2695].
* [cite_start]**Integración:** Asegurar que los módulos funcionen juntos (ej. utilidades + componentes)[cite: 2700].
* [cite_start]**End-to-End (E2E):** Cypress para simular la interacción real del usuario (navegación, formularios, flujos completos) en un navegador real[cite: 2697, 2782].