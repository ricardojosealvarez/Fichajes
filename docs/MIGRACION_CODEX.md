# Continuidad de Fichajes en Codex

Documento de referencia preparado el 7 de noviembre de 2026. Describe el estado inspeccionado, no sustituye la comprobación del repositorio o los servicios en una sesión futura.

## Identificación y estado

- Repositorio: https://github.com/ricardojosealvarez/Fichajes
- Rama de referencia: `main`.
- Commit de referencia: `9e73754e90a1c879f68d4411c202235798e6016b` (`feat(config): annualize workday settings`).
- Versión de la aplicación y de la caché: `2.20.0`.
- El usuario informó en esta conversación de que el commit local y `main` de GitHub se habían contrastado externamente y coincidían. La auditoría anterior no pudo consultar directamente GitHub por una restricción de conexión. Esa coincidencia es una comprobación comunicada por el usuario, no una verificación independiente de esta sesión.
- Al comienzo de esta fase, el árbol local estaba limpio. Este documento es posterior al commit de referencia y debe trasladarse por separado hasta que se incorpore al repositorio por un procedimiento autorizado.

Fuentes: conversación de migración, `git log`, `git status`, `index.html` y `sw.js`.

## Propósito y funcionalidades

Fichajes registra la jornada laboral y permite consultar fichajes, cálculos de jornada y bolsas de horas, teletrabajo, estadísticas, festivos y configuración. Incluye un panel diario, gestión de meses, manual y notas de versión. Permite exportar e importar una copia JSON y exportar o importar meses mediante CSV.

Fuentes: `index.html`, `MANUAL_USUARIO.md` y pruebas en `index.test.js`.

## Arquitectura y dependencias

- Aplicación web de una sola página, HTML, CSS y JavaScript vanilla; interfaz y lógica están actualmente integradas en `index.html`.
- `manifest.json` y `sw.js` proporcionan configuración PWA y caché. El service worker sirve navegación con prioridad de red, otros recursos con prioridad de caché y excluye peticiones a otros orígenes. La versión visible procede de `RELEASE_NOTES` en `index.html`; la de caché se define en `sw.js`.
- La aplicación guarda datos en `localStorage`, bajo `fichajes_v2_cache`, y utiliza autenticación y API REST de Supabase para sincronización. Los tokens de sesión también se guardan en el navegador: no incluirlos en documentación, copias de trabajo ni informes.
- La interfaz solicita fuentes a Google Fonts mediante una hoja de estilos externa; comprobar su disponibilidad y apariencia sin conexión. Esa dependencia no está incluida en el repositorio.
- `index.test.js` utiliza módulos integrados de Node.js, entre ellos `node:test`. No hay `package.json`, lockfile ni versión de Node fijada en el repositorio.
- `tools/render_manual_html.py` usa la biblioteca estándar de Python. `tools/build_user_manual_docx.py` usa `python-docx` para generar el DOCX. Ambos escriben archivos del proyecto; ejecutarlos solo cuando proceda regenerar el manual.
- No se identificaron submódulos Git. Los datos, el servicio Supabase, las cuentas, la configuración global de Codex y el almacenamiento de cada navegador no forman parte del repositorio.

Fuentes: `index.html`, `sw.js`, `manifest.json`, `index.test.js`, scripts de `tools/` e índice Git.

## Decisiones y antecedentes verificables

| Tema | Decisión o cambio | Fuente y límites |
| --- | --- | --- |
| Sincronización | Se corrigió el riesgo de sobrescritura remota, después se restauró la persistencia Supabase y se reforzó la recuperación de datos. | Commits `17e17f5`, `22d687a` y `de513db`. Los títulos y cambios son verificables en Git; no se recuperó toda la discusión original. |
| Peticiones remotas y caché | Se excluyeron las peticiones a la API remota de la caché del service worker. | Commit `204b728`, `sw.js` y prueba en `index.test.js`. |
| Reanudación | Al volver a la aplicación se incorporó una actualización desde Supabase; una prueba contempla que no haya operaciones locales pendientes. | Commit `e79a95a` e `index.test.js`. No asumir ausencia de conflictos sin comprobar el estado real. |
| Jornada anual | Las reglas se configuran por año; la configuración anterior sirve de base y la bolsa se arrastra entre años. La documentación indica conservar localmente cambios pendientes si falta la columna remota. | Commit `9e73754`, README, código y pruebas. |
| Teletrabajo anual | Bolsas trimestrales separadas por año, conservando compatibilidad con valores anteriores asociados a 2026. | Commit `c8febbe`, README, código y pruebas. |
| Calendario de festivos | Se añadieron calendarios configurables y generación anual para Andalucía, con pruebas para preservar personalizaciones y fichajes. | Commits `eac327c` y `14bc057`; `index.test.js`. |
| Google Calendar | Se propuso mostrar avisos de eventos y descartarlos individualmente. El usuario canceló expresamente el trabajo; la respuesta histórica indicó que se restauró el estado anterior y el árbol quedó limpio. No tratarlo como tarea aprobada ni como funcionalidad existente. | Conversación local de Codex del 24 de septiembre de 2026. Cualquier configuración externa posterior no se ha verificado. |

El historial de Git registra además mejoras de interfaz adaptable, panel diario, estadísticas, avisos de sincronización y recomendación de salida del viernes. Los títulos de commits no bastan para recuperar todos los motivos o alternativas debatidas.

