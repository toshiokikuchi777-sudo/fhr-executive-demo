(function (root, factory) {
  'use strict';
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.FHRData = data;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';

  // 3店舗は説明モデルであり、実店舗名・実績ではありません。2026年9月の架空確定値。
  // 円換算は全期間共通の説明用固定レートで、実勢為替ではありません。
  const countries = Object.freeze([
    Object.freeze({ id: 'JP', name: '日本', currency: 'JPY', rateToJPY: 1 }),
    Object.freeze({ id: 'MY', name: 'マレーシア', currency: 'MYR', rateToJPY: 30 })
  ]);
  const stores = Object.freeze([
    Object.freeze({
      id: 'A', name: '国内AFモデル', country: 'JP', currency: 'JPY', region: '日本',
      brand: 'ANYTIME FITNESS', operator: '株式会社ラ・ヴィーチェ',
      opening: 800, joins: 44, leaves: 16, revenue: 7200000, expenses: 5430000,
      previousRevenue: 6840000, previousExpenses: 5310000,
      previousOpening: 800, previousLeaves: 16,
      pending: 4, followupsTotal: 20, followupsCompleted: 16, manager: '国内AF店舗 責任者'
    }),
    Object.freeze({
      id: 'B', name: 'マレーシアAFモデル', country: 'MY', currency: 'MYR', region: 'マレーシア',
      brand: 'ANYTIME FITNESS', operator: 'FHR ALLIANCE SDN BHD.',
      opening: 600, joins: 26, leaves: 18, revenue: 175000, expenses: 153000,
      previousRevenue: 181000, previousExpenses: 149000,
      previousOpening: 600, previousLeaves: 12,
      pending: 12, followupsTotal: 30, followupsCompleted: 18, manager: 'マレーシア店舗 責任者'
    }),
    Object.freeze({
      id: 'C', name: 'VISPO24モデル', country: 'JP', currency: 'JPY', region: '日本',
      brand: 'VISPO24', operator: '株式会社ラ・ヴィーチェ',
      opening: 700, joins: 38, leaves: 14, revenue: 6300000, expenses: 4800000,
      previousRevenue: 5940000, previousExpenses: 4590000,
      previousOpening: 700, previousLeaves: 14,
      pending: 3, followupsTotal: 18, followupsCompleted: 15, manager: 'VISPO24店舗 責任者'
    })
  ]);

  const history = {
    A: { revenue: [6330000, 6480000, 6630000, 6720000, 6840000, 7200000], profit: [1230000, 1290000, 1350000, 1410000, 1530000, 1770000] },
    B: { revenue: [163000, 167000, 173000, 179000, 181000, 175000], profit: [27000, 28000, 31000, 33000, 32000, 22000] },
    C: { revenue: [5430000, 5550000, 5700000, 5850000, 5940000, 6300000], profit: [1080000, 1170000, 1230000, 1290000, 1350000, 1500000] }
  };
  const labels = ['4月', '5月', '6月', '7月', '8月', '9月'];

  function selectedStores(scope) {
    if (scope === 'all') return stores;
    const store = stores.find(function (item) { return item.id === scope; });
    if (store) return [store];
    if (countries.some(function (country) { return country.id === scope; })) {
      return stores.filter(function (item) { return item.country === scope; });
    }
    throw new RangeError('Unknown store or country scope: ' + String(scope));
  }

  function reportCurrency(scope, selected, currency) {
    if (currency === 'JPY') return 'JPY';
    if (currency !== 'local') throw new RangeError('Currency must be JPY or local.');
    if (scope === 'all' || new Set(selected.map(function (store) { return store.country; })).size !== 1) {
      throw new RangeError('Local currency requires a single store or country scope.');
    }
    return selected[0].currency;
  }

  function convert(store, amount, currency) {
    if (currency === 'local') return amount;
    const country = countries.find(function (item) { return item.id === store.country; });
    return amount * country.rateToJPY;
  }

  function summary(scope = 'all', currency = 'JPY') {
    const selected = selectedStores(scope);
    const actualCurrency = reportCurrency(scope, selected, currency);
    function sum(key) {
      return selected.reduce(function (total, store) { return total + store[key]; }, 0);
    }
    function sumMoney(key) {
      return selected.reduce(function (total, store) { return total + convert(store, store[key], currency); }, 0);
    }
    const opening = sum('opening');
    const joins = sum('joins');
    const leaves = sum('leaves');
    const revenue = sumMoney('revenue');
    const expenses = sumMoney('expenses');
    const profit = revenue - expenses;
    const previousRevenue = sumMoney('previousRevenue');
    const previousProfit = previousRevenue - sumMoney('previousExpenses');
    const followupsTotal = sum('followupsTotal');
    const followupsCompleted = sum('followupsCompleted');

    return {
      currency: actualCurrency,
      storeCount: selected.length,
      countryCount: new Set(selected.map(function (store) { return store.country; })).size,
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

  function monthlySeries(scope = 'all', currency = 'JPY') {
    const selected = selectedStores(scope);
    const actualCurrency = reportCurrency(scope, selected, currency);
    return labels.map(function (label, index) {
      return {
        label: label,
        currency: actualCurrency,
        revenue: selected.reduce(function (total, store) { return total + convert(store, history[store.id].revenue[index], currency); }, 0),
        profit: selected.reduce(function (total, store) { return total + convert(store, history[store.id].profit[index], currency); }, 0)
      };
    });
  }

  // マレーシアAFモデル（B）の月会費を使う MYR の試算。
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

  return Object.freeze({ countries: countries, stores: stores, summary: summary, monthlySeries: monthlySeries, simulate: simulate });
});
