'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../docs/data.js');
const retention = require('../docs/retention-data.js');

function patchFor(id = 'DEMO-001', changes = {}) {
  const item = retention.cases.find(candidate => candidate.id === id);
  return { owner: retention.owners(item.storeId)[0], due: '2026-10-21', status: 'planned', outcome: 'unknown', note: '', ...changes };
}

test('four fictional October members cover two cases per store and each has a signal', () => {
  assert.equal(retention.asOf, '2026-10-14');
  assert.equal(retention.cases.length, 4);
  assert.equal(new Set(retention.cases.map(item => item.id)).size, 4);
  assert.equal(new Set(retention.cases.map(item => item.memberNumber)).size, 4);
  assert.deepEqual(retention.cases.map(({ id, storeId, displayName, memberNumber }) => ({ id, storeId, displayName, memberNumber })), [
    { id: 'DEMO-001', storeId: 'B', displayName: 'Daniel Tan', memberNumber: 'MY-1024' },
    { id: 'DEMO-002', storeId: 'B', displayName: 'Aina Rahman', memberNumber: 'MY-1087' },
    { id: 'DEMO-003', storeId: 'A', displayName: '佐藤 健太', memberNumber: 'JP-2041' },
    { id: 'DEMO-004', storeId: 'A', displayName: '高橋 美咲', memberNumber: 'JP-2086' }
  ]);
  for (const storeId of ['A', 'B']) assert.equal(retention.cases.filter(item => item.storeId === storeId).length, 2);
  for (const item of retention.cases) {
    assert.ok(retention.signals(item).length > 0);
    if (item.daysSinceVisit >= 28) assert.equal(item.currentVisits, 0, 'No visit within the current 28-day period.');
  }
  assert.deepEqual(retention.cases.map(({ previousVisits, currentVisits, daysSinceVisit, paymentIssue, renewalDays }) => ({ previousVisits, currentVisits, daysSinceVisit, paymentIssue, renewalDays })), [
    { previousVisits: 8, currentVisits: 2, daysSinceVisit: 18, paymentIssue: false, renewalDays: 45 },
    { previousVisits: 5, currentVisits: 4, daysSinceVisit: 3, paymentIssue: true, renewalDays: 75 },
    { previousVisits: 6, currentVisits: 2, daysSinceVisit: 8, paymentIssue: false, renewalDays: 60 },
    { previousVisits: 4, currentVisits: 4, daysSinceVisit: 14, paymentIssue: false, renewalDays: 30 }
  ]);
  assert.ok(Object.isFrozen(retention.cases));
  assert.ok(retention.cases.every(Object.isFrozen));
  assert.throws(() => { retention.cases[0].currentVisits = 100; }, TypeError);
  assert.throws(() => { retention.cases[0].displayName = 'changed'; }, TypeError);
  assert.throws(() => { retention.cases[0].memberNumber = 'changed'; }, TypeError);
});

test('demo thresholds include the exact boundaries and exclude just-below cases', () => {
  const base = { previousVisits: 4, currentVisits: 3, daysSinceVisit: 13, paymentIssue: false, renewalDays: 31 };
  assert.deepEqual(retention.signals(base), []);
  assert.deepEqual(retention.signals({ ...base, currentVisits: 2 }), ['来館回数が半分以下']);
  assert.deepEqual(retention.signals({ ...base, previousVisits: 3, currentVisits: 0 }), []);
  assert.deepEqual(retention.signals({ ...base, daysSinceVisit: 14 }), ['2週間以上、来館なし']);
  assert.deepEqual(retention.signals({ ...base, paymentIssue: true }), ['会費の決済を確認']);
  for (const renewalDays of [0, 30]) assert.deepEqual(retention.signals({ ...base, renewalDays }), ['契約更新まで30日以内']);
  assert.deepEqual(retention.signals({ ...base, currentVisits: 2, daysSinceVisit: 14, paymentIssue: true, renewalDays: 30 }), ['来館回数が半分以下', '2週間以上、来館なし', '会費の決済を確認', '契約更新まで30日以内']);
  const output = retention.signals(retention.cases[0]);
  output.length = 0;
  assert.deepEqual(retention.signals(retention.cases[0]), ['来館回数が半分以下', '2週間以上、来館なし']);
});

test('signal rules reject malformed input rather than coercing it', () => {
  for (const input of [null, undefined, 'case']) assert.throws(() => retention.signals(input));
  for (const key of ['previousVisits', 'currentVisits', 'daysSinceVisit', 'renewalDays']) {
    for (const value of [-1, 1.5, NaN, Infinity, '4', null]) assert.throws(() => retention.signals({ ...retention.cases[0], [key]: value }));
  }
  assert.throws(() => retention.signals({ ...retention.cases[0], paymentIssue: 'false' }));
});

test('owners track the existing store managers and return independent choices', () => {
  for (const store of data.stores) assert.deepEqual(retention.owners(store.id), [store.manager, '本部 運営担当']);
  const owners = retention.owners('B');
  owners[0] = 'changed';
  assert.equal(retention.owners('B')[0], data.stores.find(store => store.id === 'B').manager);
  for (const id of ['all', 'JP', 'C', 'D', null, undefined]) assert.throws(() => retention.owners(id), RangeError);
});

