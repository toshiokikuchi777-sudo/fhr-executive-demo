'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('../docs/data.js');

test('September totals reconcile membership and money', () => {
  const expected = {
    A: { members: 828, revenue: 240000, expenses: 181000, profit: 59000, netGrowth: 28 },
    B: { members: 608, revenue: 175000, expenses: 153000, profit: 22000, netGrowth: 8 },
    C: { members: 724, revenue: 210000, expenses: 160000, profit: 50000, netGrowth: 24 },
    all: { members: 2160, revenue: 625000, expenses: 494000, profit: 131000, netGrowth: 60 }
  };
  for (const [storeId, values] of Object.entries(expected)) {
    const summary = data.summary(storeId);
    for (const [key, value] of Object.entries(values)) assert.equal(summary[key], value, storeId + ': ' + key);
    assert.equal(summary.members, summary.opening + summary.joins - summary.leaves);
    assert.equal(summary.profit, summary.revenue - summary.expenses);
    assert.equal(summary.netGrowth, summary.joins - summary.leaves);
  }
  assert.deepEqual(data.summary(), data.summary('all'));
});

test('all-store rates use weighted totals and retain precision', () => {
  const summary = data.summary();
  assert.equal(summary.opening, 2100);
  assert.equal(summary.joins, 108);
  assert.equal(summary.leaves, 48);
  assert.equal(summary.churnPercent, 48 / 2100 * 100);
  assert.equal(summary.previousChurnPercent, 42 / 2100 * 100);
  assert.equal(summary.pending, 19);
  assert.equal(summary.followupsTotal, 68);
  assert.equal(summary.followupsCompleted, 49);
  assert.equal(summary.completionPercent, 49 / 68 * 100);
  assert.equal(summary.previousRevenue, 607000);
  assert.equal(summary.previousProfit, 128000);
  assert.equal(summary.revenueChangePercent, 18000 / 607000 * 100);
  assert.equal(summary.profitChangePercent, 3000 / 128000 * 100);
  assert.equal(data.summary('B').profitChangePercent, -10000 / 32000 * 100);
  assert.equal(data.summary('B').churnPercent, 3);
  assert.equal(data.summary('B').previousChurnPercent, 2);
});

test('monthly series closes in September and matches current and previous summaries', () => {
  for (const storeId of ['A', 'B', 'C', 'all']) {
    const series = data.monthlySeries(storeId);
    const summary = data.summary(storeId);
    assert.deepEqual(series.map(month => month.label), ['4月', '5月', '6月', '7月', '8月', '9月']);
    assert.equal(series[5].revenue, summary.revenue);
    assert.equal(series[5].profit, summary.profit);
    assert.equal(series[4].revenue, summary.previousRevenue);
    assert.equal(series[4].profit, summary.previousProfit);
  }
});

test('every all-store month is the sum of the three stores', () => {
  const series = data.monthlySeries();
  const storeSeries = data.stores.map(store => data.monthlySeries(store.id));
  assert.deepEqual(series.map(month => month.revenue), [555000, 568000, 584000, 598000, 607000, 625000]);
  assert.deepEqual(series.map(month => month.profit), [104000, 110000, 117000, 123000, 128000, 131000]);
  series.forEach((month, index) => {
    assert.equal(month.revenue, storeSeries.reduce((sum, store) => sum + store[index].revenue, 0));
    assert.equal(month.profit, storeSeries.reduce((sum, store) => sum + store[index].profit, 0));
  });
});

test('invalid store IDs reject explicitly instead of displaying unrelated totals', () => {
  for (const storeId of ['D', '', 'a', null, 0, {}, '__proto__']) {
    assert.throws(() => data.summary(storeId), RangeError);
    assert.throws(() => data.monthlySeries(storeId), RangeError);
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
  assert.equal(context.window.FHRData.stores.length, 3);
  assert.equal(context.window.FHRData.monthlySeries().length, 6);
});

test('public data and returned results cannot accidentally alter future calculations', () => {
  assert.throws(() => { data.stores[0].revenue = 1; }, TypeError);
  assert.throws(() => { data.stores.push({ id: 'D' }); }, TypeError);
  const summary = data.summary();
  summary.revenue = 1;
  const series = data.monthlySeries();
  series[0].revenue = 1;
  assert.equal(data.summary().revenue, 625000);
  assert.equal(data.monthlySeries()[0].revenue, 555000);
});
