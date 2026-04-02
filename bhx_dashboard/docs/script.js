const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const compactMoneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  notation: 'compact',
  maximumFractionDigits: 1
});

const chartColors = {
  green: '#0a7a45',
  greenDark: '#04532f',
  greenSoft: '#90c89d',
  yellow: '#ffd439',
  yellowSoft: '#fff0a6',
  red: '#d45545',
  grid: 'rgba(4, 83, 47, 0.10)',
  axis: '#4f6558',
  font: '#153222'
};

function parseCSV(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
      error: reject
    });
  });
}

function safePct(num) {
  return `${(num * 100).toFixed(1)}%`;
}

function formatVnd(num) {
  return moneyFormatter.format(num);
}

function formatVndCompact(num) {
  return compactMoneyFormatter.format(num);
}

function groupBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

function uniqueValues(items, field) {
  return [...new Set(items.map((d) => d[field]))].filter(Boolean);
}

function rollingAverage(values, windowSize = 7) {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = values.slice(start, idx + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    return avg;
  });
}

const state = {
  monthly: [],
  daily: [],
  stores: [],
  filters: {
    region: 'All',
    format: 'All',
    store: 'All',
    startMonth: '',
    endMonth: ''
  }
};

async function init() {
  const [monthly, daily, stores] = await Promise.all([
    parseCSV('data/monthly_incentive_summary.csv'),
    parseCSV('data/daily_operations.csv'),
    parseCSV('data/store_master.csv')
  ]);

  state.monthly = monthly.sort((a, b) => a.Month.localeCompare(b.Month));
  state.daily = daily.sort((a, b) => a.Date.localeCompare(b.Date));
  state.stores = stores;

  setupFilters();
  bindEvents();
  render();
}

function setupFilters() {
  const months = uniqueValues(state.monthly, 'Month').sort();
  state.filters.startMonth = months[0];
  state.filters.endMonth = months[months.length - 1];

  populateSelect('regionFilter', ['All', ...uniqueValues(state.monthly, 'Region').sort()]);
  populateSelect('formatFilter', ['All', ...uniqueValues(state.monthly, 'Format').sort()]);
  populateSelect('storeFilter', ['All', ...uniqueValues(state.monthly, 'Store_Name').sort()]);
  populateSelect('startMonthFilter', months, state.filters.startMonth);
  populateSelect('endMonthFilter', months, state.filters.endMonth);
}

function populateSelect(id, values, selectedValue = 'All') {
  const select = document.getElementById(id);
  select.innerHTML = values
    .map((value) => `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${value}</option>`)
    .join('');
}

function bindEvents() {
  ['regionFilter', 'formatFilter', 'storeFilter', 'startMonthFilter', 'endMonthFilter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      state.filters.region = document.getElementById('regionFilter').value;
      state.filters.format = document.getElementById('formatFilter').value;
      state.filters.store = document.getElementById('storeFilter').value;
      state.filters.startMonth = document.getElementById('startMonthFilter').value;
      state.filters.endMonth = document.getElementById('endMonthFilter').value;

      if (state.filters.startMonth > state.filters.endMonth) {
        state.filters.endMonth = state.filters.startMonth;
        document.getElementById('endMonthFilter').value = state.filters.endMonth;
      }
      render();
    });
  });

  document.getElementById('resetFilters').addEventListener('click', () => {
    state.filters.region = 'All';
    state.filters.format = 'All';
    state.filters.store = 'All';
    const months = uniqueValues(state.monthly, 'Month').sort();
    state.filters.startMonth = months[0];
    state.filters.endMonth = months[months.length - 1];

    document.getElementById('regionFilter').value = 'All';
    document.getElementById('formatFilter').value = 'All';
    document.getElementById('storeFilter').value = 'All';
    document.getElementById('startMonthFilter').value = state.filters.startMonth;
    document.getElementById('endMonthFilter').value = state.filters.endMonth;
    render();
  });
}

