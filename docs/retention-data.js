(function (root, factory) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const data = factory(isNode ? require('./data.js') : root && root.FHRData);
  if (isNode) module.exports = data;
  if (root) root.RetentionData = data;
})(typeof window === 'undefined' ? null : window, function (storeData) {
  'use strict';
  if (!storeData || !Array.isArray(storeData.stores)) throw new Error('Load data.js before retention-data.js.');

  // 10月の架空会員4名。氏名・会員番号はデモ用で、実際の顧客ではありません。
  // 9月KPIとは連動しません。実AIや退会確率の判定ではありません。
  // 来館数は基準日までの直近28日間と、その前28日間の比較です。
  const asOf = '2026-10-14';
  const cases = Object.freeze([
    Object.freeze({ id: 'DEMO-001', storeId: 'B', displayName: 'Daniel Tan', memberNumber: 'MY-1024', previousVisits: 8, currentVisits: 2, daysSinceVisit: 18, paymentIssue: false, renewalDays: 45 }),
    Object.freeze({ id: 'DEMO-002', storeId: 'B', displayName: 'Aina Rahman', memberNumber: 'MY-1087', previousVisits: 5, currentVisits: 4, daysSinceVisit: 3, paymentIssue: true, renewalDays: 75 }),
    Object.freeze({ id: 'DEMO-003', storeId: 'A', displayName: '佐藤 健太', memberNumber: 'JP-2041', previousVisits: 6, currentVisits: 2, daysSinceVisit: 8, paymentIssue: false, renewalDays: 60 }),
    Object.freeze({ id: 'DEMO-004', storeId: 'A', displayName: '高橋 美咲', memberNumber: 'JP-2086', previousVisits: 4, currentVisits: 4, daysSinceVisit: 14, paymentIssue: false, renewalDays: 30 })
  ]);
  const statuses = Object.freeze({ unassigned: '未着手', planned: '対応予定', contacted: '連絡済み', closed: '結果記録済み' });
  const outcomes = Object.freeze({ unknown: '経過確認中', resumed: '来館再開を確認', continuing: '継続意向を確認', cancelled: '退会を確認' });
  const entryKeys = ['owner', 'due', 'status', 'outcome', 'note'];

  function signals(item) {
    if (!item || typeof item !== 'object') throw new TypeError('A case is required.');
    for (const key of ['previousVisits', 'currentVisits', 'daysSinceVisit', 'renewalDays']) {
      if (!Number.isInteger(item[key]) || item[key] < 0) throw new RangeError(key + ' must be a nonnegative integer.');
    }
    if (typeof item.paymentIssue !== 'boolean') throw new TypeError('paymentIssue must be boolean.');
    const result = [];
    if (item.previousVisits >= 4 && item.currentVisits <= item.previousVisits / 2) result.push('来館回数が半分以下');
    if (item.daysSinceVisit >= 14) result.push('2週間以上、来館なし');
    if (item.paymentIssue) result.push('会費の決済を確認');
    if (item.renewalDays <= 30) result.push('契約更新まで30日以内');
    return result;
  }

  function owners(storeId) {
    const store = storeData.stores.find(function (item) { return item.id === storeId; });
    if (!store) throw new RangeError('Unknown store ID: ' + String(storeId));
    return [store.manager, '本部 運営担当'];
  }

  function initialRecords() {
    const records = {};
    cases.forEach(function (item) {
      records[item.id] = { owner: '', due: '', status: 'unassigned', outcome: 'unknown', note: '', history: [] };
    });
    return records;
  }

  function exactKeys(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object.');
    if (Object.keys(value).length !== keys.length || keys.some(function (key) { return !Object.hasOwn(value, key); })) {
      throw new RangeError(label + ' has missing or unknown fields.');
    }
  }

  function validDue(due) {
    if (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return false;
    if (due < asOf || due > '2026-12-31') return false;
    const timestamp = Date.parse(due + 'T00:00:00.000Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === due;
  }

  function validateValues(entry, storeId, allowUnassigned) {
    if (typeof entry.note !== 'string' || entry.note.length > 240) throw new RangeError('Note must be a string of at most 240 characters.');
    if (typeof entry.status !== 'string' || typeof entry.outcome !== 'string' || !Object.hasOwn(statuses, entry.status) || !Object.hasOwn(outcomes, entry.outcome)) throw new RangeError('Unknown status or outcome.');
    if (entry.status === 'unassigned') {
      if (!allowUnassigned || entry.owner !== '' || entry.due !== '' || entry.note !== '' || entry.outcome !== 'unknown') {
        throw new RangeError('Only an initial record may be unassigned.');
      }
      return;
    }
    if (!owners(storeId).includes(entry.owner)) throw new RangeError('Owner must be an allowed responsible person.');
    if (!validDue(entry.due)) throw new RangeError('Due date must be a real ISO date from ' + asOf + ' through 2026-12-31.');
    if (entry.status === 'closed' ? entry.outcome === 'unknown' : entry.outcome !== 'unknown') {
      throw new RangeError('Only a closed record may have a confirmed outcome, and it must have one.');
    }
  }

  function validateRecords(records) {
    exactKeys(records, cases.map(function (item) { return item.id; }), 'Records');
    cases.forEach(function (item) {
      const record = records[item.id];
      exactKeys(record, entryKeys.concat('history'), 'Record');
      validateValues(record, item.storeId, true);
      if (!Array.isArray(record.history)) throw new TypeError('History must be an array.');
      if (record.status === 'unassigned' && record.history.length) throw new RangeError('An initial record cannot have history.');
      record.history.forEach(function (entry) {
        exactKeys(entry, entryKeys, 'History entry');
        validateValues(entry, item.storeId, false);
      });
    });
  }

  function copyEntry(entry) {
    return { owner: entry.owner, due: entry.due, status: entry.status, outcome: entry.outcome, note: entry.note };
  }

  function saveRecord(records, id, patch) {
    const item = cases.find(function (candidate) { return candidate.id === id; });
    if (!item) throw new RangeError('Unknown case ID: ' + String(id));
    exactKeys(patch, entryKeys, 'Patch');
    validateValues(patch, item.storeId, false);
    validateRecords(records);
    const result = {};
    cases.forEach(function (candidate) {
      const record = records[candidate.id];
      result[candidate.id] = Object.assign(copyEntry(record), { history: record.history.map(copyEntry) });
    });
    const history = result[id].history;
    history.push(copyEntry(patch));
    result[id] = Object.assign(copyEntry(patch), { history: history });
    return result;
  }

  function summary(records, scope = 'all') {
    const isStore = storeData.stores.some(function (store) { return store.id === scope; });
    const isCountry = storeData.countries.some(function (country) { return country.id === scope; });
    if (scope !== 'all' && !isStore && !isCountry) throw new RangeError('Unknown scope: ' + String(scope));
    validateRecords(records);
    const result = { total: 0, unassigned: 0, planned: 0, contacted: 0, closed: 0, resumed: 0, continuing: 0, cancelled: 0 };
    cases.forEach(function (item) {
      const store = storeData.stores.find(function (candidate) { return candidate.id === item.storeId; });
      if (scope !== 'all' && item.storeId !== scope && store.country !== scope) return;
      const record = records[item.id];
      result.total += 1;
      result[record.status] += 1;
      if (record.status === 'closed') result[record.outcome] += 1;
    });
    return result;
  }

  return Object.freeze({ asOf: asOf, cases: cases, statuses: statuses, outcomes: outcomes, signals: signals, owners: owners, initialRecords: initialRecords, saveRecord: saveRecord, summary: summary });
});
