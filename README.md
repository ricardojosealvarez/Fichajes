# Fichajes PWA — Instrucciones de despliegue

## Ficheros incluidos

```
fichajes/
├── index.html      ← Aplicación completa
├── manifest.json   ← Configuración PWA (nombre, icono, colores)
├── sw.js           ← Service worker (cache offline + actualizaciones)
├── icon-192.png    ← Icono para Android / escritorio
└── icon-512.png    ← Icono de alta resolución
```

Los **datos se guardan automáticamente** en el navegador (localStorage).
No se envía nada a ningún servidor externo.

---

## Opción A — GitHub Pages (recomendada, gratuita)

1. Crea una cuenta en https://github.com si no tienes una
2. Crea un repositorio nuevo (ej: `fichajes`), márcalo como **público**
3. Sube los 5 ficheros (botón "Add file → Upload files")
4. Ve a **Settings → Pages → Branch: main → Save**
5. En 1-2 minutos tu app estará en `https://TU-USUARIO.github.io/fichajes`

**Para actualizar la lógica:**
- Abre `index.html` en GitHub → botón lápiz (editar)
- Haz los cambios y pulsa "Commit changes"
- La app se actualiza automáticamente en el siguiente acceso

---

## Opción B — Netlify (más simple, gratuita)

1. Ve a https://app.netlify.com y crea una cuenta
2. Arrastra la carpeta `fichajes/` al área "Deploy manually"
3. Obtén tu URL en segundos (ej: `https://random-name.netlify.app`)
4. Para personalizar el dominio: Settings → Domain management

**Para actualizar:**
- Vuelve a Netlify → "Deploys" → arrastra la carpeta actualizada

---

## Opción C — Servidor local (máxima privacidad)

Requiere tener Python instalado:

```bash
cd fichajes/
python3 -m http.server 8080
```

Accede desde el mismo ordenador en `http://localhost:8080`
(No instalable como PWA desde localhost sin HTTPS, pero funciona perfectamente como web)

Para HTTPS local con certificado autofirmado:
```bash
pip install trustme
# o usa caddy: https://caddyserver.com
```

---

## Instalar como app en el dispositivo

### Chrome / Edge (escritorio):
- Abre la URL → icono de instalación en la barra de direcciones → "Instalar"
- O menú ⋮ → "Instalar Fichajes"

### Android (Chrome):
- Abre la URL → banner automático "Añadir a pantalla de inicio"
- O menú ⋮ → "Añadir a pantalla de inicio"

### iOS (Safari):
- Abre la URL en Safari → botón compartir → "Añadir a pantalla de inicio"

---

## Actualizar la aplicación

Cuando se despliega una nueva versión de `index.html`:

1. El service worker detecta el cambio en el siguiente acceso con conexión
2. Descarga la nueva versión en segundo plano
3. La próxima vez que se abra la app (o se recargue), ya usa la versión nueva

Para forzar actualización inmediata: incrementa `CACHE_VERSION` en `sw.js`
(ej: `fichajes-v1` → `fichajes-v2`)

---

## Persistencia de datos

### Configuración de jornada por año (v2.20.0)

`Año de la jornada` permite configurar las horas de invierno y verano, las fechas
de intensiva y las reglas horarias de cada año, incluso antes de crear sus meses.
Los cálculos usan el año de cada fichaje, también en periodos de estadísticas
que cruzan diciembre y enero. La bolsa de horas se arrastra entre años naturales.

La configuración anterior se conserva como base para los años sin configurar.
Al editar un año, sus ajustes se guardan de forma independiente; no se actualiza
la base ni se alteran los demás años. La bolsa inicial sigue siendo un valor
global aplicado al comienzo del histórico, no al inicio de cada enero.

Antes de publicar, ejecutar `tools/enable_annual_workday.sql` en el proyecto de
Supabase de Fichajes. Añade únicamente `config.jornada_anual` como JSONB y no
modifica fichajes, campos anteriores ni políticas RLS. El almacenamiento local
y los backups incluyen `config.workdayByYear`; los backups antiguos siguen
siendo compatibles. Si falta la columna remota, la configuración se conserva
localmente y queda pendiente de sincronización, sin descartar el cambio anual.

### Bolsas trimestrales de teletrabajo por año (v2.19.0)

El campo `Año de las bolsas trimestrales` permite configurar T1–T4 de cada año,
incluso antes de crear sus meses. Al cambiar de mes, el panel muestra su año.
Las bolsas existentes se conservan en 2026. Los años sin configurar empiezan
en `00:00`; sus consumos y avisos se calculan de forma independiente.
Las duraciones admiten más de 23 horas, por ejemplo `120:00`.

Antes de publicar esta versión, ejecutar `tools/enable_annual_telework.sql`
en el editor SQL del proyecto de Supabase de Fichajes. Añade únicamente la
columna JSONB `config.teletrabajo_anual`, sin cambiar las columnas anteriores
ni los fichajes. La consulta final debe mostrar la columna como `jsonb`.
La aplicación conserva los valores anteriores en `telet1`–`telet4` para 2026
y usa la nueva columna para guardar todos los años.

El almacenamiento local y los backups JSON incluyen `config.teleworkByYear`.
Los backups anteriores siguen siendo importables y sus cuatro bolsas se
asignan a 2026. Si falta la columna de Supabase, los cambios permanecen
guardados localmente y la sincronización indica el error; tras añadirla,
se puede reintentar la sincronización.

### Almacenamiento local

Los datos se guardan en `localStorage` del navegador bajo la clave `fichajes_v1`.

- Se conservan entre sesiones y reinicios del navegador
- Son locales al dispositivo y navegador donde se usa la app
- Para exportar/hacer backup: usa el botón "↓ Exportar CSV" dentro de la app
- Si se borran los datos del navegador (caché/cookies), se pierden los fichajes

> Para backup automático en la nube, considera la Opción A o B con sincronización
> de `localStorage` a un backend — es una mejora posible en el futuro.