function filterMonthly() {
  return state.monthly.filter((d) => {
    const regionMatch = state.filters.region === 'All' || d.Region === state.filters.region;
    const formatMatch = state.filters.format === 'All' || d.Format === state.filters.format;
    const storeMatch = state.filters.store === 'All' || d.Store_Name === state.filters.store;
    const monthMatch = d.Month >= state.filters.startMonth && d.Month <= state.filters.endMonth;
    return regionMatch && formatMatch && storeMatch && monthMatch;
  });
}

function filterDaily() {
  return state.daily.filter((d) => {
    const regionMatch = state.filters.region === 'All' || d.Region === state.filters.region;
    const formatMatch = state.filters.format === 'All' || d.Format === state.filters.format;
    const storeMatch = state.filters.store === 'All' || d.Store_Name === state.filters.store;
    const monthMatch = d.Month >= state.filters.startMonth && d.Month <= state.filters.endMonth;
    return regionMatch && formatMatch && storeMatch && monthMatch;
  });
}

function render() {
  const filteredMonthly = filterMonthly();
  const filteredDaily = filterDaily();

  document.getElementById('selectionSummary').textContent =
    `${filteredMonthly.length} store-months · ${filteredDaily.length} daily rows`;

  renderKPIs(filteredMonthly);
  renderRevenueTrend(filteredMonthly);
  renderPayoutByStore(filteredMonthly);
  renderScatter(filteredMonthly);
  renderHeatmap(filteredMonthly);
  renderDailyTrend(filteredDaily);
  renderInsights(filteredMonthly);
  renderRankingTable(filteredMonthly);
}

function renderKPIs(rows) {
  const revenueActual = rows.reduce((sum, d) => sum + d.Revenue_Actual_VND, 0);
  const revenueTarget = rows.reduce((sum, d) => sum + d.Revenue_Target_VND, 0);
  const shrinkageAmt = rows.reduce((sum, d) => sum + d.Shrinkage_Amt_VND, 0);
  const operatingCost = rows.reduce((sum, d) => sum + d.Operating_Cost_VND, 0);
  const laborHours = rows.reduce((sum, d) => sum + d.Labor_Hours, 0);
  const payout = rows.reduce((sum, d) => sum + d.Bonus_Payout_VND, 0);
  const eligibleCount = rows.filter((d) => d.Eligible_Flag === 'Y').length;

  const attainment = revenueTarget ? revenueActual / revenueTarget : 0;
  const shrinkageRate = revenueActual ? shrinkageAmt / revenueActual : 0;
  const costRate = revenueActual ? operatingCost / revenueActual : 0;
  const productivity = laborHours ? revenueActual / laborHours : 0;

  const cards = [
    {
      label: 'Actual revenue',
      value: formatVndCompact(revenueActual),
      subtext: `${formatVndCompact(revenueTarget)} target`
    },
    {
      label: 'Target attainment',
      value: safePct(attainment),
      subtext: 'Actual ÷ target'
    },
    {
      label: 'Shrinkage rate',
      value: safePct(shrinkageRate),
      subtext: `${formatVndCompact(shrinkageAmt)} loss`
    },
    {
      label: 'Operating cost rate',
      value: safePct(costRate),
      subtext: `${formatVndCompact(operatingCost)} cost`
    },
    {
      label: 'Bonus payout',
      value: formatVndCompact(payout),
      subtext: `${eligibleCount} eligible | ${formatVnd(productivity)}/hour`
    }
  ];

  document.getElementById('kpiGrid').innerHTML = cards.map((card) => `
    <article class="kpi-card">
      <div class="kpi-label">${card.label}</div>
      <div class="kpi-value">${card.value}</div>
      <div class="kpi-subtext">${card.subtext}</div>
    </article>
  `).join('');
}

