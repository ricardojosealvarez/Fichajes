const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('./index.html', `file://${__filename}`), 'utf8');

const extractFunction = name => {
  const functionStart = html.indexOf(`function ${name}(`);
  assert.notEqual(functionStart, -1, `No se encontró la función ${name}`);
  const start = html.slice(Math.max(0, functionStart - 6), functionStart) === 'async '
    ? functionStart - 6
    : functionStart;

  const bodyStart = html.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (depth === 0) return html.slice(start, i + 1);
  }

  throw new Error(`No se pudo extraer la función ${name}`);
};

const createContext = overrides => {
  const context = vm.createContext({
    Math,
    Date
  });
  [
    'timeToMins',
    'minsToTime',
    'calcSuma',
    'calcFridaySalida'
  ].forEach(name => vm.runInContext(extractFunction(name), context));
  Object.assign(context, overrides);
  vm.runInContext(extractFunction('calculateBolsaDay'), context);
  return context;
};

test('la salida automática del viernes actualiza el saldo propagado', () => {
  const context = createContext({
    applyBolsaBoundaryForDate: (_date, abs) => abs,
    getHoraDay: () => 7 * 60,
    getBolsaCap: () => 5 * 60
  });
  const day = {
    date: new Date(2026, 0, 9),
    tipo: 'habil',
    entrada: '08:00',
    salida: ''
  };

  const result = context.calculateBolsaDay(day, 60, {
    hourIn: 7 * 60,
    desayunoTime: 15,
    horaLunch: 60,
    horaMinsalida: 13 * 60 + 45
  });

  assert.equal(result.salida, '14:00');
  assert.equal(result.salidaAuto, true);
  assert.equal(result.suma, 6 * 60);
  assert.equal(result.diario, -60);
  assert.equal(result.abs, 0);
});

test('el viernes aplica el tope al saldo después de calcular la jornada', () => {
  const context = createContext({
    applyBolsaBoundaryForDate: (_date, abs) => abs,
    calcFridaySalida: () => null,
    getHoraDay: () => 7 * 60,
    minsToTime: () => '',
    calcSuma: () => 9 * 60,
    getBolsaCap: () => 2 * 60
  });
  const day = {
    date: new Date(2026, 6, 3),
    tipo: 'habil',
    entrada: '08:00',
    salida: '17:00'
  };

  const result = context.calculateBolsaDay(day, 90, {});

  assert.equal(result.diario, 2 * 60);
  assert.equal(result.abs, 2 * 60);
});

test('los días no hábiles conservan el límite aplicado en la frontera', () => {
  const context = createContext({
    applyBolsaBoundaryForDate: () => 2 * 60,
    calcFridaySalida: () => null,
    getHoraDay: () => 7 * 60,
    minsToTime: () => '',
    calcSuma: () => {
      throw new Error('No debe calcular una jornada no hábil');
    },
    getBolsaCap: () => 5 * 60
  });
  const day = {
    date: new Date(2026, 8, 16),
    tipo: 'festivo',
    entrada: '',
    salida: ''
  };

  const result = context.calculateBolsaDay(day, 4 * 60, {});

  assert.equal(result.abs, 2 * 60);
  assert.equal(result.suma, null);
});

test('restaura la caché local cuando Supabase no devuelve meses', () => {
  const context = vm.createContext({});
  vm.runInContext(extractFunction('hasMonthData'), context);
  vm.runInContext(extractFunction('shouldRestoreLocalSnapshot'), context);

  const localSnapshot = { months: [{ year: 2026, month: 6, days: [] }] };

  assert.equal(context.shouldRestoreLocalSnapshot(true, [], localSnapshot), true);
  assert.equal(context.shouldRestoreLocalSnapshot(false, [], localSnapshot), false);
  assert.equal(context.shouldRestoreLocalSnapshot(true, [{ id: 'remote-month' }], localSnapshot), false);
  assert.equal(context.shouldRestoreLocalSnapshot(true, [], { months: [] }), false);
});

