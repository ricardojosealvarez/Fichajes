const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(new URL('./index.html', `file://${__filename}`), 'utf8');

const extractFunction = name => {
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `No se encontró la función ${name}`);

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