function renderRevenueTrend(rows) {
  const grouped = [...groupBy(rows, (d) => d.Month).entries()].sort(([a], [b]) => a.localeCompare(b));
  const months = grouped.map(([month]) => month);
  const actual = grouped.map(([, values]) => values.reduce((sum, d) => sum + d.Revenue_Actual_VND, 0) / 1e9);
  const target = grouped.map(([, values]) => values.reduce((sum, d) => sum + d.Revenue_Target_VND, 0) / 1e9);

  Plotly.newPlot('revenueTrend', [
    {
      x: months,
      y: target,
      name: 'Target',
      type: 'scatter',
      mode: 'lines+markers',
      line: { width: 3, dash: 'dot', color: chartColors.yellow },
      marker: { size: 8, color: chartColors.yellow },
      hovertemplate: '<b>%{x}</b><br>Target: %{y:.2f} bn VND<extra></extra>'
    },
    {
      x: months,
      y: actual,
      name: 'Actual',
      type: 'scatter',
      mode: 'lines+markers',
      line: { width: 4, color: chartColors.green },
      marker: { size: 9, color: chartColors.green },
      hovertemplate: '<b>%{x}</b><br>Actual: %{y:.2f} bn VND<extra></extra>'
    }
  ], getBaseLayout({
    yaxis: { title: 'Billion VND' },
    xaxis: { tickangle: 0, automargin: true },
    legend: { orientation: 'h', y: 1.12, x: 0 }
  }), { responsive: true, displayModeBar: false });
}

function renderPayoutByStore(rows) {
  const grouped = [...groupBy(rows, (d) => d.Store_Name).entries()].map(([store, values]) => ({
    store,
    payout: values.reduce((sum, d) => sum + d.Bonus_Payout_VND, 0)
  })).sort((a, b) => b.payout - a.payout);

  Plotly.newPlot('payoutByStore', [{
    x: grouped.map((d) => d.payout / 1e6).reverse(),
    y: grouped.map((d) => d.store).reverse(),
    type: 'bar',
    orientation: 'h',
    marker: {
      color: grouped.map(() => chartColors.green).reverse(),
      line: { color: chartColors.greenDark, width: 0.5 }
    },
    hovertemplate: '%{y}<br>Payout: %{x:.1f} mn VND<extra></extra>'
  }], getBaseLayout({
    height: Math.max(340, grouped.length * 38),
    xaxis: { title: 'Million VND', automargin: true },
    yaxis: { automargin: true },
    margin: { l: 150, r: 20, t: 20, b: 52 }
  }), { responsive: true, displayModeBar: false });
}

function renderScatter(rows) {
  const eligible = rows.filter((d) => d.Eligible_Flag === 'Y');
  const notEligible = rows.filter((d) => d.Eligible_Flag !== 'Y');

  Plotly.newPlot('attainmentShrinkageScatter', [
    {
      x: eligible.map((d) => d.Target_Attainment_Pct * 100),
      y: eligible.map((d) => d.Shrinkage_Rate * 100),
      text: eligible.map((d) => `${d.Store_Name}<br>${d.Month}`),
      mode: 'markers',
      name: 'Eligible',
      marker: {
        size: eligible.map((d) => Math.max(10, d.Bonus_Payout_VND / 3000000)),
        opacity: 0.78,
        color: chartColors.green,
        line: { color: chartColors.greenDark, width: 1 }
      },
      hovertemplate: '%{text}<br>Attainment: %{x:.1f}%<br>Shrinkage: %{y:.2f}%<extra></extra>'
    },
    {
      x: notEligible.map((d) => d.Target_Attainment_Pct * 100),
      y: notEligible.map((d) => d.Shrinkage_Rate * 100),
      text: notEligible.map((d) => `${d.Store_Name}<br>${d.Month}<br>${d.Key_Reason}`),
      mode: 'markers',
      name: 'Not eligible',
      marker: {
        size: notEligible.map((d) => Math.max(10, d.Base_Bonus_Budget_VND / 3000000)),
        opacity: 0.75,
        color: chartColors.yellow,
        line: { color: chartColors.warning, width: 1 },
        symbol: 'diamond'
      },
      hovertemplate: '%{text}<br>Attainment: %{x:.1f}%<br>Shrinkage: %{y:.2f}%<extra></extra>'
    }
  ], getBaseLayout({
    xaxis: { title: 'Target attainment %', automargin: true },
    yaxis: { title: 'Shrinkage rate %', automargin: true },
    legend: { orientation: 'h', y: 1.12, x: 0 }
  }), { responsive: true, displayModeBar: false });
}

