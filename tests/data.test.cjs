'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../docs/data.js');

test('September JPY totals reconcile membership and money', () => {
  const expected = {
    A: { members: 828, revenue: 7200000, expenses: 5430000, profit: 1770000, netGrowth: 28 },
    B: { members: 608, revenue: 5250000, expenses: 4590000, profit: 660000, netGrowth: 8 },
    all: { members: 1436, revenue: 12450000, expenses: 10020000, profit: 2430000, netGrowth: 36 }
  };
  for (const [storeId, values] of Object.entries(expected)) {
    const summary = data.summary(storeId);
    for (const [key, value] of Object.entries(values)) assert.equal(summary[key], value, storeId + ': ' + key);
    assert.equal(summary.members, summary.opening + summary.joins - summary.leaves);
    assert.equal(summary.profit, summary.revenue - summary.expenses);
    assert.equal(summary.netGrowth, summary.joins - summary.leaves);
    assert.equal(summary.currency, 'JPY');
    assert.equal(summary.storeCount, storeId === 'all' ? 2 : 1);
    assert.equal(summary.countryCount, storeId === 'all' ? 2 : 1);
  }
  assert.deepEqual(data.summary(), data.summary('all'));
});

test('all-store rates use weighted totals and retain precision', () => {
  const summary = data.summary();
  assert.equal(summary.opening, 1400);
  assert.equal(summary.joins, 70);
  assert.equal(summary.leaves, 34);
  assert.equal(summary.churnPercent, 34 / 1400 * 100);
  assert.equal(summary.previousChurnPercent, 28 / 1400 * 100);
  assert.equal(summary.pending, 16);
  assert.equal(summary.followupsTotal, 50);
  assert.equal(summary.followupsCompleted, 34);
  assert.equal(summary.completionPercent, 34 / 50 * 100);
  assert.equal(summary.previousRevenue, 12270000);
  assert.equal(summary.previousProfit, 2490000);
  assert.equal(summary.revenueChangePercent, 180000 / 12270000 * 100);
  assert.equal(summary.profitChangePercent, -60000 / 2490000 * 100);
  assert.equal(data.summary('B').profitChangePercent, -10000 / 32000 * 100);
  assert.equal(data.summary('B').churnPercent, 3);
  assert.equal(data.summary('B').previousChurnPercent, 2);
});

test('monthly series closes in September and matches current and previous summaries', () => {
  for (const scope of ['A', 'B', 'JP', 'MY', 'all']) {
    for (const currency of scope === 'all' ? ['JPY'] : ['JPY', 'local']) {
      const series = data.monthlySeries(scope, currency);
      const summary = data.summary(scope, currency);
      assert.deepEqual(series.map(month => month.label), ['4月', '5月', '6月', '7月', '8月', '9月']);
      assert.equal(series[5].revenue, summary.revenue);
      assert.equal(series[5].profit, summary.profit);
      assert.equal(series[4].revenue, summary.previousRevenue);
      assert.equal(series[4].profit, summary.previousProfit);
      assert.ok(series.every(month => month.currency === summary.currency));
    }
  }
});

test('every all-store month is the sum of the two retained stores', () => {
  const series = data.monthlySeries();
  const storeSeries = data.stores.map(store => data.monthlySeries(store.id));
  assert.deepEqual(series.map(month => month.revenue), [11220000, 11490000, 11820000, 12090000, 12270000, 12450000]);
  assert.deepEqual(series.map(month => month.profit), [2040000, 2130000, 2280000, 2400000, 2490000, 2430000]);
  series.forEach((month, index) => {
    assert.equal(month.revenue, storeSeries.reduce((sum, store) => sum + store[index].revenue, 0));
    assert.equal(month.profit, storeSeries.reduce((sum, store) => sum + store[index].profit, 0));
  });
});

test('country, store, and consolidated JPY reports agree', () => {
  const sumKeys = ['revenue', 'expenses', 'profit', 'previousRevenue', 'previousProfit', 'opening', 'joins', 'leaves', 'members', 'pending', 'followupsTotal', 'followupsCompleted', 'netGrowth', 'storeCount'];
  for (const currency of ['JPY', 'local']) {
    assert.deepEqual(data.summary('MY', currency), data.summary('B', currency));
    assert.deepEqual(data.monthlySeries('MY', currency), data.monthlySeries('B', currency));
    assert.deepEqual(data.summary('JP', currency), data.summary('A', currency));
    assert.deepEqual(data.monthlySeries('JP', currency), data.monthlySeries('A', currency));
  }
  const consolidated = data.summary();
  const countries = ['JP', 'MY'].map(country => data.summary(country));
  for (const key of [...sumKeys, 'countryCount']) {
    assert.equal(consolidated[key], countries.reduce((sum, country) => sum + country[key], 0), key);
  }
  const countrySeries = ['JP', 'MY'].map(country => data.monthlySeries(country));
  data.monthlySeries().forEach((month, index) => {
    for (const key of ['revenue', 'profit']) assert.equal(month[key], countrySeries.reduce((sum, series) => sum + series[index][key], 0));
  });
});

