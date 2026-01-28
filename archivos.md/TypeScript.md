# Protocolo de Desarrollo y Arquitectura: TypeScript (Effective Edition)

Este documento define los principios rectores, modelos mentales y restricciones técnicas para escribir TypeScript robusto, idiomático y mantenible, basado en las 83 prácticas específicas de "Effective TypeScript".

## 1. Filosofía y Modelo Mental
El error más común es tratar a TypeScript como un lenguaje nominal (como Java/C#). TypeScript es **Estructural** y se basa en el comportamiento en tiempo de ejecución de JavaScript.

* **Tipado Estructural (Structural Typing):**
    * **Regla:** Diseñar tipos basándose en la *forma* de los datos, no en su nombre. Si un objeto tiene las propiedades requeridas, es compatible, independientemente de cómo se haya declarado o construido.
    * **Implicación:** Estar preparado para que las interfaces acepten objetos con "exceso de propiedades" (open types), excepto durante la asignación directa de literales.
* **Tipos como Conjuntos de Valores (Types as Sets):**
    * Pensar en los tipos no como clases, sino como *conjuntos*.
    * `never` es el conjunto vacío (ningún valor).
    * `unknown` es el conjunto universal (todos los valores).
    * `type A | B` es la unión de conjuntos (valores que son A o B).
    * `type A & B` es la intersección (valores que tienen propiedades de A *y* B).
* **Independencia de Emisión:**
    * Los tipos son eliminados totalmente en la compilación. No pueden afectar la lógica en tiempo de ejecución.
    * **Prohibido:** Usar `interface` o `type` para verificaciones con `instanceof` o en lógica de negocio (`if (arg is MyType)`). Usar "Tagged Unions" (propiedad discriminante) para esto.

## 2. Configuración y Estrictez
La configuración del compilador no es opcional; define el dialecto del lenguaje que se está usando.

* **Modo Estricto Mandatorio:**
    * Configurar siempre `"strict": true` en `tsconfig.json`.
    * **`noImplicitAny`:** Fundamental. Sin esto, TypeScript no es efectivo. Evita que la inferencia falle silenciosamente a `any`.
    * **`strictNullChecks`:** Obligatorio para evitar errores de "undefined is not an object". Fuerza a manejar `null` y `undefined` explícitamente en cada acceso.

## 3. Gestión del Tipo `any`
El tipo `any` no es solo "cualquier cosa", es un **silenciador del sistema de tipos**. Su uso es radiactivo.

* **Contención de `any`:**
    * Si es inevitable usar `any` (ej. librería externa mal tipada), acotar su alcance al mínimo posible (dentro de una función, castear inmediatamente). Nunca retornar `any` desde una función pública.
* **Preferir `unknown` sobre `any`:**
    * Si no se conoce el tipo, usar `unknown`. Obliga al consumidor a realizar una comprobación de tipo (narrowing) antes de usar el valor, manteniendo la seguridad.
* **Evolución de `any` implícito:** Tener cuidado con variables declaradas sin tipo (`let x;`) que evolucionan según el flujo de control. Es preferible tiparlas explícitamente.

## 4. Diseño de Tipos e Inferencia
Dejar que TypeScript trabaje por ti. No "tatuar" tipos en cada variable.

* **Inferencia vs. Explicitud:**
    * **Regla:** No anotar tipos que TypeScript puede inferir trivialmente (ej. `let x = 10` es mejor que `let x: number = 10`).
    * **Excepción:** Anotar siempre los tipos de **retorno de funciones** públicas y parámetros. Esto asegura el contrato de la API y evita fugas de tipos internos.
* **Exceso de Propiedades (Excess Property Checking):**
    * Entender que TypeScript solo verifica propiedades extra cuando se asigna un objeto *literal* directamente. Usar variables intermedias puede saltarse esta verificación (lo cual es correcto bajo tipado estructural, pero sorprendente).
* **Inmutabilidad por Diseño:**
    * Usar `readonly` en arrays y propiedades (`readonly number[]` o `ReadonlyArray<number>`) por defecto para funciones que no deben mutar sus entradas. Esto previene toda una clase de bugs por mutación accidental.

## 5. Organización y Generación de Tipos
* **DRY en Tipos (Don't Repeat Yourself):**
    * No duplicar interfaces. Usar utilidades de mapeo (`Pick`, `Omit`, `Partial`, `ReturnType`) para derivar nuevos tipos a partir de una "fuente de verdad" única.
    * Usar `typeof` para generar tipos a partir de valores/constantes existentes, evitando desincronización entre código y tipos.
* **Index Signatures:**
    * Evitar `[key: string]: any` a menos que sea realmente un objeto de diccionario dinámico. Preferir interfaces precisas o `Record<K, V>`.

## 6. Interoperabilidad y Migración
* **@types:** Instalar siempre las definiciones de tipos para dependencias (`@types/libreria`) como `devDependencies`.
* **Declaración de Módulos:** Si una librería no tiene tipos, crear un archivo `.d.ts` local con tipos mínimos (`declare module 'lib-name';`) en lugar de desactivar el chequeo de tipos globalmente.

## 7. Prácticas Modernas (Effective)
* **Async/Await:** Preferir siempre `async/await` sobre promesas crudas (`.then`). TypeScript maneja mejor la inferencia de tipos de retorno en funciones asíncronas.
* **Mapeo de Tipos:** Usar "Mapped Types" para iterar sobre claves de un objeto y asegurar que, si se añade una clave al objeto original, los tipos derivados se rompan o actualicen automáticamente (sincronización forzada).