function renderHeatmap(rows) {
  const stores = uniqueValues(rows, 'Store_Name').sort();
  const months = uniqueValues(rows, 'Month').sort();
  const matrix = stores.map((store) => months.map((month) => {
    const row = rows.find((d) => d.Store_Name === store && d.Month === month);
    return row ? row.Bonus_Index : null;
  }));

  Plotly.newPlot('bonusHeatmap', [{
    z: matrix,
    x: months,
    y: stores,
    type: 'heatmap',
    colorscale: [
      [0, '#fff7c8'],
      [0.5, '#ffd439'],
      [1, '#0a7a45']
    ],
    hovertemplate: 'Store: %{y}<br>Month: %{x}<br>Bonus index: %{z:.2f}<extra></extra>'
  }], getBaseLayout({
    height: Math.max(320, stores.length * 36),
    xaxis: { automargin: true, tickangle: 0 },
    yaxis: { automargin: true },
    margin: { l: 150, r: 20, t: 20, b: 50 }
  }), { responsive: true, displayModeBar: false });
}

function renderDailyTrend(rows) {
  const grouped = [...groupBy(rows, (d) => d.Date).entries()].sort(([a], [b]) => a.localeCompare(b));
  const dates = grouped.map(([date]) => date);
  const actual = grouped.map(([, values]) => values.reduce((sum, d) => sum + d.Revenue_Actual_VND, 0) / 1e6);
  const rolling = rollingAverage(actual, 7);

  Plotly.newPlot('dailyTrend', [
    {
      x: dates,
      y: actual,
      type: 'bar',
      name: 'Daily actual',
      marker: { color: chartColors.yellowSoft, line: { color: chartColors.yellow, width: 0.4 } },
      hovertemplate: '<b>%{x}</b><br>%{y:.1f} mn VND<extra></extra>'
    },
    {
      x: dates,
      y: rolling,
      type: 'scatter',
      mode: 'lines',
      name: '7-day average',
      line: { width: 3, color: chartColors.green },
      hovertemplate: '<b>%{x}</b><br>7D avg: %{y:.1f} mn VND<extra></extra>'
    }
  ], getBaseLayout({
    xaxis: {
      title: 'Date',
      tickangle: -35,
      tickformat: '%d %b',
      nticks: 10,
      automargin: true
    },
    yaxis: { title: 'Million VND', automargin: true },
    bargap: 0.18,
    legend: { orientation: 'h', y: 1.12, x: 0 },
    hovermode: 'x unified'
  }), { responsive: true, displayModeBar: false });
}