test('Japan contains only the retained domestic AF store', () => {
  const japan = data.summary('JP', 'local');
  assert.equal(japan.currency, 'JPY');
  assert.equal(japan.storeCount, 1);
  assert.equal(japan.countryCount, 1);
  assert.equal(japan.revenue, 7200000);
  assert.equal(japan.expenses, 5430000);
  assert.equal(japan.profit, 1770000);
  assert.equal(japan.previousRevenue, 6840000);
  assert.equal(japan.previousProfit, 1530000);
  assert.equal(japan.opening, 800);
  assert.equal(japan.members, 828);
  assert.equal(japan.leaves, 16);
  assert.equal(japan.pending, 4);
  assert.equal(japan.churnPercent, 16 / 800 * 100);
  assert.equal(japan.previousChurnPercent, 16 / 800 * 100);
  assert.equal(japan.completionPercent, 16 / 20 * 100);
  assert.equal(japan.revenueChangePercent, 360000 / 6840000 * 100);
  assert.equal(japan.profitChangePercent, 240000 / 1530000 * 100);
  assert.deepEqual(japan, data.summary('JP', 'JPY'));
});

test('native currency amounts convert to JPY without changing people, cases, or rates', () => {
  const expectations = [
    { id: 'A', currency: 'JPY', rate: 1, revenue: 7200000, expenses: 5430000, profit: 1770000, previousRevenue: 6840000, previousProfit: 1530000 },
    { id: 'B', currency: 'MYR', rate: 30, revenue: 175000, expenses: 153000, profit: 22000, previousRevenue: 181000, previousProfit: 32000 }
  ];
  for (const expected of expectations) {
    const local = data.summary(expected.id, 'local');
    const yen = data.summary(expected.id, 'JPY');
    assert.equal(local.currency, expected.currency);
    assert.equal(yen.currency, 'JPY');
    for (const key of ['revenue', 'expenses', 'profit', 'previousRevenue', 'previousProfit']) {
      assert.equal(local[key], expected[key], expected.id + ': ' + key);
      assert.equal(yen[key], expected[key] * expected.rate, expected.id + ': JPY ' + key);
    }
    for (const key of ['opening', 'joins', 'leaves', 'members', 'pending', 'followupsTotal', 'followupsCompleted', 'netGrowth', 'churnPercent', 'previousChurnPercent', 'completionPercent', 'revenueChangePercent', 'profitChangePercent']) {
      assert.equal(local[key], yen[key], expected.id + ': ' + key);
    }
  }
});

test('all six months use the same fixed conversion as the current and prior month', () => {
  const expectations = [
    { id: 'A', rate: 1, revenue: [6330000, 6480000, 6630000, 6720000, 6840000, 7200000], profit: [1230000, 1290000, 1350000, 1410000, 1530000, 1770000] },
    { id: 'B', rate: 30, revenue: [163000, 167000, 173000, 179000, 181000, 175000], profit: [27000, 28000, 31000, 33000, 32000, 22000] }
  ];
  for (const expected of expectations) {
    for (const key of ['revenue', 'profit']) {
      assert.deepEqual(data.monthlySeries(expected.id, 'local').map(month => month[key]), expected[key]);
      assert.deepEqual(data.monthlySeries(expected.id).map(month => month[key]), expected[key].map(amount => amount * expected.rate));
    }
  }
});

test('mixed native currencies cannot be aggregated and unsupported currencies reject', () => {
  assert.throws(() => data.summary('all', 'local'), RangeError);
  assert.throws(() => data.monthlySeries('all', 'local'), RangeError);
  for (const currency of ['MYR', 'HKD', 'USD', 'jpy', '', null, 0, {}, NaN]) {
    for (const scope of ['all', 'B', 'MY']) {
      assert.throws(() => data.summary(scope, currency), RangeError);
      assert.throws(() => data.monthlySeries(scope, currency), RangeError);
    }
  }
});

