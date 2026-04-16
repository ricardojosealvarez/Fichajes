# Fichajes PWA - Guía Técnica de Desarrollo

Esta aplicación es una PWA (Progressive Web App) diseñada para gestionar el registro de jornada laboral, con soporte para trabajo offline y sincronización en la nube mediante Supabase.

## 🚀 Inicio Rápido

1.  **Entorno Local**: Al ser una aplicación basada en archivos estáticos, puedes abrir `index.html` directamente en un navegador, aunque se recomienda usar un servidor local para habilitar todas las funciones de Service Worker:
    ```bash
    # Si tienes VS Code, usa la extensión "Live Server"
    # O con Python:
    python3 -m http.server 8080
    ```
2.  **Tecnologías**: HTML5, CSS3 (Variables), JavaScript (Vanilla), Service Workers, y Supabase REST API.

## 🛠 Estructura del Proyecto

-   `index.html`: Contiene la interfaz, los estilos (CSS-in-HTML) y la lógica de negocio (JavaScript).
-   `sw.js`: Gestiona la caché y permite que la aplicación funcione sin conexión (Offline-first).
-   `manifest.json`: Define la identidad de la PWA para su instalación en dispositivos móviles y escritorio.

## 📋 Lógica de Negocio Principal

### Cálculo de Jornada (`calcSuma`)
La aplicación implementa las siguientes reglas de cómputo:
-   **Entrada Efectiva**: Se toma el máximo entre la hora de entrada real y la hora mínima configurada (`cfg-hour-in`).
-   **Salida Efectiva**: Considera la hora mínima de salida y añade ajustes si el inicio de la comida es anterior a dicha hora.
-   **Descuentos**: 
    -   Comida: Se resta el máximo entre la duración real y el tiempo mínimo configurado.
    -   Desayuno: Solo se resta el exceso sobre el tiempo permitido (ej: 15 min).
-   **Máximo**: Ninguna jornada computa más de 11 horas diarias.

### Bolsa de Horas (ABS)
-   **Viernes**: Se aplica un tope (cap) automático (5h en invierno, 2h en jornada intensiva).
-   **Resets**: La bolsa se reinicia a 0 automáticamente al inicio y fin de la jornada intensiva.

### Teletrabajo
-   Se gestiona por trimestres (T1-T4).
-   Permite marcar "Día completo" o "Tarde".
-   Muestra una bolsa restante dinámica en la columna de la tabla.

## ☁️ Integración con Supabase

La aplicación utiliza la API REST de Supabase para la persistencia. Los endpoints principales son:
-   **Auth**: Registro e inicio de sesión gestionados en `<https://ruhcjikrtgnwcrbacwcc.supabase.co/auth/v1/>`.
-   **Tablas**:
    -   `users`: Perfiles de usuario.
    -   `months`: Cabeceras de meses por usuario.
    -   `days`: Registros individuales de fichaje vinculados a un mes.
    -   `config`: Preferencias personalizadas por usuario.

## 💾 Persistencia y Sincronización

1.  **Local**: Los datos se guardan en `localStorage` (`fichajes_v2_cache`) en cada cambio.
2.  **Remoto**: Si el usuario está autenticado y hay conexión (`navigator.onLine`), los cambios se sincronizan mediante `UPSERT` a Supabase.
3.  **Conflictos**: Se utiliza la cabecera `Prefer: resolution=merge-duplicates` para asegurar que los datos locales y remotos se mantengan íntegros.

## 🛠 Mantenimiento

### Actualizar Versión
Para forzar a los clientes a descargar una nueva versión del código:
1.  Modifica el `CACHE_NAME` en `sw.js` (ej: `fichajes-v2.1.1`).
2.  Actualiza el número de versión visual en el `header` de `index.html`.

### Backup
Se recomienda encarecidamente a los usuarios exportar su copia en formato **JSON** antes de realizar cambios estructurales o limpiezas de caché del navegador.

---
*Documentación generada por Gemini Code Assist.*
```

He estructurado el documento para que sirva tanto a un desarrollador que herede el código como a ti mismo para recordar las reglas de cálculo de la "bolsa" y la integración con la base de datos. 

¿Te gustaría que profundizara en alguna sección técnica específica, como la configuración de las tablas en Supabase o el manejo de la caché en el Service Worker?

<!--
[PROMPT_SUGGESTION]¿Cómo puedo mejorar la seguridad de las claves de Supabase en index.html?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Explícame detalladamente cómo funciona el sistema de caché en sw.js[/PROMPT_SUGGESTION]