test('el dashboard selecciona el mes, trimestre móvil y año activos', () => {
  const context = vm.createContext({});
  vm.runInContext(extractFunction('getDashboardMonthIndexes'), context);
  const sourceMonths = [
    { year: 2025, month: 11 },
    { year: 2026, month: 0 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
    { year: 2026, month: 6 }
  ];

  assert.deepEqual(
    Array.from(context.getDashboardMonthIndexes(sourceMonths, 2, 'month')),
    [2]
  );
  assert.deepEqual(
    Array.from(context.getDashboardMonthIndexes(sourceMonths, 2, 'quarter')),
    [0, 1, 2]
  );
  assert.deepEqual(
    Array.from(context.getDashboardMonthIndexes(sourceMonths, 2, 'year')),
    [1, 2, 3, 4, 5]
  );
  assert.deepEqual(
    Array.from(context.getDashboardMonthIndexes(sourceMonths, 99, 'year')),
    []
  );
});

test('el dashboard calcula cobertura y diferencia hasta hoy', () => {
  const days = [
    { date: new Date(2020, 0, 2), tipo: 'habil', entrada: '08:00', suma: 480 },
    { date: new Date(2020, 0, 3), tipo: 'habil', entrada: '', suma: null },
    { date: new Date(2020, 0, 6), tipo: 'vacaciones', entrada: '', suma: null }
  ];
  const context = vm.createContext({
    months: [{ year: 2020, month: 0, days }],
    currentMonthIdx: 0,
    dashboardPeriod: 'month',
    DAY_TYPES: [
      { key: 'habil' },
      { key: 'vacaciones' }
    ],
    getDashboardMonthIndexes: () => [0],
    getConfig: () => ({}),
    computeBolsaUpTo: () => 0,
    calculateBolsaDay: (day, abs) => ({
      abs: day.suma === null ? abs : abs + day.suma - 480,
      suma: day.suma,
      salida: '16:00'
    }),
    getHoraDay: () => 480,
    timeToMins: value => value === '08:00' ? 480 : 960,
    getDashboardDayTeleMinutes: () => 0,
    getDashboardBucketLabel: () => 'Sem 1',
    getDashboardPeriodLabel: () => 'Enero 2020',
    getTeleConsumedUntil: () => 0,
    getTeleBolsaForQuarter: () => 0,
    getQuarterForMonth: () => 0
  });
  vm.runInContext(extractFunction('buildDashboardData'), context);

  const result = context.buildDashboardData();

  assert.equal(result.worked, 480);
  assert.equal(result.expected, 960);
  assert.equal(result.difference, -480);
  assert.equal(result.completedDays, 1);
  assert.equal(result.pendingDays, 1);
  assert.equal(result.typeCounts.vacaciones, 1);
});

test('detecta fichajes pasados incompletos y omite futuros o no hábiles', () => {
  const context = vm.createContext({
    validateDaySequence: day => day.invalid ? [{ field: 'salida' }] : []
  });
  vm.runInContext(extractFunction('getPendingPunches'), context);
  const sourceMonths = [{
    year: 2026,
    month: 6,
    days: [
      { date: new Date(2026, 6, 27), tipo: 'habil', entrada: '', salida: '' },
      { date: new Date(2026, 6, 28), tipo: 'habil', entrada: '08:00', salida: '' },
      { date: new Date(2026, 6, 29), tipo: 'habil', entrada: '08:00', salida: '15:00', invalid: true },
      { date: new Date(2026, 6, 30), tipo: 'habil', entrada: '', salida: '' },
      { date: new Date(2026, 6, 30), tipo: 'habil', entrada: '08:00', salida: '' },
      { date: new Date(2026, 6, 31), tipo: 'habil', entrada: '', salida: '' },
      { date: new Date(2026, 6, 28), tipo: 'vacaciones', entrada: '', salida: '' }
    ]
  }];

  const result = context.getPendingPunches(sourceMonths, new Date(2026, 6, 30, 12));

  assert.deepEqual(
    Array.from(result, item => item.reason),
    ['Falta la salida', 'Horario incoherente', 'Falta la salida', 'Sin entrada ni salida']
  );
});

test('prioriza los estados de sincronización activos y recuperables', () => {
  const context = vm.createContext({
    isOnline: true,
    activeSyncOperations: 0,
    syncErrorMessage: '',
    syncQueue: []
  });
  vm.runInContext(extractFunction('getSyncStatus'), context);

  assert.equal(context.getSyncStatus(), 'synced');
  context.syncQueue = ['config'];
  assert.equal(context.getSyncStatus(), 'pending');
  context.syncErrorMessage = 'fallo';
  assert.equal(context.getSyncStatus(), 'error');
  context.activeSyncOperations = 1;
  assert.equal(context.getSyncStatus(), 'syncing');
  context.isOnline = false;
  assert.equal(context.getSyncStatus(), 'offline');
});

test('la vista móvil expone tarjetas etiquetadas y acceso al panel', () => {
  assert.match(html, /class="attendance-table"/);
  assert.match(html, /data-label="Entrada"/);
  assert.match(html, /data-label="Salida"/);
  assert.match(html, /id="mobile-panel-btn"/);
  assert.match(html, /class="mobile-sidebar-close"/);
  assert.match(html, /id="sidebar-backdrop"/);
});

test('el contenedor principal se adapta dinámicamente al viewport', () => {
  assert.match(html, /height:\s*100dvh/);
  assert.match(html, /\.main\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;/);
  assert.match(html, /\.content\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*auto;/);
  assert.match(html, /width:\s*clamp\(220px,\s*18vw,\s*320px\)/);
  assert.match(html, /grid-template-columns:\s*repeat\(auto-fit,/);
  assert.match(html, /@media \(max-width:\s*1100px\)/);
  assert.match(html, /#month-actions\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(html, /\.tabs\s*\{[\s\S]*?overflow-x:\s*auto;/);
});

test('la navegación mensual limita el contenido y actualiza sus controles', () => {
  const tabs = {
    scrollWidth: 1200,
    clientWidth: 600,
    scrollLeft: 0,
    querySelector: () => null
  };
  const previous = { style: {}, disabled: false };
  const next = { style: {}, disabled: false };
  const context = vm.createContext({
    document: {
      getElementById: id => ({
        tabs,
        'tabs-prev': previous,
        'tabs-next': next
      })[id]
    }
  });
  vm.runInContext(extractFunction('syncTabsViewport'), context);

  context.syncTabsViewport();
  assert.equal(previous.style.display, 'flex');
  assert.equal(next.style.display, 'flex');
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);

  tabs.scrollLeft = 600;
  context.syncTabsViewport();
  assert.equal(previous.disabled, false);
  assert.equal(next.disabled, true);

  tabs.scrollWidth = 600;
  context.syncTabsViewport();
  assert.equal(previous.style.display, 'none');
  assert.equal(next.style.display, 'none');
});

test('normaliza festivos y permite sustituir los predeterminados por una lista vacía', () => {
  const context = vm.createContext({
    holidayCalendars: {},
    DEFAULT_HOLIDAYS: {
      2026: [{iso: '2026-01-06', nota: 'Reyes'}]
    }
  });
  [
    'isValidHolidayIso',
    'normalizeHolidayList',
    'normalizeHolidayCalendars',
    'getDefaultHolidaysForYear',
    'getConfiguredHolidaysForYear'
  ].forEach(name => vm.runInContext(extractFunction(name), context));

  const normalized = context.normalizeHolidayCalendars({
    2026: [
      {iso: '2026-02-30', nota: 'Inválido'},
      {iso: '2026-05-01', nota: 'Trabajo'},
      {iso: '2026-05-01', nota: 'Fiesta del Trabajo'}
    ]
  });
  assert.equal(normalized['2026'].length, 1);
  assert.equal(normalized['2026'][0].nota, 'Fiesta del Trabajo');
  assert.equal(context.getConfiguredHolidaysForYear(2026).length, 1);
  assert.equal(context.getConfiguredHolidaysForYear(2026)[0].managed, true);

  context.holidayCalendars = {'2026': []};
  assert.equal(context.getConfiguredHolidaysForYear(2026).length, 0);
});

test('aplica y elimina festivos configurados sin alterar festivos manuales', () => {
  const context = vm.createContext({
    HOLIDAY_TIME_FIELDS: [
      'entrada',
      'desayunoIni',
      'desayunoFin',
      'comidaIni',
      'comidaFin',
      'salida'
    ]
  });
  [
    'toLocalIsoDate',
    'isValidHolidayIso',
    'normalizeHolidayList',
    'findHolidayDayRefs',
    'markDayAsConfiguredHoliday',
    'restoreConfiguredHolidayAsWorkday',
    'reconcileHolidayCalendar'
  ].forEach(name => vm.runInContext(extractFunction(name), context));

  const day = {
    date: new Date(2026, 4, 4),
    tipo: 'habil',
    entrada: '08:00',
    desayunoIni: '09:00',
    desayunoFin: '09:15',
    comidaIni: '',
    comidaFin: '',
    salida: '15:00',
    teleDia: true,
    teleTarde: false,
    notas: ''
  };
  const sourceMonths = [{year: 2026, month: 4, days: [day]}];
  const holiday = [{iso: '2026-05-04', nota: 'Festivo local', managed: true}];

  assert.equal(context.reconcileHolidayCalendar(sourceMonths, 2026, [], holiday).length, 1);
  assert.equal(day.tipo, 'festivo');
  assert.equal(day.entrada, '');
  assert.equal(day.salida, '');
  assert.equal(day.teleDia, false);
  assert.equal(day.notas, 'Festivo local');

  assert.equal(context.reconcileHolidayCalendar(sourceMonths, 2026, holiday, []).length, 1);
  assert.equal(day.tipo, 'habil');
  assert.equal(day.notas, '');

  day.tipo = 'festivo';
  day.notas = 'Festivo manual';
  assert.equal(context.reconcileHolidayCalendar(sourceMonths, 2026, holiday, []).length, 0);
  assert.equal(day.tipo, 'festivo');
  assert.equal(day.notas, 'Festivo manual');

  day.notas = 'Festivo local';
  const unmanagedHoliday = [{iso: '2026-05-04', nota: 'Festivo local', managed: false}];
  assert.equal(context.reconcileHolidayCalendar(sourceMonths, 2026, unmanagedHoliday, []).length, 0);
  assert.equal(day.tipo, 'festivo');
  assert.equal(day.notas, 'Festivo local');

  const legacyHoliday = [{iso: '2026-05-04', nota: 'Festivo local'}];
  assert.equal(context.reconcileHolidayCalendar(sourceMonths, 2026, legacyHoliday, []).length, 0);
  assert.equal(day.tipo, 'festivo');
});

test('avisa antes de sobrescribir horas, notas o teletrabajo al añadir un festivo', () => {
  const day = {
    date: new Date(2026, 4, 4),
    tipo: 'habil',
    entrada: '',
    desayunoIni: '',
    desayunoFin: '',
    comidaIni: '',
    comidaFin: '',
    salida: '',
    teleDia: false,
    teleTarde: false,
    notas: 'Cita'
  };
  const context = vm.createContext({
    HOLIDAY_TIME_FIELDS: [
      'entrada',
      'desayunoIni',
      'desayunoFin',
      'comidaIni',
      'comidaFin',
      'salida'
    ]
  });
  [
    'toLocalIsoDate',
    'isValidHolidayIso',
    'normalizeHolidayList',
    'findHolidayDayRefs',
    'holidayChangesClearRecordedTimes'
  ].forEach(name => vm.runInContext(extractFunction(name), context));

  const sourceMonths = [{year: 2026, month: 4, days: [day]}];
  const next = [{iso: '2026-05-04', nota: 'Festivo local'}];
  assert.equal(context.holidayChangesClearRecordedTimes(sourceMonths, 2026, [], next), true);

  day.notas = '';
  day.teleTarde = true;
  assert.equal(context.holidayChangesClearRecordedTimes(sourceMonths, 2026, [], next), true);

  day.teleTarde = false;
  assert.equal(context.holidayChangesClearRecordedTimes(sourceMonths, 2026, [], next), false);
});

test('encola el calendario y sus días antes de guardar la caché local', async () => {
  const calls = [];
  const day = {date: new Date(2026, 4, 4), tipo: 'habil'};
  const context = vm.createContext({
    months: [{id: 'month-1', year: 2026, month: 4, days: [day]}],
    currentUser: {id: 'user-1'},
    holidaySaveInProgress: false,
    getConfiguredHolidaysForYear: () => [],
    normalizeHolidayList: holidays => holidays,
    holidayChangesClearRecordedTimes: () => false,
    reconcileHolidayCalendar: sourceMonths => [{
      monthData: sourceMonths[0],
      day: sourceMonths[0].days[0],
      dayIdx: 0
    }],
    setHolidayCalendarOverride: () => calls.push('calendar'),
    queueSyncChange: key => calls.push(`queue:${key}`),
    ensureDayId: target => {
      target.id = 'day-1';
      return target.id;
    },
    getDaySyncKey: () => 'day:month-1:day-1',
    saveStateLocal: () => calls.push('local'),
    renderHolidaySummary: () => {},
    renderHolidayManager: () => {},
    renderActiveView: () => {},
    setHolidayManagerBusy: () => {},
    setHolidayFeedback: message => calls.push(`feedback:${message}`),
    saveConfig: async () => {
      calls.push('save-config');
      return false;
    },
    saveDay: async () => {
      calls.push('save-day');
      return true;
    },
    confirm: () => true
  });
  vm.runInContext(extractFunction('persistHolidayCalendar'), context);

  assert.equal(await context.persistHolidayCalendar(2026, [], 'Guardado.'), true);
  assert.deepEqual(
    calls.slice(0, 4),
    ['calendar', 'queue:config', 'queue:day:month-1:day-1', 'local']
  );
  assert.equal(calls.includes('save-day'), false);
  assert.equal(calls.at(-1), 'feedback:Guardado localmente. Sincronización pendiente.');
});

test('detiene la sincronización de días si falla primero el calendario', async () => {
  const calls = [];
  const context = vm.createContext({
    isOnline: true,
    currentUser: {id: 'user-1'},
    activeSyncOperations: 0,
    syncErrorMessage: '',
    syncQueue: ['day:month-1:day-1', 'config'],
    updateSyncIndicator: () => {},
    queueSyncChange: () => {},
    saveConfig: async () => {
      calls.push('config');
      return false;
    },
    beginSyncOperation: () => {},
    finishSyncOperation: () => {},
    syncAllMonthsToSupabase: async () => true,
    saveNewMonthToSupabase: async () => true,
    saveDay: async () => {
      calls.push('day');
      return true;
    },
    saveStateLocal: () => {},
    months: [{
      id: 'month-1',
      days: [{id: 'day-1'}]
    }],
    removeSyncChange: () => {}
  });
  vm.runInContext(extractFunction('retrySync'), context);

  assert.equal(await context.retrySync(), false);
  assert.deepEqual(calls, ['config']);
});

test('serializa guardados de configuración y termina con el estado más reciente', async () => {
  let active = 0;
  let maxActive = 0;
  let releaseFirst;
  let saves = 0;
  const firstSave = new Promise(resolve => { releaseFirst = resolve; });
  const context = vm.createContext({
    configSaveRequested: false,
    configSavePromise: null,
    queueSyncChange: () => {},
    saveStateLocal: () => {},
    performSaveConfig: async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      saves++;
      if (saves === 1) await firstSave;
      active--;
      return true;
    }
  });
  vm.runInContext(extractFunction('saveConfig'), context);

  const first = context.saveConfig();
  const second = context.saveConfig();
  assert.equal(saves, 1);
  releaseFirst();
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(saves, 2);
  assert.equal(maxActive, 1);
});

test('serializa guardados del mismo día y conserva la versión más reciente', async () => {
  let active = 0;
  let maxActive = 0;
  let releaseFirst;
  const savedTypes = [];
  const firstSave = new Promise(resolve => { releaseFirst = resolve; });
  const day = {id: 'day-1', tipo: 'habil'};
  const context = vm.createContext({
    daySaveStates: new Map(),
    ensureDayId: target => target.id,
    getDaySyncKey: () => 'day:month-1:day-1',
    queueSyncChange: () => {},
    saveStateLocal: () => {},
    performSaveDay: async (_monthId, _dayIdx, target) => {
      active++;
      maxActive = Math.max(maxActive, active);
      savedTypes.push(target.tipo);
      if (savedTypes.length === 1) await firstSave;
      active--;
      return true;
    }
  });
  vm.runInContext(extractFunction('saveDay'), context);

  const first = context.saveDay('month-1', 0, day);
  day.tipo = 'festivo';
  const second = context.saveDay('month-1', 0, day);
  releaseFirst();

  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.deepEqual(savedTypes, ['habil', 'festivo']);
  assert.equal(maxActive, 1);
});

test('expone la gestión accesible de festivos y la incluye en configuración', () => {
  assert.match(html, /id="holiday-summary"/);
  assert.match(html, /id="holidays-modal"/);
  assert.match(html, /id="holiday-year"/);
  assert.match(html, /id="holiday-date"/);
  assert.match(html, /id="holiday-name"/);
  assert.match(html, /id="holiday-list"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="dialog"\s+aria-modal="true"\s+aria-labelledby="holidays-modal-title"/);
  assert.match(html, /id="holiday-year"[^>]+data-manual-save="true"/);
  assert.match(html, /id="holiday-date"[^>]+data-manual-save="true"/);
  assert.match(html, /id="holiday-name"[^>]+data-manual-save="true"/);
  assert.match(html, /\.config-input:not\(\[data-manual-save\]\)/);
  assert.match(html, /festivos:\s+normalizeHolidayCalendars\(holidayCalendars\)/);
});

test('abre y cierra el panel lateral móvil de forma accesible', () => {
  const createClassList = () => {
    const values = new Set();
    return {
      contains: value => values.has(value),
      toggle: (value, force) => {
        if (force) values.add(value);
        else values.delete(value);
      }
    };
  };
  const sidebar = { classList: createClassList() };
  const backdrop = { classList: createClassList() };
  const button = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const body = { classList: createClassList() };
  const context = vm.createContext({
    document: {
      body,
      getElementById: id => ({
        sidebar,
        'sidebar-backdrop': backdrop,
        'mobile-panel-btn': button
      })[id]
    }
  });
  vm.runInContext(extractFunction('setMobileSidebarOpen'), context);

  context.setMobileSidebarOpen(true);
  assert.equal(sidebar.classList.contains('mobile-open'), true);
  assert.equal(backdrop.classList.contains('show'), true);
  assert.equal(body.classList.contains('mobile-sidebar-open'), true);
  assert.equal(button.attributes['aria-expanded'], 'true');

  context.setMobileSidebarOpen(false);
  assert.equal(sidebar.classList.contains('mobile-open'), false);
  assert.equal(button.attributes['aria-expanded'], 'false');
});
