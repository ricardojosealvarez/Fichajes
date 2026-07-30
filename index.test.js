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

const extractConstArray = name => {
  const start = html.indexOf(`const ${name} = [`);
  assert.notEqual(start, -1, `No se encontró la constante ${name}`);
  const end = html.indexOf('];', start);
  assert.notEqual(end, -1, `No se pudo extraer la constante ${name}`);
  return html.slice(start, end + 2);
};

const createHolidayContext = (overrides = {}) => {
  const context = vm.createContext({
    Date,
    holidayCalendars: {},
    ...overrides
  });
  vm.runInContext(extractConstArray('ANDALUSIAN_FIXED_HOLIDAY_RULES'), context);
  vm.runInContext(extractConstArray('HOLIDAY_TIME_FIELDS'), context);
  [
    'getEasterSunday',
    'addCalendarDays',
    'moveSundayHolidayToMonday',
    'toLocalIsoDate',
    'isValidHolidayIso',
    'normalizeHolidayList',
    'normalizeHolidayCalendars',
    'getAutomaticAndalusianHolidays',
    'getDefaultHolidaysForYear',
    'getConfiguredHolidaysForYear',
    'setHolidayCalendarOverride',
    'holidayDayHasRecordedData',
    'holidayDayHasGeneratedDefaults',
    'isLegacyAutomaticHolidayNote',
    'applyAutomaticHolidaysToExistingMonths'
  ].forEach(name => vm.runInContext(extractFunction(name), context));
  return context;
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

test('el panel Hoy localiza el día real y representa sus estados', () => {
  const context = vm.createContext({
    DAY_TYPES: [
      {key: 'habil', label: 'Hábil'},
      {key: 'festivo', label: 'Festivo'}
    ],
    validateDaySequence: day => day.invalid ? [{field: 'salida'}] : []
  });
  vm.runInContext(extractFunction('toLocalIsoDate'), context);
  vm.runInContext(extractFunction('getTodayPanelData'), context);

  const today = {
    date: new Date(2026, 6, 30),
    tipo: 'habil',
    entrada: '',
    salida: ''
  };
  const sourceMonths = [
    {
      year: 2026,
      month: 0,
      days: [{date: new Date(2026, 0, 30), tipo: 'habil', entrada: '08:00', salida: '15:00'}]
    },
    {year: 2026, month: 6, days: [today]}
  ];
  const now = new Date(2026, 6, 30, 12);

  let result = context.getTodayPanelData(sourceMonths, now);
  assert.equal(result.monthIdx, 1);
  assert.equal(result.dayIdx, 0);
  assert.equal(result.state, 'not-started');

  today.entrada = '08:00';
  result = context.getTodayPanelData(sourceMonths, now);
  assert.equal(result.state, 'in-progress');

  today.salida = '15:00';
  result = context.getTodayPanelData(sourceMonths, now);
  assert.equal(result.state, 'complete');

  today.invalid = true;
  result = context.getTodayPanelData(sourceMonths, now);
  assert.equal(result.state, 'invalid');

  today.invalid = false;
  today.tipo = 'festivo';
  today.notas = 'Festivo autonómico';
  result = context.getTodayPanelData(sourceMonths, now);
  assert.equal(result.state, 'non-working');
  assert.equal(result.typeLabel, 'Festivo');

  assert.equal(
    context.getTodayPanelData([], new Date(2026, 7, 1, 12)).state,
    'weekend'
  );
  assert.equal(
    context.getTodayPanelData([], new Date(2026, 7, 3, 12)).state,
    'missing'
  );
});

test('el panel Hoy calcula el saldo hasta la fila actual', () => {
  const days = [
    {date: new Date(2026, 6, 30), entrada: '08:05', salida: '', delta: -10},
    {date: new Date(2026, 6, 29), entrada: '08:00', salida: '15:00', delta: 20},
    {date: new Date(2026, 6, 31), entrada: '08:00', salida: '15:00', delta: 999}
  ];
  const calls = [];
  const context = vm.createContext({
    months: [{days}],
    getConfig: () => ({horaDay: 420}),
    computeBolsaUpTo: () => 30,
    calculateBolsaDay: (day, abs) => {
      calls.push(day);
      return {
        abs: abs + day.delta,
        salida: day.salida || '14:55',
        salidaAuto: !day.salida,
        suma: 410,
        diario: -10
      };
    }
  });
  vm.runInContext(extractFunction('toLocalIsoDate'), context);
  vm.runInContext(extractFunction('getTodayPanelMetrics'), context);

  const result = context.getTodayPanelMetrics({
    monthIdx: 0,
    dayIdx: 0,
    iso: '2026-07-30',
    day: {...days[0], tipo: 'habil'}
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].date.getDate(), 29);
  assert.equal(calls[1].date.getDate(), 30);
  assert.equal(result.entry, '08:05');
  assert.equal(result.exit, '14:55');
  assert.equal(result.exitPredicted, true);
  assert.equal(result.total, 410);
  assert.equal(result.difference, -10);
  assert.equal(result.balance, 40);
});

test('Editar hoy abre el mes y la fila correctos', () => {
  const calls = [];
  const context = vm.createContext({
    currentMonthIdx: 0,
    months: [
      {year: 2026, month: 5, days: []},
      {
        year: 2026,
        month: 6,
        days: [
          {date: new Date(2026, 6, 30), tipo: 'habil', entrada: '', salida: ''},
          {date: new Date(2026, 6, 29), tipo: 'habil', entrada: '', salida: ''}
        ]
      }
    ],
    DAY_TYPES: [{key: 'habil', label: 'Hábil'}],
    validateDaySequence: () => [],
    renderTabs: () => calls.push('tabs'),
    switchAppView: view => {
      calls.push(`view:${view}`);
      context.months[1].days.sort((a, b) => a.date - b.date);
    },
    setMobileSidebarOpen: open => calls.push(`sidebar:${open}`),
    openDayEdit: dayIdx => calls.push(`edit:${dayIdx}`)
  });
  vm.runInContext(extractFunction('toLocalIsoDate'), context);
  vm.runInContext(extractFunction('getTodayPanelData'), context);
  vm.runInContext(extractFunction('openTodayPunch'), context);

  context.openTodayPunch(new Date(2026, 6, 30, 12));

  assert.equal(context.currentMonthIdx, 1);
  assert.deepEqual(calls, ['tabs', 'view:records', 'sidebar:false', 'edit:1']);
});

test('el panel Hoy programa su actualización al siguiente día', () => {
  const calls = [];
  const context = vm.createContext({
    todayPanelRefreshTimer: 7,
    window: {
      clearTimeout: timer => calls.push(`clear:${timer}`),
      setTimeout: (_callback, delay) => {
        calls.push(`delay:${delay}`);
        return 8;
      }
    }
  });
  vm.runInContext(extractFunction('scheduleTodayPanelRefresh'), context);

  context.scheduleTodayPanelRefresh(new Date(2026, 6, 30, 23, 59, 0));

  assert.deepEqual(calls, ['clear:7', 'delay:60100']);
  assert.equal(context.todayPanelRefreshTimer, 8);
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
  assert.match(html, /id="today-panel"/);
  assert.match(html, /aria-label="Panel rápido de hoy"/);
  assert.match(html, /class="today-panel-metrics"/);
  assert.match(html, /onclick="openTodayPunch\(\)"/);
  assert.match(html, /@media \(max-width: 520px\)[\s\S]*?\.today-panel-metrics/);
  assert.match(html, /document\.addEventListener\('visibilitychange'/);
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

test('genera los calendarios oficiales de Andalucía de 2026 y 2027', () => {
  const context = createHolidayContext();
  const expected = {
    2026: [
      '2026-01-01',
      '2026-01-06',
      '2026-02-28',
      '2026-04-02',
      '2026-04-03',
      '2026-05-01',
      '2026-08-15',
      '2026-10-12',
      '2026-11-02',
      '2026-12-07',
      '2026-12-08',
      '2026-12-25'
    ],
    2027: [
      '2027-01-01',
      '2027-01-06',
      '2027-03-01',
      '2027-03-25',
      '2027-03-26',
      '2027-05-01',
      '2027-08-16',
      '2027-10-12',
      '2027-11-01',
      '2027-12-06',
      '2027-12-08',
      '2027-12-25'
    ]
  };

  for (const [year, dates] of Object.entries(expected)) {
    const holidays = context.getAutomaticAndalusianHolidays(Number(year));
    assert.deepEqual(Array.from(holidays, holiday => holiday.iso), dates);
    assert.equal(holidays.length, 12);
    assert.equal(holidays.every(holiday => holiday.managed === true), true);
  }
});

test('calcula la Semana Santa y traslada solo los festivos en domingo', () => {
  const context = createHolidayContext();

  assert.equal(context.toLocalIsoDate(context.getEasterSunday(2026)), '2026-04-05');
  assert.equal(context.toLocalIsoDate(context.getEasterSunday(2027)), '2027-03-28');

  const dates2027 = Array.from(
    context.getAutomaticAndalusianHolidays(2027),
    holiday => holiday.iso
  );
  assert.equal(dates2027.includes('2027-02-28'), false);
  assert.equal(dates2027.includes('2027-03-01'), true);
  assert.equal(dates2027.includes('2027-08-15'), false);
  assert.equal(dates2027.includes('2027-08-16'), true);
  assert.equal(dates2027.includes('2027-05-01'), true);
  assert.equal(dates2027.includes('2027-12-25'), true);
  assert.deepEqual(Array.from(context.getAutomaticAndalusianHolidays(2019)), []);
});

test('normaliza festivos y mantiene personalizaciones aisladas por año', () => {
  const context = createHolidayContext();

  const normalized = context.normalizeHolidayCalendars({
    2026: [
      {iso: '2026-02-30', nota: 'Inválido'},
      {iso: '2026-05-01', nota: 'Trabajo'},
      {iso: '2026-05-01', nota: 'Fiesta del Trabajo'}
    ]
  });
  assert.equal(normalized['2026'].length, 1);
  assert.equal(normalized['2026'][0].nota, 'Fiesta del Trabajo');
  assert.equal(context.getConfiguredHolidaysForYear(2026).length, 12);
  assert.equal(context.getConfiguredHolidaysForYear(2026)[0].managed, true);

  context.holidayCalendars = {'2026': []};
  assert.equal(context.getConfiguredHolidaysForYear(2026).length, 0);
  assert.equal(context.getConfiguredHolidaysForYear(2027).length, 12);

  const defaults = context.getDefaultHolidaysForYear(2026);
  context.setHolidayCalendarOverride(2026, defaults);
  assert.equal(
    Object.prototype.hasOwnProperty.call(context.holidayCalendars, '2026'),
    false
  );
});

test('actualiza meses existentes sin borrar fichajes ni notas del usuario', () => {
  const context = createHolidayContext();
  const transferredHoliday = {
    date: new Date(2027, 2, 1),
    tipo: 'habil',
    entrada: '08:00',
    desayunoIni: '09:00',
    desayunoFin: '09:15',
    comidaIni: '',
    comidaFin: '',
    salida: '15:00',
    teleDia: false,
    teleTarde: false,
    notas: ''
  };
  const protectedFichaje = {
    date: new Date(2027, 2, 25),
    tipo: 'habil',
    entrada: '08:01',
    desayunoIni: '09:00',
    desayunoFin: '09:15',
    comidaIni: '',
    comidaFin: '',
    salida: '15:00',
    teleDia: false,
    teleTarde: false,
    notas: ''
  };
  const protectedNote = {
    date: new Date(2027, 2, 26),
    tipo: 'habil',
    entrada: '',
    desayunoIni: '',
    desayunoFin: '',
    comidaIni: '',
    comidaFin: '',
    salida: '',
    teleDia: false,
    teleTarde: false,
    notas: 'Trabajo autorizado'
  };
  const pastDefaultFichaje = {
    date: new Date(2026, 4, 1),
    tipo: 'habil',
    entrada: '08:00',
    desayunoIni: '09:00',
    desayunoFin: '09:15',
    comidaIni: '',
    comidaFin: '',
    salida: '15:00',
    teleDia: false,
    teleTarde: false,
    notas: ''
  };
  const legacyHoliday = {
    date: new Date(2026, 11, 7),
    tipo: 'festivo',
    entrada: '',
    salida: '',
    teleDia: false,
    notas: 'Lunes siguiente al Día de la Constitución'
  };
  const sourceMonths = [
    {
      id: 'march-2027',
      year: 2027,
      month: 2,
      days: [transferredHoliday, protectedFichaje, protectedNote]
    },
    {id: 'may-2026', year: 2026, month: 4, days: [pastDefaultFichaje]},
    {id: 'december-2026', year: 2026, month: 11, days: [legacyHoliday]}
  ];

  const changed = context.applyAutomaticHolidaysToExistingMonths(
    sourceMonths,
    new Date(2026, 6, 30)
  );
  assert.equal(changed.length, 2);
  assert.equal(transferredHoliday.tipo, 'festivo');
  assert.equal(transferredHoliday.notas, 'Día de Andalucía');
  assert.equal(transferredHoliday.entrada, '08:00');
  assert.equal(transferredHoliday.salida, '15:00');
  assert.equal(protectedFichaje.tipo, 'habil');
  assert.equal(protectedFichaje.entrada, '08:01');
  assert.equal(protectedFichaje.salida, '15:00');
  assert.equal(protectedNote.tipo, 'habil');
  assert.equal(protectedNote.notas, 'Trabajo autorizado');
  assert.equal(pastDefaultFichaje.tipo, 'habil');
  assert.equal(legacyHoliday.notas, 'Día de la Constitución Española');
  assert.equal(
    context.isLegacyAutomaticHolidayNote(
      '2026-11-02',
      'Día siguiente a Todos los Santos'
    ),
    true
  );
  assert.equal(
    context.isLegacyAutomaticHolidayNote('2026-12-08', 'Inmaculada Concepción'),
    true
  );

  context.holidayCalendars = {'2027': []};
  const customizedDay = {
    date: new Date(2027, 7, 16),
    tipo: 'habil',
    notas: ''
  };
  assert.equal(
    context.applyAutomaticHolidaysToExistingMonths([
      {id: 'august-2027', year: 2027, month: 7, days: [customizedDay]}
    ]).length,
    0
  );
  assert.equal(customizedDay.tipo, 'habil');
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
  vm.runInContext(extractFunction('holidayDayHasRecordedData'), context);
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
  vm.runInContext(extractFunction('holidayDayHasRecordedData'), context);
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
