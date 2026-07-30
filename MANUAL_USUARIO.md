# Manual de usuario de Fichajes

Versión de la aplicación: 2.15.0

Fecha del manual: 2026-07-30

## 1. Propósito

Fichajes es una aplicación web instalable para registrar jornadas laborales, controlar la bolsa de horas, marcar días no hábiles, gestionar teletrabajo y conservar copias de seguridad de los datos.

La aplicación funciona desde navegador moderno y puede instalarse como PWA en escritorio o móvil. Los datos se guardan localmente en el navegador y, con sesión iniciada, se sincronizan con la cuenta del usuario.

## 2. Requisitos

- Navegador moderno compatible con JavaScript ES6.
- Conexión a internet para iniciar sesión, crear cuenta, sincronizar datos y actualizar la aplicación.
- Acceso HTTPS si se quiere instalar como aplicación en el dispositivo.
- Cuenta de usuario creada desde la pantalla inicial de Fichajes.

## 3. Acceso y cuenta

### 3.1 Iniciar sesión

1. Abrir la URL de la aplicación.
2. Seleccionar la pestaña `Iniciar sesión`.
3. Introducir email y contraseña.
4. Pulsar `Iniciar sesión`.

Si la sesión es válida, se cargan los meses, la configuración y los fichajes asociados a la cuenta.

### 3.2 Crear cuenta

1. Abrir la URL de la aplicación.
2. Seleccionar la pestaña `Crear cuenta`.
3. Introducir email.
4. Introducir contraseña de al menos 6 caracteres.
5. Repetir la contraseña.
6. Pulsar `Crear cuenta`.

Tras crear la cuenta, la aplicación inicia sesión y prepara la configuración inicial.

### 3.3 Cerrar sesión

Pulsar `Sign Out` en la cabecera. La sesión se elimina del navegador y se vuelve a mostrar la pantalla de acceso.

## 4. Pantalla principal

La pantalla se divide en cuatro zonas:

- Cabecera: contiene el selector de vista `FICHAJES` / `ESTADÍSTICAS`, los meses, las acciones rápidas, el estado de sincronización, los fichajes pendientes, el acceso al manual, la versión y el cierre de sesión.
- Panel rápido `Hoy`: resume el estado y las métricas del día actual.
- Panel lateral: contiene pendientes, configuración, teletrabajo, festivos, resumen mensual, copias de seguridad, importación/exportación y acciones.
- Área principal: muestra la tabla mensual o el dashboard de estadísticas.

El panel lateral puede ocultarse o mostrarse con el botón situado en su parte superior. En móvil se abre mediante `PANEL` y se presenta por encima del contenido.

### 4.1 Cambiar de vista

- `FICHAJES`: muestra el panel `Hoy`, la tabla del mes y las herramientas de edición.
- `ESTADÍSTICAS`: muestra indicadores y gráficos del periodo seleccionado.

Al entrar en `ESTADÍSTICAS`, las acciones de creación de mes y fichaje se ocultan para dejar espacio al análisis.

### 4.2 Panel rápido Hoy

El panel `Hoy` aparece sobre la tabla y se actualiza automáticamente al cambiar de fecha.

Según la situación puede mostrar:

- Estado: sin iniciar, en curso, completado, horario a revisar, día no hábil, fin de semana o mes sin crear.
- Entrada y salida.
- Salida y total previstos cuando la aplicación puede calcularlos.
- Diferencia diaria y saldo de bolsa.
- Marca de teletrabajo.

El botón del panel abre directamente el fichaje del día. Si el mes actual todavía no existe, permite abrir el formulario para crearlo.

### 4.3 Uso en móvil y tablet

- La tabla se transforma en tarjetas para facilitar la lectura.
- Los campos secundarios permanecen disponibles desde el modal de edición.
- El panel lateral se abre con `PANEL` y se cierra con su botón de cierre o pulsando el fondo.
- Los modales se presentan como paneles inferiores.
- En pantallas estrechas puede ocultarse `+ Mes`; el mes actual también puede crearse desde el panel `Hoy`.