test('status and outcome labels are exact and immutable', () => {
  assert.deepEqual(retention.statuses, { unassigned: '未着手', planned: '対応予定', contacted: '連絡済み', closed: '結果記録済み' });
  assert.deepEqual(retention.outcomes, { unknown: '経過確認中', resumed: '来館再開を確認', continuing: '継続意向を確認', cancelled: '退会を確認' });
  assert.throws(() => { retention.statuses.contacted = '継続'; }, TypeError);
  assert.throws(() => { retention.outcomes.resumed = '成功'; }, TypeError);
});

test('initial records are independent across cases and calls', () => {
  const first = retention.initialRecords();
  const second = retention.initialRecords();
  assert.deepEqual(Object.keys(first), retention.cases.map(item => item.id));
  for (const item of retention.cases) assert.deepEqual(first[item.id], { owner: '', due: '', status: 'unassigned', outcome: 'unknown', note: '', history: [] });
  for (const [scope, total] of [['all', 4], ['JP', 2], ['MY', 2], ['A', 2], ['B', 2]]) {
    assert.deepEqual(retention.summary(first, scope), { total, unassigned: total, planned: 0, contacted: 0, closed: 0, resumed: 0, continuing: 0, cancelled: 0 });
  }
  first['DEMO-001'].history.push({ note: 'changed' });
  first['DEMO-001'].note = 'changed';
  assert.equal(first['DEMO-002'].history.length, 0);
  assert.equal(second['DEMO-001'].history.length, 0);
  assert.equal(second['DEMO-001'].note, '');
});

test('save returns a full deep copy and appends independent history snapshots', () => {
  const initial = retention.initialRecords();
  const firstPatch = patchFor();
  const saved = retention.saveRecord(initial, 'DEMO-001', firstPatch);
  const nextPatch = patchFor('DEMO-001', { status: 'contacted', note: '本人の都合を確認' });
  const updated = retention.saveRecord(saved, 'DEMO-001', nextPatch);
  assert.deepEqual(updated['DEMO-001'].history, [firstPatch, nextPatch]);
  assert.equal(saved['DEMO-001'].history.length, 1);
  assert.equal(initial['DEMO-001'].status, 'unassigned');
  assert.equal(initial['DEMO-001'].history.length, 0);
  assert.notEqual(updated['DEMO-002'], saved['DEMO-002']);
  assert.notEqual(updated['DEMO-002'].history, saved['DEMO-002'].history);
  firstPatch.note = 'later mutation';
  nextPatch.note = 'later mutation';
  updated['DEMO-001'].history[0].note = 'changed in copy';
  updated['DEMO-002'].history.push({});
  assert.equal(saved['DEMO-001'].history[0].note, '');
  assert.equal(updated['DEMO-001'].history[1].note, '本人の都合を確認');
  assert.equal(saved['DEMO-002'].history.length, 0);
});

test('due date accepts inclusive limits and real dates within the range', () => {
  for (const due of ['2026-10-14', '2026-10-31', '2026-11-30', '2026-12-31']) {
    assert.equal(retention.saveRecord(retention.initialRecords(), 'DEMO-001', patchFor('DEMO-001', { due }))['DEMO-001'].due, due);
  }
});

test('due date rejects overflow dates, missing padding, timestamps, and out-of-range values', () => {
  const invalidDates = ['2026-10-13', '2027-01-01', '2026-02-30', '2026-11-31', '2026-10-32', '2026-13-01', '2026-12-00', '2026-10-1', '2026/10/21', '2026-10-21T00:00:00Z', ' 2026-10-21', '2026-10-21 ', '', null, 20261021];
  const initial = retention.initialRecords();
  for (const due of invalidDates) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { due })), RangeError, String(due));
  assert.deepEqual(initial, retention.initialRecords());
});

test('owner, note limits, exact patch fields, and case IDs are validated', () => {
  const initial = retention.initialRecords();
  for (const owner of ['', '任意の担当', retention.owners('A')[0], null]) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { owner })));
  for (const owner of retention.owners('B')) assert.equal(retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { owner }))['DEMO-001'].owner, owner);
  assert.equal(retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { note: 'あ'.repeat(240) }))['DEMO-001'].note.length, 240);
  for (const note of ['あ'.repeat(241), 1, null, ['text']]) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { note })));
  for (const field of ['owner', 'due', 'status', 'outcome', 'note']) {
    const patch = patchFor();
    delete patch[field];
    assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patch));
  }
  assert.throws(() => retention.saveRecord(initial, 'DEMO-001', { ...patchFor(), probability: 0.9 }));
  for (const id of ['DEMO-005', 'DEMO-006', 'DEMO-999', '__proto__', null]) assert.throws(() => retention.saveRecord(initial, id, patchFor()));
  assert.deepEqual(initial, retention.initialRecords());
});