function renderInsights(rows) {
  if (!rows.length) {
    document.getElementById('insightList').innerHTML = '<div class="insight-item"><p>No data available for the selected filters.</p></div>';
    return;
  }

  const topPayout = [...groupBy(rows, (d) => d.Store_Name).entries()]
    .map(([store, values]) => ({ store, payout: values.reduce((sum, d) => sum + d.Bonus_Payout_VND, 0) }))
    .sort((a, b) => b.payout - a.payout)[0];

  const highestAttainment = [...rows].sort((a, b) => b.Target_Attainment_Pct - a.Target_Attainment_Pct)[0];
  const worstShrinkage = [...rows].sort((a, b) => b.Shrinkage_Rate - a.Shrinkage_Rate)[0];
  const mostCommonFail = Object.entries(rows.filter((d) => d.Eligible_Flag !== 'Y').reduce((acc, d) => {
    acc[d.Key_Reason] = (acc[d.Key_Reason] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];

  const eligibleRate = rows.filter((d) => d.Eligible_Flag === 'Y').length / rows.length;

  const insights = [
    {
      title: 'Highest payout',
      text: `${topPayout.store} has the largest cumulative payout at ${formatVnd(topPayout.payout)}.`
    },
    {
      title: 'Best attainment',
      text: `${highestAttainment.Store_Name} in ${highestAttainment.Month} reached ${safePct(highestAttainment.Target_Attainment_Pct)}.`
    },
    {
      title: 'Main risk area',
      text: `${worstShrinkage.Store_Name} in ${worstShrinkage.Month} shows the highest shrinkage at ${safePct(worstShrinkage.Shrinkage_Rate)}.`
    },
    {
      title: 'Eligibility rate',
      text: `${safePct(eligibleRate)} of store-months passed all payout gates.${mostCommonFail ? ` Most common blocker: ${mostCommonFail[0]}.` : ''}`
    }
  ];

  document.getElementById('insightList').innerHTML = insights.map((item) => `
    <div class="insight-item">
      <h4>${item.title}</h4>
      <p>${item.text}</p>
    </div>
  `).join('');
}

function renderRankingTable(rows) {
  const grouped = [...groupBy(rows, (d) => d.Store_Name).entries()].map(([store, values]) => {
    const sample = values[0];
    const revenueActual = values.reduce((sum, d) => sum + d.Revenue_Actual_VND, 0);
    const revenueTarget = values.reduce((sum, d) => sum + d.Revenue_Target_VND, 0);
    const shrinkageAmt = values.reduce((sum, d) => sum + d.Shrinkage_Amt_VND, 0);
    const operatingCost = values.reduce((sum, d) => sum + d.Operating_Cost_VND, 0);
    const laborHours = values.reduce((sum, d) => sum + d.Labor_Hours, 0);
    const payout = values.reduce((sum, d) => sum + d.Bonus_Payout_VND, 0);
    const eligible = values.filter((d) => d.Eligible_Flag === 'Y').length;

    return {
      store,
      region: sample.Region,
      format: sample.Format,
      revenueActual,
      attainment: revenueTarget ? revenueActual / revenueTarget : 0,
      shrinkageRate: revenueActual ? shrinkageAmt / revenueActual : 0,
      costRate: revenueActual ? operatingCost / revenueActual : 0,
      productivity: laborHours ? revenueActual / laborHours : 0,
      payout,
      eligibilityLabel: eligible === values.length ? 'All passed' : eligible > 0 ? `${eligible}/${values.length} passed` : 'No pass'
    };
  }).sort((a, b) => b.payout - a.payout || b.attainment - a.attainment);

  document.getElementById('rankingTableBody').innerHTML = grouped.map((row, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${row.store}</td>
      <td>${row.region}</td>
      <td>${row.format}</td>
      <td>${formatVnd(row.revenueActual)}</td>
      <td>${safePct(row.attainment)}</td>
      <td>${safePct(row.shrinkageRate)}</td>
      <td>${safePct(row.costRate)}</td>
      <td>${formatVnd(row.productivity)}</td>
      <td>${formatVnd(row.payout)}</td>
      <td><span class="badge ${row.eligibilityLabel === 'No pass' ? 'bad' : 'good'}">${row.eligibilityLabel}</span></td>
    </tr>
  `).join('');
}

function getBaseLayout(extra = {}) {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: chartColors.font, family: 'Inter, sans-serif', size: 12 },
    margin: { l: 60, r: 24, t: 20, b: 50 },
    xaxis: {
      gridcolor: chartColors.grid,
      zerolinecolor: chartColors.grid,
      tickfont: { color: chartColors.axis, size: 11 },
      titlefont: { color: chartColors.axis, size: 12 },
      automargin: true
    },
    yaxis: {
      gridcolor: chartColors.grid,
      zerolinecolor: chartColors.grid,
      tickfont: { color: chartColors.axis, size: 11 },
      titlefont: { color: chartColors.axis, size: 12 },
      automargin: true
    },
    hoverlabel: {
      bgcolor: '#ffffff',
      bordercolor: 'rgba(10, 122, 69, 0.15)',
      font: { color: chartColors.font }
    },
    ...extra
  };
}

init().catch((error) => {
  console.error(error);
  document.getElementById('selectionSummary').textContent = 'Failed to load data';
});