## 5. Gestión de meses

### 5.1 Seleccionar mes

Usar las pestañas de la cabecera para cambiar entre meses. Si hay más de 12 meses, se activan los botones de navegación anterior y siguiente.

### 5.2 Crear mes

1. Pulsar `+ Mes`.
2. Seleccionar año.
3. Seleccionar mes.
4. Pulsar `Crear`.

El mes se genera con días laborables de lunes a viernes. Los festivos nacionales y autonómicos de Andalucía se calculan para el año seleccionado y se marcan automáticamente como `Festivo`, salvo que se haya personalizado ese calendario.

Los días hábiles nuevos se crean con valores por defecto:

- Entrada: `08:00`
- Desayuno inicio: `09:00`
- Desayuno fin: `09:15`
- Salida: `15:00`

### 5.3 Eliminar mes

1. Seleccionar el mes que se quiere eliminar.
2. En el panel lateral, ir a `Acciones`.
3. Pulsar `Eliminar mes`.
4. Confirmar la operación.

Esta acción elimina todos los registros del mes seleccionado.

## 6. Registro de fichajes

### 6.1 Campos de cada día

La tabla mensual contiene:

- Fecha: día y mes.
- Día: nombre del día de la semana.
- Entrada: hora de entrada.
- Des. ini: inicio del desayuno.
- Des. fin: fin del desayuno.
- Com. ini: inicio de comida.
- Com. fin: fin de comida.
- Salida: hora de salida.
- Suma: tiempo computado del día.
- Diario: diferencia entre horas computadas y jornada esperada.
- Bolsa: saldo acumulado de bolsa de horas.
- Teletrabajo: marca de día completo o tarde.
- Notas: observaciones libres.
- Tipo: clasificación del día.
- Edición: acceso al formulario del fichaje.

### 6.2 Editar un fichaje desde la tabla

1. Localizar el día en el mes activo.
2. Pulsar el botón de edición de la última columna.
3. Rellenar o corregir horas.
4. Añadir notas si procede.
5. Marcar teletrabajo si aplica.
6. Pulsar `Guardar`.

### 6.3 Añadir o editar fichaje desde la cabecera

1. Pulsar `+ Fichaje`.
2. Seleccionar la fecha dentro del mes activo.
3. Completar los campos.
4. Pulsar `Guardar`.

Este flujo permite registrar fichajes sin buscar visualmente la fila en la tabla.

### 6.4 Formato de horas

Los campos horarios usan formato `HH:MM`.

Formatos aceptados:

- `08:00`
- `8:00`, que se normaliza a `08:00`
- `800`, que se normaliza a `08:00`
- `8`, que se normaliza a `08:00`

Si una hora no es válida, el campo se marca como incorrecto.

### 6.5 Validaciones de secuencia

La aplicación valida que las horas mantengan un orden lógico:

- Desayuno inicio debe ser posterior a entrada.
- Desayuno fin debe ser posterior a desayuno inicio.
- Comida inicio debe ser posterior al bloque anterior.
- Comida fin debe ser posterior a comida inicio.
- Salida debe ser posterior al último bloque registrado.

No se guarda el formulario si hay errores de secuencia.

### 6.6 Fichajes pendientes

La aplicación detecta fichajes de fechas pasadas o del día actual que necesitan revisión:

- Falta entrada.
- Falta salida.
- Faltan entrada y salida en un día pasado.
- La secuencia horaria es incoherente.

El contador `Pendientes` de la cabecera abre el primer registro pendiente. El panel lateral muestra hasta seis accesos directos, ordenados desde el más reciente. Los días futuros, los días no hábiles y el día actual todavía no iniciado no se consideran pendientes.

## 7. Tipos de día

Cada fila tiene un selector `Tipo` con estas opciones:

