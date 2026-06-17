# Fichajes PWA - Guía Técnica de Desarrollo

Esta aplicación es una PWA (Progressive Web App) diseñada para gestionar el registro de jornada laboral, con soporte offline y sincronización en la nube mediante GitHub Contents API.

## 🚀 Inicio Rápido

1.  **Entorno Local**: Al ser una aplicación basada en archivos estáticos, puedes abrir `index.html` directamente en un navegador, aunque se recomienda usar un servidor local para habilitar todas las funciones de Service Worker:
    ```bash
    # Si tienes VS Code, usa la extensión "Live Server"
    # O con Python:
    python3 -m http.server 8080
    ```
2.  **Tecnologías**: HTML5, CSS3 (Variables), JavaScript (Vanilla), Service Workers, localStorage y GitHub Contents API.

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
-   **Límites de jornada intensiva**: La bolsa se reinicia a 0 al inicio. El primer día hábil posterior conserva únicamente el saldo positivo, con un máximo de 2 horas.

### Teletrabajo
-   Se gestiona por trimestres (T1-T4).
-   Permite marcar "Día completo" o "Tarde".
-   Muestra una bolsa restante dinámica en la columna de la tabla.

## ☁️ Integración con GitHub

La aplicación utiliza GitHub como backend gratuito de sincronización mediante un fichero JSON versionado en un repositorio del usuario.

-   **API**: `https://api.github.com/repos/{owner}/{repo}/contents/{path}`.
-   **Métodos**:
    -   `GET`: descarga el estado remoto.
    -   `PUT`: crea o actualiza el fichero JSON con el estado completo.
-   **Datos sincronizados**: configuración y meses completos.
-   **Credenciales**: se usa un Personal Access Token con permisos mínimos sobre el repositorio elegido.
-   **Limitación de seguridad**: al ser una PWA estática sin servidor, el token se guarda en `localStorage`. Debe usarse un token restringido y revocable.

## 💾 Persistencia y Sincronización

1.  **Local**: Los datos se guardan en `localStorage` (`fichajes_v2_cache`) en cada cambio.
2.  **Remoto**: si GitHub está configurado y hay conexión (`navigator.onLine`), los cambios se sincronizan con la Contents API.
3.  **Conflictos**: GitHub responde `409` si el fichero remoto cambió con otra revisión. La aplicación bloquea la subida automática y muestra estado de conflicto.

## 🛠 Mantenimiento

### Actualizar Versión
Para forzar a los clientes a descargar una nueva versión del código:
1.  Modifica el `CACHE_NAME` en `sw.js` (ej: `fichajes-v2.1.1`).
2.  Actualiza el número de versión visual en el `header` de `index.html`.

### Backup
Se recomienda encarecidamente a los usuarios exportar su copia en formato **JSON** antes de realizar cambios estructurales o limpiezas de caché del navegador.

---
*Documentación técnica del proyecto.*