## Estado y asuntos pendientes de comprobación

- Comprobar en el Mac el acceso a GitHub, el commit realmente clonado y las herramientas disponibles. No se ejecutaron pruebas durante la preparación de este documento.
- Confirmar con acceso autorizado el estado del despliegue, del esquema de Supabase y de sus copias de seguridad. `tools/enable_annual_telework.sql` y `tools/enable_annual_workday.sql` definen columnas JSONB en `public.config`; su existencia no demuestra que se hayan aplicado. No ejecutarlos sin una tarea y autorización apropiadas.
- Verificar, con el usuario y sin exponer datos personales, si hay cambios locales sin sincronizar y si existe una copia de seguridad utilizable. La copia JSON contiene configuración y meses; tratarla como información sensible.
- Revisar y actualizar la documentación en una tarea posterior si se autoriza: el README contiene afirmaciones antiguas de almacenamiento exclusivamente local, la clave `fichajes_v1` y referencias a `CACHE_VERSION`; el código actual usa Supabase, `fichajes_v2_cache` y `APP_VERSION`. No suponer que toda afirmación de `GEMINI.md` sigue vigente sin contrastarla con el código.
- Las posibles mejoras futuras no verificadas y los debates no registrados en las fuentes consultadas permanecen desconocidos. La integración de Google Calendar fue cancelada, no queda identificada aquí como trabajo pendiente.

## Uso y pruebas en macOS

Con Git, Python 3, Node.js compatible con `node:test` y un navegador moderno disponibles, desde la raíz del proyecto:

```sh
python3 -m http.server 8080
```

Abrir `http://localhost:8080/`. El servicio local y su origen tienen almacenamiento propio; no son el mismo almacenamiento que la aplicación alojada u otro navegador. El comportamiento de instalación PWA depende del navegador y del contexto; verificarlo en el dispositivo. Para detener el servidor, usar `Ctrl+C` en la terminal.

Para ejecutar las pruebas existentes:

```sh
node --test index.test.js
```

La versión mínima compatible de Node no está fijada ni se ha comprobado en macOS. Ejecutar primero con datos de prueba y sin iniciar sesión en una cuenta real; las pruebas usan funciones y dobles definidos en el archivo. No se ha validado aquí la ejecución en el Mac ni el despliegue.

Fuentes: `README.md`, `index.test.js` y scripts del proyecto. Los comandos se documentan para uso futuro; no se han ejecutado en esta fase.

## Datos, cuentas y seguridad

El repositorio no contiene el almacenamiento de los navegadores ni garantiza que Supabase tenga los cambios pendientes. Un clon nuevo no recupera por sí mismo esos datos. Antes de borrar perfiles o retirar el equipo anterior, verificar con el usuario el estado de sincronización y acordar una copia y restauración seguras; no exportar ni importar datos sin autorización para esa operación.

La aplicación contiene configuración de cliente de Supabase; su seguridad depende también de la autenticación, las políticas y permisos del servidor, que no se han auditado aquí. No copiar contraseñas, tokens de sesión, claves privadas ni credenciales de Codex a este documento o a Git. Acceder a las cuentas mediante sus mecanismos autorizados. No cambiar RLS ni ejecutar SQL como parte de la simple puesta en marcha local.

## Instrucciones para una nueva sesión de Codex

1. Abrir el clon correcto y leer `AGENTS.md`, este documento, `README.md` y los archivos relevantes para la tarea. Comprobar `git status`, rama y último commit antes de editar.
2. Considerar este documento como una fotografía: verificar el código, datos y servicios actuales antes de adoptar sus conclusiones. Mantener intactas las modificaciones ajenas.
3. Respetar la regla de versionado del `AGENTS.md` del proyecto para cambios en la aplicación y sincronizar la versión de caché del service worker cuando corresponda. El propio archivo es independiente de Windows; propone carpetas separadas de estilos y scripts, aunque la implementación actual los integra en `index.html`.
4. Tratar por separado las instrucciones globales del equipo anterior: no están en Git y pueden contener rutas y reglas para Windows u otros proyectos. Revisar únicamente las que el usuario quiera conservar y adaptarlas al entorno nuevo; no copiarlas íntegramente.
5. Para cambios de persistencia, sincronización o cálculos, inspeccionar código y pruebas existentes, preservar compatibilidad de datos y ejecutar verificaciones proporcionadas. No tocar servicios o datos reales por defecto.

## Alcance de la recuperación histórica

Se consultaron el historial Git, archivos del proyecto y el registro local y archivado de sesiones accesibles mediante búsquedas por ruta, repositorio, identificadores y referencias al proyecto. Se identificó y consultó una conversación local de Codex del 24 de septiembre de 2026; contiene también trabajo de otro proyecto que no se atribuye a Fichajes. La conversación actual aporta la comprobación externa del commit comunicada por el usuario.

La búsqueda no demuestra que todas las sesiones pasadas se hayan conservado, indexado o identificado, ni que un historial sin referencias explícitas haya sido encontrado. No se han recuperado conversaciones completas, decisiones no registradas, incidencias externas, tareas pendientes no documentadas ni el estado real de Supabase. Ninguna de esas ausencias demuestra que no existan. No se accedió a fichajes personales, se exportó almacenamiento, se cambió configuración externa ni se ejecutó SQL.