- Hábil.
- Festivo.
- Puente.
- Asuntos propios.
- Vacaciones.
- Turno de navidad.

Al cambiar un día a un tipo no hábil, la aplicación limpia las horas del día y excluye ese registro del cálculo de jornada ordinaria. El día permanece visible en la tabla para mantener el contexto del mes.

### 7.1 Festivos automáticos de Andalucía

La aplicación genera para cada año entre 2020 y 2099:

- Festivos nacionales de fecha fija.
- Festivos autonómicos de Andalucía.
- Jueves Santo y Viernes Santo, calculados a partir de la Semana Santa.
- Traslado al lunes cuando un festivo fijo configurado por la aplicación cae en domingo.

Los calendarios futuros deben revisarse cuando se publique el decreto oficial correspondiente.

### 7.2 Gestionar festivos

1. Abrir `Festivos` en el panel lateral.
2. Pulsar `Gestionar festivos`.
3. Seleccionar el año.
4. Para añadir o modificar un festivo, indicar fecha y nombre y pulsar `Añadir`.
5. Para eliminarlo, pulsar el botón de eliminación de su fila.
6. Para descartar personalizaciones, pulsar `Restaurar calendario automático`.

Los cambios se aplican también a meses ya creados. Si convertir una fecha en festivo implica borrar horas, notas o teletrabajo, la aplicación pide confirmación. Los festivos creados manualmente desde la tabla no se eliminan al restaurar el calendario automático.

## 8. Configuración de jornada

La sección `Configuración` controla las reglas de cálculo.

### 8.1 Horas por día

- `Horas/día - Invierno`: jornada esperada fuera del periodo intensivo.
- `Horas/día - Verano`: jornada esperada durante el periodo intensivo.

### 8.2 Jornada intensiva

- `Inicio jornada intensiva`: fecha en formato `DD/MM`.
- `Fin jornada intensiva`: fecha en formato `DD/MM`.

Los días comprendidos entre ambas fechas usan la jornada de verano.

### 8.3 Reglas horarias

- `Hora mín. entrada`: si se ficha antes de esta hora, el cálculo computa desde esta hora mínima.
- `Tiempo máx. desayuno`: el desayuno solo descuenta el exceso sobre este tiempo.
- `Tiempo mín. comida`: si hay tramo de comida, se descuenta como mínimo este tiempo.
- `Hora mín. salida`: si no hay comida, la salida computada no puede ser anterior a esta hora.

### 8.4 Bolsa inicial

`Bolsa inicio de año` define el saldo inicial de la bolsa de horas. El valor máximo admitido es `05:00`.

## 9. Cálculos de jornada

### 9.1 Suma

`Suma` representa el tiempo computado del día. Se calcula aplicando:

- Entrada efectiva: la mayor entre la entrada real y la hora mínima de entrada.
- Descuento de desayuno: solo el exceso sobre el tiempo máximo configurado.
- Descuento de comida: si hay comida, se descuenta el mayor valor entre duración real y tiempo mínimo de comida.
- Salida efectiva: respeta la hora mínima de salida cuando corresponde.
- Límite diario: la suma no supera 11 horas.

### 9.2 Diario

`Diario` es la diferencia entre la suma del día y las horas esperadas para esa fecha.

- Valor positivo: se generan minutos a favor.
- Valor negativo: faltan minutos respecto a la jornada esperada.

### 9.3 Bolsa

`Bolsa` es el saldo acumulado tras aplicar cada día del mes y los meses anteriores.

La aplicación aplica estas reglas de bolsa:

- Primer día de jornada intensiva: el saldo se reinicia a `00:00`.
- Primer día laborable posterior a la jornada intensiva: se conserva el saldo positivo con un máximo de `02:00`; un saldo negativo se ajusta a `00:00`.
- Viernes durante la jornada intensiva: el saldo positivo queda limitado a `02:00`.
- Viernes fuera de la jornada intensiva: el saldo positivo queda limitado a `05:00`.
- De lunes a jueves no se aplica un tope adicional.

