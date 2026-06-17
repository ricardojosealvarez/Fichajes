const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { TextDecoder, TextEncoder } = require('node:util');
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

const createGitHubContext = () => {
  const context = vm.createContext({
    TextDecoder,
    TextEncoder,
    Uint8Array,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary')
  });
  [
    'encodeGitHubPath',
    'encodeBase64Unicode',
    'decodeBase64Unicode',
    'getSnapshotDataScore'
  ].forEach(name => vm.runInContext(extractFunction(name), context));
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

test('codifica rutas GitHub conservando separadores', () => {
  const context = createGitHubContext();

  assert.equal(
    context.encodeGitHubPath('data/Fichajes 2026/á.json'),
    'data/Fichajes%202026/%C3%A1.json'
  );
});

test('codifica y decodifica contenido remoto con unicode', () => {
  const context = createGitHubContext();
  const content = JSON.stringify({nota: 'mañana €', lineas: ['uno', 'dos']});

  assert.equal(context.decodeBase64Unicode(context.encodeBase64Unicode(content)), content);
});

test('detecta snapshots con más datos registrados', () => {
  const context = createGitHubContext();
  const emptySnapshot = {months: [{days: [{tipo: 'habil', entrada: '', salida: ''}]}]};
  const filledSnapshot = {months: [{days: [{tipo: 'habil', entrada: '08:00', salida: '15:00'}]}]};

  assert.ok(context.getSnapshotDataScore(filledSnapshot) > context.getSnapshotDataScore(emptySnapshot));
});