test('invalid store or country scopes reject rather than displaying unrelated totals', () => {
  for (const scope of ['C', 'D', 'US', 'HK', 'jp', '', 'a', null, 0, {}, '__proto__']) {
    for (const currency of ['JPY', 'local']) {
      assert.throws(() => data.summary(scope, currency), RangeError);
      assert.throws(() => data.monthlySeries(scope, currency), RangeError);
    }
  }
});

test('simulation calculates monthly revenue at zero and inclusive bounds', () => {
  assert.deepEqual(data.simulate(0, 0), { people: 0, fee: 0, monthlyRevenue: 0 });
  assert.deepEqual(data.simulate(0, 1000), { people: 0, fee: 1000, monthlyRevenue: 0 });
  assert.deepEqual(data.simulate(30, 0), { people: 30, fee: 0, monthlyRevenue: 0 });
  assert.deepEqual(data.simulate(30, 1000), { people: 30, fee: 1000, monthlyRevenue: 30000 });
  assert.deepEqual(data.simulate(12, 149.5), { people: 12, fee: 149.5, monthlyRevenue: 1794 });
});

test('simulation rejects out-of-range, fractional-people, and nonfinite input', () => {
  for (const people of [-1, 31, 1.5]) assert.throws(() => data.simulate(people, 100), RangeError);
  for (const fee of [-0.01, 1000.01]) assert.throws(() => data.simulate(10, fee), RangeError);
  for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '10', true, {}, []]) {
    assert.throws(() => data.simulate(invalid, 100), TypeError);
    assert.throws(() => data.simulate(10, invalid), TypeError);
  }
});

test('browser classic script exposes the same API without Node globals', () => {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, '../docs/data.js'), 'utf8');
  vm.runInNewContext(source, context);
  assert.equal(context.window.FHRData.summary().revenue, data.summary().revenue);
  assert.equal(context.window.FHRData.simulate(10, 150).monthlyRevenue, 1500);
  assert.equal(context.window.FHRData.stores.length, 2);
  assert.equal(context.window.FHRData.countries.length, 2);
  assert.equal(context.window.FHRData.summary('MY', 'local').currency, 'MYR');
  assert.equal(context.window.FHRData.summary('JP').revenue, 7200000);
  assert.equal(context.window.FHRData.monthlySeries().length, 6);
});

test('country and store metadata are complete and immutable', () => {
  assert.deepEqual(data.countries, [
    { id: 'JP', name: '日本', currency: 'JPY', rateToJPY: 1 },
    { id: 'MY', name: 'マレーシア', currency: 'MYR', rateToJPY: 30 }
  ]);
  assert.deepEqual(data.stores.map(({ id, name, country, currency, region, brand, operator }) => ({ id, name, country, currency, region, brand, operator })), [
    { id: 'A', name: '国内AF店舗', country: 'JP', currency: 'JPY', region: '日本', brand: 'ANYTIME FITNESS', operator: '株式会社ラ・ヴィーチェ' },
    { id: 'B', name: 'マレーシアAF店舗', country: 'MY', currency: 'MYR', region: 'マレーシア', brand: 'ANYTIME FITNESS', operator: 'FHR ALLIANCE SDN BHD.' }
  ]);
  assert.ok(Object.isFrozen(data.countries));
  assert.ok(data.countries.every(Object.isFrozen));
  assert.throws(() => { data.countries[1].rateToJPY = 100; }, TypeError);
  assert.throws(() => { data.countries[1].currency = 'JPY'; }, TypeError);
  assert.throws(() => { data.countries.push({ id: 'US' }); }, TypeError);
  assert.throws(() => { data.stores[1].country = 'JP'; }, TypeError);
  assert.throws(() => { data.stores[0].brand = '別ブランド'; }, TypeError);
  assert.throws(() => { data.stores[0].operator = '別会社'; }, TypeError);
  assert.throws(() => { data.stores[0].revenue = 1; }, TypeError);
  assert.throws(() => { data.stores.push({ id: 'D' }); }, TypeError);
  assert.equal(data.summary('MY').revenue, 5250000);
});

test('changing returned results cannot alter later calculations', () => {
  const summary = data.summary();
  summary.revenue = 1;
  const series = data.monthlySeries();
  series[0].revenue = 1;
  assert.equal(data.summary().revenue, 12450000);
  assert.equal(data.monthlySeries()[0].revenue, 11220000);
});