### 9.4 Salida automática de viernes

En viernes hábil con entrada registrada y salida vacía, la aplicación calcula una salida automática para ajustar la jornada al saldo de bolsa disponible. La salida calculada aparece destacada como valor automático.

## 10. Teletrabajo

### 10.1 Configurar bolsa trimestral

La sección `Bolsa teletrabajo` permite definir una bolsa por trimestre:

- T1: enero, febrero y marzo.
- T2: abril, mayo y junio.
- T3: julio, agosto y septiembre.
- T4: octubre, noviembre y diciembre.

El formato es `HH:MM`.

### 10.2 Marcar teletrabajo

En cada día hábil se puede marcar:

- `DÍA`: día completo de teletrabajo.
- `TARDE`: teletrabajo de tarde.

Ambas marcas son excluyentes. Si se activa una, la otra queda deshabilitada.

### 10.3 Consumo de bolsa de teletrabajo

- Día completo: consume la suma computada del día.
- Tarde: consume el tiempo posterior al tramo de comida según las reglas de cálculo.

La columna de teletrabajo muestra la bolsa restante del trimestre cuando el día tiene una marca activa.

### 10.4 Avisos

Si un trimestre queda excedido, el panel lateral muestra un aviso indicando el trimestre afectado y el exceso.

## 11. Resumen y estadísticas

### 11.1 Resumen del mes

La sección `Resumen del mes` del panel lateral muestra:

- Días registrados.
- Días no hábiles.
- Horas trabajadas.
- Horas esperadas.
- Diferencia total.
- Bolsa ABS final.

Los valores se recalculan al cambiar fichajes, tipos de día o configuración.

### 11.2 Dashboard de estadísticas

Seleccionar `ESTADÍSTICAS` en la cabecera. El dashboard permite consultar:

- `MES`: el mes seleccionado.
- `TRIMESTRE`: el mes seleccionado y los dos meses anteriores disponibles.
- `AÑO`: todos los meses disponibles del año seleccionado.

Los indicadores principales son:

- Horas trabajadas y número de días completos.
- Horas esperadas hasta la fecha actual.
- Diferencia entre tiempo real y objetivo.
- Bolsa acumulada.
- Teletrabajo disponible y consumido en el trimestre natural correspondiente.
- Hora media de entrada y salida de fichajes completos.

Los gráficos y paneles muestran:

- Evolución de la bolsa por día.
- Horas trabajadas frente a esperadas, agrupadas por semana o mes.
- Distribución de días por tipo.
- Incidencias: fichajes pendientes, bolsa negativa o teletrabajo excedido.

Los días futuros no se incluyen como tiempo pendiente en los indicadores.

## 12. Copias de seguridad

### 12.1 Exportar backup JSON

1. Ir a `Backup completo`.
2. Pulsar `Exportar JSON`.

El archivo generado contiene:

- Configuración.
- Todos los meses.
- Todos los fichajes.
- Tipos de día.
- Notas.
- Marcas de teletrabajo.

Uso recomendado: copia completa de seguridad o migración entre navegadores/dispositivos.

### 12.2 Importar backup JSON

1. Ir a `Backup completo`.
2. Pulsar `Importar JSON`.
3. Seleccionar o arrastrar el archivo.
4. Confirmar la sustitución de datos.

La importación JSON reemplaza todos los datos actuales por los del archivo.

## 13. Exportación e importación mensual

### 13.1 Exportar CSV del mes

1. Seleccionar el mes.
2. Ir a `Exportar / Importar mes`.
3. Pulsar `Exportar CSV del mes`.

El archivo CSV incluye fecha, ISO, día, tipo, horas, suma, diario, teletrabajo y notas.

Uso recomendado: revisión en hoja de cálculo o intercambio de un mes concreto.

