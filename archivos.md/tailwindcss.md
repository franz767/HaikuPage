# Protocolo de Desarrollo y Arquitectura: Tailwind CSS (Craft Edition)

Este documento define los principios de diseño, reglas de configuración y flujos de trabajo para desarrollar interfaces escalables con Tailwind CSS, priorizando la utilidad sobre la semántica tradicional y la optimización en tiempo de compilación (JIT).

## 1. Filosofía: Utility-First & Low-Level
El principio rector es evitar escribir CSS personalizado. La arquitectura debe componerse de pequeñas clases utilitarias.

* **Abandono de la Semántica CSS:**
    * **Regla:** No inventar nombres de clases semánticas (`.btn-primary`, `.sidebar-wrapper`) prematuramente. Usar utilidades directamente en el HTML (`bg-blue-500 text-white py-2 px-4`).
    * **Justificación:** Reduce el cambio de contexto entre archivos, elimina el problema de nombrar cosas y asegura que el CSS deje de crecer linealmente con el proyecto.
* **HTML como Fuente de Verdad:**
    * El diseño vive en el marcado. Si se necesita cambiar el aspecto de un elemento, se modifica el HTML, no una hoja de estilos lejana.

## 2. Configuración y Sistema de Diseño (`tailwind.config.js`)
La configuración no es opcional; es donde se define el "lenguaje visual" del proyecto.

* **Extend vs. Override (Extender vs. Sobrescribir):**
    * **Regla de Oro:** Usar siempre la clave `extend` dentro de `theme` para añadir colores, espaciados o fuentes sin perder los valores por defecto de Tailwind.
    * **Override:** Solo definir claves fuera de `extend` si se desea *eliminar* explícitamente los valores por defecto (ej. para forzar una paleta de colores estricta y limitada).
* **Colores y Espaciado:**
    * No usar valores mágicos (`w-[350px]`) o colores hexadecimales arbitrarios en el código. Definirlos en el `config` para mantener la consistencia del sistema de diseño.
* **Presets:**
    * Utilizar `presets` para compartir configuraciones base (colores de marca, tipografías corporativas) entre múltiples proyectos, asegurando coherencia visual a nivel de organización.

## 3. Arquitectura de Componentes y Reutilización
Tailwind no elimina la necesidad de componentes, cambia cómo se construyen.

* **Extracción de Componentes (React/Vue/Svelte):**
    * **Método Preferido:** Si una combinación de utilidades se repite (ej. un botón), encapsularla en un componente de framework (ej. `<Button />`) en lugar de usar CSS. Esto mantiene el principio de "Single Source of Truth".
* **Directiva `@apply` (Uso Restringido):**
    * **Restricción:** Usar `@apply` solo para estilos muy específicos que no se pueden manejar con componentes (ej. estilos globales de etiquetas HTML base como `h1`, `p`, o estados complejos de librerías de terceros).
    * **Evitar:** No usar `@apply` para recrear clases semánticas tradicionales (`.card { @apply ... }`). Esto anula los beneficios de Tailwind.
* **Capa Base (`@layer base`):**
    * Usar esta directiva en el CSS principal para normalizar estilos globales (reset) o definir tipografías base, evitando la especificidad excesiva.

## 4. Diseño Responsivo: Mobile-First
Tailwind impone una metodología estricta de diseño adaptable.

* **Regla de Prefijos:**
    * Las utilidades sin prefijo (ej. `block`) aplican a **móviles** (y hacia arriba).
    * Los prefijos (`md:`, `lg:`) aplican cambios solo a partir de ese punto de quiebre hacia arriba (min-width).
    * **Prohibido:** No pensar en "escritorio primero". Nunca escribir estilos de escritorio y luego intentar arreglarlos para móvil.
* **Breakpoints Personalizados:**
    * Si los breakpoints por defecto no se ajustan al diseño, redefinirlos en `theme.screens` en el archivo de configuración, pero mantener la nomenclatura estándar (`sm`, `md`, `lg`) si es posible para facilitar la lectura.

## 5. Optimización y Producción (JIT)
El rendimiento es una característica intrínseca, no un paso posterior.

* **Configuración de `content`:**
    * **Crítico:** Configurar exhaustivamente el array `content` en `tailwind.config.js`. Tailwind (modo JIT) escanea estos archivos para generar CSS bajo demanda. Si un archivo no está aquí, sus estilos no existirán.
* **Purga Automática:**
    * No se envía CSS que no se usa. Esto garantiza que el bundle de estilos final sea minúsculo (<10kb es común), independientemente del tamaño de la aplicación.
* **Clases Dinámicas:**
    * **Advertencia:** Evitar la interpolación de cadenas para nombres de clases (ej. `bg-${color}-500`). Tailwind no puede detectar estas clases dinámicas durante el escaneo. Usar nombres de clases completos o diccionarios de mapeo.

## 6. Personalización Avanzada y Plugins
* **Modo Oscuro (`darkMode`):**
    * Configurar `darkMode: 'class'` para tener control manual mediante una clase en el `html` o `body`, en lugar de depender únicamente de la preferencia del sistema operativo (`media`).
* **Plugins Oficiales:**
    * Utilizar plugins oficiales (`@tailwindcss/forms`, `@tailwindcss/typography`) para problemas complejos como estilizar contenido Markdown o normalizar elementos de formulario, en lugar de escribir CSS personalizado sucio.