test('only closed records accept confirmed outcomes and closed requires one', () => {
  const initial = retention.initialRecords();
  for (const status of ['planned', 'contacted']) {
    assert.doesNotThrow(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { status })));
    for (const outcome of ['resumed', 'continuing', 'cancelled']) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { status, outcome })));
  }
  assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { status: 'closed' })));
  for (const outcome of ['resumed', 'continuing', 'cancelled']) assert.doesNotThrow(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { status: 'closed', outcome })));
  for (const status of ['unassigned', 'done', '__proto__', ['planned'], null]) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { status })));
  for (const outcome of ['success', '__proto__', ['unknown'], null]) assert.throws(() => retention.saveRecord(initial, 'DEMO-001', patchFor('DEMO-001', { outcome })));
});

test('summary separates activity from outcomes for all, country, and store scopes', () => {
  const september = data.summary();
  let records = retention.initialRecords();
  const states = [['DEMO-001', 'planned', 'unknown'], ['DEMO-002', 'contacted', 'unknown'], ['DEMO-003', 'closed', 'resumed'], ['DEMO-004', 'closed', 'continuing']];
  for (const [id, status, outcome] of states) records = retention.saveRecord(records, id, patchFor(id, { status, outcome }));
  assert.deepEqual(retention.summary(records), { total: 4, unassigned: 0, planned: 1, contacted: 1, closed: 2, resumed: 1, continuing: 1, cancelled: 0 });
  assert.deepEqual(retention.summary(records, 'JP'), { total: 2, unassigned: 0, planned: 0, contacted: 0, closed: 2, resumed: 1, continuing: 1, cancelled: 0 });
  assert.deepEqual(retention.summary(records, 'MY'), { total: 2, unassigned: 0, planned: 1, contacted: 1, closed: 0, resumed: 0, continuing: 0, cancelled: 0 });
  assert.deepEqual(retention.summary(records, 'MY'), retention.summary(records, 'B'));
  assert.deepEqual(retention.summary(records, 'JP'), retention.summary(records, 'A'));
  for (const key of Object.keys(retention.summary(records))) {
    assert.equal(retention.summary(records)[key], retention.summary(records, 'JP')[key] + retention.summary(records, 'MY')[key]);
  }
  assert.deepEqual(data.summary(), september);
});

test('summary uses the latest record, never counts history as additional outcomes', () => {
  let records = retention.saveRecord(retention.initialRecords(), 'DEMO-001', patchFor('DEMO-001', { status: 'closed', outcome: 'resumed' }));
  records = retention.saveRecord(records, 'DEMO-001', patchFor('DEMO-001', { status: 'closed', outcome: 'continuing' }));
  assert.equal(retention.summary(records).closed, 1);
  assert.equal(retention.summary(records).resumed, 0);
  assert.equal(retention.summary(records).continuing, 1);
  records = retention.saveRecord(records, 'DEMO-001', patchFor('DEMO-001', { status: 'closed', outcome: 'cancelled' }));
  assert.equal(retention.summary(records).closed, 1);
  assert.equal(retention.summary(records).continuing, 0);
  assert.equal(retention.summary(records).cancelled, 1);
  records = retention.saveRecord(records, 'DEMO-001', patchFor('DEMO-001', { status: 'contacted' }));
  assert.equal(retention.summary(records).closed, 0);
  assert.equal(retention.summary(records).continuing, 0);
  assert.equal(retention.summary(records).cancelled, 0);
  assert.equal(retention.summary(records).contacted, 1);
  assert.equal(records['DEMO-001'].history.length, 4);
});

test('summary and save reject malformed records and unknown scopes', () => {
  const initial = retention.initialRecords();
  for (const scope of ['HK', 'C', 'D', '', null, '__proto__']) assert.throws(() => retention.summary(initial, scope));
  const missing = retention.initialRecords();
  delete missing['DEMO-004'];
  const extra = retention.initialRecords();
  extra['DEMO-005'] = { ...extra['DEMO-004'], history: [] };
  const inconsistent = retention.initialRecords();
  inconsistent['DEMO-001'].outcome = 'resumed';
  const badHistory = retention.initialRecords();
  badHistory['DEMO-001'].history = 'invalid';
  for (const records of [null, {}, [], missing, extra, inconsistent, badHistory]) {
    assert.throws(() => retention.summary(records));
    assert.throws(() => retention.saveRecord(records, 'DEMO-001', patchFor()));
  }
});

test('browser classic scripts expose RetentionData with matching stores and no Node globals', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../docs/data.js'), 'utf8'), context);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../docs/retention-data.js'), 'utf8'), context);
  const browser = context.window.RetentionData;
  assert.equal(browser.asOf, '2026-10-14');
  assert.equal(browser.summary(browser.initialRecords()).total, 4);
  assert.equal(browser.summary(browser.initialRecords(), 'JP').total, 2);
  assert.equal(browser.summary(browser.initialRecords(), 'MY').total, 2);
  assert.equal(browser.cases[0].displayName, 'Daniel Tan');
  assert.equal(browser.cases[0].memberNumber, 'MY-1024');
  assert.equal(browser.owners('B')[0], data.stores.find(store => store.id === 'B').manager);
});