### 13.2 Importar CSV del mes

1. Ir a `Exportar / Importar mes`.
2. Pulsar `Importar CSV del mes`.
3. Seleccionar o arrastrar un CSV exportado desde la aplicación.
4. Si el mes ya existe, confirmar la sobrescritura.

El CSV debe contener la columna `ISO`. Los CSV exportados por versiones antiguas sin esa columna no pueden importarse.

## 14. Persistencia y sincronización

### 14.1 Guardado local

La aplicación guarda una copia local en el navegador. Esto permite recuperar datos entre sesiones y trabajar con menor dependencia de la red.

Los datos locales dependen del navegador y del dispositivo. Si se eliminan datos del sitio, caché o almacenamiento local, se puede perder la copia local.

### 14.2 Sincronización remota

Con sesión iniciada y conexión disponible, la aplicación sincroniza meses, días y configuración con la cuenta del usuario.

El indicador de la cabecera puede mostrar:

- `Sincronizado`: no hay cambios pendientes.
- `Sincronizando...`: existe una operación en curso.
- `N cambios pendientes`: los cambios están guardados localmente pero aún no en la nube.
- `Sin conexión`: la aplicación está trabajando con la copia local.
- `Error de sincronización`: el último intento no finalizó correctamente.

Pulsar el indicador para reintentar manualmente. Si no hay conexión, los cambios se conservan en una cola local persistente y se reintentan automáticamente al recuperarla.

La aplicación protege la copia local: si la carga remota finaliza sin meses pero el navegador contiene datos, restaura la copia local y prepara su resincronización.

### 14.3 Recomendación de backup

Exportar JSON periódicamente, especialmente antes de:

- Cambiar de navegador.
- Limpiar datos del navegador.
- Importar archivos.
- Eliminar meses.
- Usar la aplicación en otro dispositivo.

## 15. Instalación como aplicación

### 15.1 Chrome o Edge en escritorio

1. Abrir la URL de Fichajes.
2. Pulsar el icono de instalación en la barra de direcciones.
3. Confirmar `Instalar`.

También puede instalarse desde el menú del navegador con la opción de instalar aplicación.

### 15.2 Android

1. Abrir la URL en Chrome.
2. Usar el aviso de instalación o el menú del navegador.
3. Seleccionar `Añadir a pantalla de inicio`.

### 15.3 iOS

1. Abrir la URL en Safari.
2. Pulsar compartir.
3. Seleccionar `Añadir a pantalla de inicio`.

## 16. Uso offline

La aplicación usa service worker para cachear los archivos principales. Si ya se ha abierto previamente, puede seguir cargando sin conexión en muchos escenarios.

Limitaciones offline:

- No se puede iniciar sesión si no hay sesión local válida.
- No se sincronizan cambios hasta recuperar conexión.
- Las actualizaciones de la aplicación requieren conexión.

## 17. Actualizaciones

La aplicación comprueba actualizaciones del service worker al cargarse. Cuando hay una versión nueva, el navegador actualiza los archivos cacheados y recarga la aplicación cuando corresponde.

Si se observan datos visuales o comportamiento antiguo tras una actualización, cerrar y volver a abrir la aplicación suele forzar la carga de la versión vigente.

### 17.1 Historial de versiones

Pulsar el número de versión de la cabecera para abrir `Cambios y mejoras`. El modal muestra las versiones documentadas ordenadas desde la más reciente, con su fecha y una descripción de los cambios.

### 17.2 Manual integrado y descarga

Pulsar el botón `?` de la cabecera para abrir este manual sin abandonar la aplicación. El modal permite:

- Consultar todas las secciones mediante desplazamiento.
- Cerrar con el botón, pulsando fuera del modal o usando la tecla `Escape`.
- Descargar la versión DOCX mediante `Descargar DOCX`.

## 18. Buenas prácticas

