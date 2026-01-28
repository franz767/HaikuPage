# Protocolo de Desarrollo y Arquitectura: React (Edición The Road to React)

Este documento define los principios de diseño, patrones arquitectónicos y restricciones técnicas para el desarrollo de aplicaciones Single Page Applications (SPA) con React puro, priorizando el uso de Hooks, la composición funcional y el manejo de estado nativo.

## 1. Filosofía de Componentes y JSX
El núcleo del desarrollo debe centrarse en la **inmutabilidad** y la **composición**.

* **Componentes Funcionales (Function Components):**
    * **Regla:** Utilizar exclusivamente componentes funcionales. Las clases (`Class Components`) se consideran legado y no deben usarse salvo en casos extremos (ej. Error Boundaries antiguos).
    * **Estructura:** Definir componentes como funciones flecha (`const App = () => { ... }`) para consistencia en el manejo del contexto `this` (aunque irrelevante en hooks, mantiene el estilo moderno).
* **Composición sobre Herencia:**
    * Utilizar la prop `children` para crear componentes contenedores (Layouts, Cards) en lugar de heredar lógica.
    * **Slot Pattern:** Para componentes complejos, pasar componentes UI como props (ej. `<List header={<Header />} />`) en lugar de codificarlos internamente.
* **Listas y Claves (Keys):**
    * Jamás usar el índice del array (`index`) como `key` si la lista puede cambiar de orden, filtrarse o modificarse. Usar IDs estables y únicos (ej. `item.objectID`).
* **Handlers y Callbacks:**
    * Nombrar los props de eventos como `onEvent` (ej. `onDismiss`) y las funciones manejadoras internas como `handleEvent` (ej. `handleDismiss`). Esto facilita el rastreo del flujo de datos ("Data Down, Actions Up").

## 2. Gestión del Estado (State Management)
La gestión del estado debe ser "tan local como sea posible, y tan global como sea necesario".

* **Estado Local (`useState`):**
    * Para estados simples (booleanos, inputs de formularios, toggles de UI).
    * **Levantamiento del Estado (Lifting State Up):** Si dos componentes hermanos necesitan el mismo estado, mover el estado a su ancestro común más cercano y pasarlo hacia abajo como props.
* **Estado Complejo (`useReducer`):**
    * **Regla:** Si un estado depende del estado anterior de formas complejas, o si hay múltiples sub-valores cambiando juntos, transicionar de `useState` a `useReducer`.
    * Esto desacopla la lógica de actualización de la UI y facilita las pruebas unitarias de la lógica de negocio (el reducer es una función pura).
* **Estado Global Implícito (Context API):**
    * Usar React Context para datos que son verdaderamente globales (Temas, Usuario Autenticado, Preferencias de Idioma).
    * **Advertencia:** No usar Context para reemplazar el paso de props (Prop Drilling) si solo se evitan 1 o 2 niveles. El exceso de Context dificulta la reutilización de componentes.
* **Inmutabilidad:**
    * Nunca mutar el estado directamente (`state.value = 1`). Usar siempre las funciones actualizadoras (`setState`, `dispatch`) y patrones inmutables (spread operator `...`, `map`, `filter`, `concat`).

## 3. Efectos Colaterales y Hooks (Side-Effects)
El manejo correcto de `useEffect` es crítico para evitar bucles infinitos y fugas de memoria.

* **Dependencias de Efectos:**
    * **Regla de Oro:** Siempre incluir todas las variables externas usadas dentro del efecto en el array de dependencias `[]`. Mentirle a React sobre las dependencias causa bugs de sincronización.
    * Si una función causa que el efecto se dispare demasiado, usar `useCallback` para memorizar la función, o mover la definición de la función *dentro* del `useEffect`.
* **Hooks Personalizados (Custom Hooks):**
    * Abstraer lógica reutilizable (ej. `useSemiPersistentState`, `useDataApi`) en hooks personalizados.
    * Nomenclatura obligatoria: Deben comenzar con el prefijo `use`.
* **Refs (`useRef`):**
    * Usar para acceder al DOM imperativamente (ej. poner foco en un input) o para mantener valores mutables que no deben disparar re-renderizados (como temporizadores o variables de instancia).

## 4. Obtención de Datos (Data Fetching)
La obtención de datos debe ser declarativa y manejar todos los estados posibles de la asincronía.

* **Fetch en `useEffect`:** Realizar llamadas a API dentro de `useEffect` con un array de dependencias vacío `[]` (para montaje) o con dependencias específicas (para actualizaciones).
* **Gestión de Estados de Carga:**
    * Implementar siempre un reductor o estado para manejar: `isLoading` (carga), `isError` (error) y `data` (éxito).
    * Evitar condicionales ternarios anidados complejos en el JSX. Usar retornos tempranos (Early Returns) para estados de carga y error.
* **Evitar "Race Conditions":** Al hacer fetch de datos que dependen de props cambiantes, implementar un mecanismo de cancelación (flag `didCancel`) dentro del efecto para asegurar que solo se actualice el estado con la última petición válida si el componente se desmonta o la prop cambia rápidamente.

## 5. Arquitectura y Organización de Archivos
* **Estructura Modular:**
    * Evitar un archivo `App.js` monolítico. Descomponer en módulos pequeños y enfocados.
    * `src/components/`: Componentes reutilizables de UI.
    * `src/hooks/`: Hooks personalizados.
    * `src/utils/` o `src/services/`: Lógica pura de JS y llamadas a API (Axios/Fetch).
* **Index como Entrada:** Usar archivos `index.js` para exportar componentes públicos de una carpeta, permitiendo importaciones más limpias (`import List from './List'` en lugar de `./List/List`).

## 6. Testing y Calidad
El enfoque debe ser probar el comportamiento desde la perspectiva del usuario, no la implementación interna.

* **Herramientas:** Jest (Runner) + React Testing Library (RTL).
* **Filosofía:**
    * **Unit Testing:** Probar funciones puras (como reducers) de forma aislada.
    * **Integration Testing (Componentes):** Usar RTL para renderizar componentes y simular interacciones (`fireEvent`, `userEvent`).
    * **No testear estados internos:** No verificar si `useState` cambió. Verificar si el DOM cambió (ej. apareció un texto, cambió una clase) en respuesta a una acción.
* **Snapshots:** Usar con moderación para detectar cambios inesperados en la estructura del DOM, pero no depender exclusivamente de ellos.

## 7. Estilizado (Styling)
* **CSS-in-JS (Recomendado por el libro):** Utilizar **Styled Components** para encapsular estilos a nivel de componente, evitando colisiones de nombres y permitiendo estilos dinámicos basados en props.
* **Alternativa:** CSS Modules (`styles.module.css`) para una separación más tradicional pero con scope local.