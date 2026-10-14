(function (root, factory) {
  'use strict';
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.FHRData = data;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  // 架空のモデル店舗。金額は MYR、集計対象は2026年9月の確定値。
  const stores = Object.freeze([
    Object.freeze({
      id: 'A', name: '店舗A', region: 'モデル店舗',
      opening: 800, joins: 44, leaves: 16, revenue: 240000, expenses: 181000,
      previousRevenue: 228000, previousExpenses: 177000,
      previousOpening: 800, previousLeaves: 16,
      pending: 4, followupsTotal: 20, followupsCompleted: 16, manager: '店舗A 責任者'
    }),
    Object.freeze({
      id: 'B', name: '店舗B', region: 'モデル店舗',
      opening: 600, joins: 26, leaves: 18, revenue: 175000, expenses: 153000,
      previousRevenue: 181000, previousExpenses: 149000,
      previousOpening: 600, previousLeaves: 12,
      pending: 12, followupsTotal: 30, followupsCompleted: 18, manager: '店舗B 責任者'
    }),
    Object.freeze({
      id: 'C', name: '店舗C', region: 'モデル店舗',
      opening: 700, joins: 38, leaves: 14, revenue: 210000, expenses: 160000,
      previousRevenue: 198000, previousExpenses: 153000,
      previousOpening: 700, previousLeaves: 14,
      pending: 3, followupsTotal: 18, followupsCompleted: 15, manager: '店舗C 責任者'
    })
  ]);

  const history = {
    A: { revenue: [211000, 216000, 221000, 224000, 228000, 240000], profit: [41000, 43000, 45000, 47000, 51000, 59000] },
    B: { revenue: [163000, 167000, 173000, 179000, 181000, 175000], profit: [27000, 28000, 31000, 33000, 32000, 22000] },
    C: { revenue: [181000, 185000, 190000, 195000, 198000, 210000], profit: [36000, 39000, 41000, 43000, 45000, 50000] }
  };
  const labels = ['4月', '5月', '6月', '7月', '8月', '9月'];

  function selectedStores(storeId) {
    if (storeId === 'all') return stores;
    const store = stores.find(function (item) { return item.id === storeId; });
    if (!store) throw new RangeError('Unknown store ID: ' + String(storeId));
    return [store];
  }

  function summary(storeId = 'all') {
    const selected = selectedStores(storeId);
    function sum(key) {
      return selected.reduce(function (total, store) { return total + store[key]; }, 0);
    }
    const opening = sum('opening');
    const joins = sum('joins');
    const leaves = sum('leaves');
    const revenue = sum('revenue');
    const expenses = sum('expenses');
    const profit = revenue - expenses;
    const previousRevenue = sum('previousRevenue');
    const previousProfit = previousRevenue - sum('previousExpenses');
    const followupsTotal = sum('followupsTotal');
    const followupsCompleted = sum('followupsCompleted');

    return {
      opening: opening,
      joins: joins,
      leaves: leaves,
      members: opening + joins - leaves,
      revenue: revenue,
      expenses: expenses,
      profit: profit,
      previousRevenue: previousRevenue,
      previousProfit: previousProfit,
      churnPercent: leaves / opening * 100,
      previousChurnPercent: sum('previousLeaves') / sum('previousOpening') * 100,
      pending: sum('pending'),
      followupsTotal: followupsTotal,
      followupsCompleted: followupsCompleted,
      completionPercent: followupsCompleted / followupsTotal * 100,
      netGrowth: joins - leaves,
      revenueChangePercent: (revenue - previousRevenue) / previousRevenue * 100,
      profitChangePercent: (profit - previousProfit) / previousProfit * 100
    };
  }

  function monthlySeries(storeId = 'all') {
    const selected = selectedStores(storeId);
    return labels.map(function (label, index) {
      return {
        label: label,
        revenue: selected.reduce(function (total, store) { return total + history[store.id].revenue[index]; }, 0),
        profit: selected.reduce(function (total, store) { return total + history[store.id].profit[index]; }, 0)
      };
    });
  }

  function simulate(people, fee) {
    if (!Number.isFinite(people) || !Number.isFinite(fee)) {
      throw new TypeError('People and fee must be finite numbers.');
    }
    if (!Number.isInteger(people) || people < 0 || people > 30) {
      throw new RangeError('People must be an integer from 0 to 30.');
    }
    if (fee < 0 || fee > 1000) {
      throw new RangeError('Fee must be from 0 to 1000 MYR.');
    }
    return { people: people, fee: fee, monthlyRevenue: people * fee };
  }

  return Object.freeze({ stores: stores, summary: summary, monthlySeries: monthlySeries, simulate: simulate });
});