- Revisar la configuración antes de introducir fichajes del mes.
- Crear el mes al inicio del periodo y comprobar festivos.
- Usar `Notas` para justificar incidencias, permisos o ajustes.
- Exportar JSON antes de importaciones o eliminaciones.
- Evitar editar el mismo usuario simultáneamente en varios dispositivos sin esperar a que se sincronicen los cambios.
- Usar CSV para análisis mensual y JSON para backup completo.
- Revisar el contador de pendientes antes de cerrar la jornada.
- Comprobar que el indicador muestre `Sincronizado` antes de cerrar sesión o cambiar de dispositivo.
- Revisar el calendario automático de años futuros cuando se publique la normativa oficial.

## 19. Solución de problemas

### 19.1 No puedo iniciar sesión

Comprobar:

- Email escrito correctamente.
- Contraseña correcta.
- Conexión a internet.
- Que la cuenta existe.

Si el problema persiste, cerrar la pestaña, abrir de nuevo la aplicación e intentarlo otra vez.

### 19.2 No aparecen mis meses

Comprobar:

- Que se ha iniciado sesión con la cuenta correcta.
- Que hay conexión a internet.
- Si existe un backup JSON reciente, restaurarlo desde `Importar JSON`.

Si el indicador muestra cambios pendientes o error, pulsarlo para reintentar. No importar un backup ni crear meses duplicados hasta comprobar si la copia local se ha restaurado.

### 19.3 El cálculo de horas no coincide con lo esperado

Revisar:

- Horas/día de invierno y verano.
- Fechas de jornada intensiva.
- Hora mínima de entrada.
- Tiempo máximo de desayuno.
- Tiempo mínimo de comida.
- Hora mínima de salida.
- Tipo del día.
- Si la salida del viernes se está calculando automáticamente.

### 19.4 No puedo marcar teletrabajo

Comprobar:

- Que el día está marcado como `Hábil`.
- Que no está activa la opción opuesta, ya que `DÍA` y `TARDE` son excluyentes.

### 19.5 La importación CSV falla

Comprobar:

- Que el archivo procede de una exportación CSV de la aplicación actual.
- Que contiene la columna `ISO`.
- Que no se ha modificado la cabecera del CSV.

### 19.6 He eliminado o sobrescrito datos

Restaurar el backup JSON más reciente desde `Importar JSON`. Si no existe backup, revisar si los datos siguen disponibles en otro navegador o dispositivo con la misma cuenta.

### 19.7 Hay cambios pendientes o error de sincronización

1. Comprobar la conexión.
2. Pulsar el indicador de sincronización.
3. Esperar a que muestre `Sincronizado`.
4. Si persiste, no limpiar los datos del navegador; exportar un backup JSON antes de continuar.

### 19.8 Un festivo no coincide con el calendario esperado

Abrir `Gestionar festivos`, seleccionar el año y revisar si figura como `personalizado`. Se puede corregir una fecha manualmente o restaurar el calendario automático. Para años futuros, contrastar el calendario con el decreto oficial cuando esté disponible.

### 19.9 El panel Hoy indica que falta el mes actual

Pulsar `Añadir mes actual`, revisar el año y el mes propuestos y confirmar la creación.

## 20. Glosario

- ABS: saldo acumulado de bolsa de horas mostrado en la columna `Bolsa`.
- Bolsa: diferencia acumulada entre horas trabajadas y horas esperadas.
- Diario: diferencia diaria entre suma computada y jornada esperada.
- Jornada intensiva: periodo configurado donde se aplica la jornada de verano.
- Pendiente: fichaje pasado o iniciado que carece de datos obligatorios o tiene una secuencia horaria incoherente.
- Sincronización: copia de los cambios locales en la cuenta remota.
- Suma: tiempo diario computado tras aplicar reglas de entrada, salida, desayuno y comida.
- Teletrabajo DÍA: marca de teletrabajo para toda la jornada.
- Teletrabajo TARDE: marca de teletrabajo para el tramo de tarde.
