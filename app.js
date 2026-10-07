const DEFAULT_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'dogecoin',
  'ripple',
  'cardano',
  'tron',
  'avalanche'
];

const state = {
  coins: [],
  watchlist: JSON.parse(localStorage.getItem('pulsewatchlist') || '[]'),
  selectedCoin: 'bitcoin',
  portfolio: JSON.parse(
    localStorage.getItem('pulseportfolio') ||
      JSON.stringify({
        cash: 50000,
        holdings: {}
      })
  )
};

const elements = {
  statsGrid: document.getElementById('stats-grid'),
  marketTable: document.getElementById('market-table'),
  searchInput: document.getElementById('search-input'),
  chartTitle: document.getElementById('chart-title'),
  chartPrice: document.getElementById('chart-price'),
  chartMetrics: document.getElementById('chart-metrics'),
  watchlist: document.getElementById('watchlist'),
  tradeCoin: document.getElementById('trade-coin'),
  tradeSide: document.getElementById('trade-side'),
  tradeQty: document.getElementById('trade-qty'),
  estimatedValue: document.getElementById('estimated-value'),
  cashBalance: document.getElementById('cash-balance'),
  holdingsValue: document.getElementById('holdings-value'),
  totalPortfolio: document.getElementById('total-portfolio'),
  holdingsList: document.getElementById('holdings-list'),
  tradeForm: document.getElementById('trade-form'),
  refreshBtn: document.getElementById('refresh-btn'),
  priceChart: document.getElementById('price-chart')
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);

const formatCompact = (value) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);

const setWatchlistStorage = () => {
  localStorage.setItem('pulsewatchlist', JSON.stringify(state.watchlist));
};

const setPortfolioStorage = () => {
  localStorage.setItem('pulseportfolio', JSON.stringify(state.portfolio));
};

const ensureDefaultWatchlist = () => {
  if (!state.watchlist.length) {
    state.watchlist = DEFAULT_COINS.slice(0, 4);
    setWatchlistStorage();
  }
};

const getSelectedCoinData = () =>
  state.coins.find((coin) => coin.id === state.selectedCoin) || state.coins[0];

const renderStats = () => {
  if (!state.coins.length) return;

  const totalMarketCap = state.coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  const totalVolume = state.coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
  const avgChange =
    state.coins.reduce((sum, coin) => sum + (coin.price_change_percentage_24h || 0), 0) /
    state.coins.length;

  const cards = [
    {
      label: 'Market cap',
      value: `$${formatCompact(totalMarketCap)}`,
      delta: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
      positive: avgChange >= 0
    },
    {
      label: '24h volume',
      value: `$${formatCompact(totalVolume)}`,
      delta: `${state.coins[0]?.price_change_percentage_24h >= 0 ? '+' : ''}${(state.coins[0]?.price_change_percentage_24h || 0).toFixed(2)}%`,
      positive: (state.coins[0]?.price_change_percentage_24h || 0) >= 0
    },
    {
      label: 'Signal mesh',
      value: '94.2%',
      delta: '+3.8%',
      positive: true
    },
    {
      label: 'Chip load',
      value: '68%',
      delta: 'Stable',
      positive: true
    }
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <div class="stat-card">
          <span class="small-label">${card.label}</span>
          <div class="stat-value">${card.value}</div>
          <span class="delta ${card.positive ? 'positive' : 'negative'}">${card.delta}</span>
        </div>
      `
    )
    .join('');
};

const renderMarketTable = () => {
  const searchQuery = elements.searchInput.value.trim().toLowerCase();
  const filteredCoins = state.coins.filter((coin) => {
    const match = `${coin.name} ${coin.symbol}`.toLowerCase();
    return match.includes(searchQuery);
  });

  elements.marketTable.innerHTML = filteredCoins
    .map(
      (coin) => `
        <tr>
          <td>
            <div class="coin-cell">
              <span class="coin-icon" style="background: linear-gradient(135deg, ${coin.color || '#5ef2d0'}, #4dd4ff);">${coin.symbol.slice(0, 1).toUpperCase()}</span>
              <div class="coin-name">
                <span>${coin.name}</span>
                <small>${coin.symbol.toUpperCase()}</small>
              </div>
            </div>
          </td>
          <td>${formatCurrency(coin.current_price)}</td>
          <td class="${coin.price_change_percentage_1h_in_currency >= 0 ? 'change-positive' : 'change-negative'}">
            ${coin.price_change_percentage_1h_in_currency?.toFixed(2) ?? '0.00'}%
          </td>
          <td class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
            ${coin.price_change_percentage_24h?.toFixed(2) ?? '0.00'}%
          </td>
          <td class="${coin.price_change_percentage_7d_in_currency >= 0 ? 'change-positive' : 'change-negative'}">
            ${coin.price_change_percentage_7d_in_currency?.toFixed(2) ?? '0.00'}%
          </td>
          <td>${formatCompact(coin.total_volume)}</td>
          <td>
            <button class="watch-btn ${state.watchlist.includes(coin.id) ? 'active' : ''}" data-id="${coin.id}">
              ${state.watchlist.includes(coin.id) ? 'Watching' : 'Watch'}
            </button>
          </td>
        </tr>
      `
    )
    .join('');

  elements.marketTable.querySelectorAll('.watch-btn').forEach((button) => {
    button.addEventListener('click', () => toggleWatchlist(button.dataset.id));
  });

  elements.marketTable.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', (event) => {
      const btn = event.target.closest('.watch-btn');
      if (!btn) {
        const coinId = event.currentTarget.querySelector('.watch-btn')?.dataset.id;
        if (coinId) {
          state.selectedCoin = coinId;
          renderTradeOptions();
          renderChart();
        }
      }
    });
  });
};

const renderWatchlist = () => {
  if (!state.coins.length) return;

  const grouped = state.watchlist
    .map((id) => state.coins.find((coin) => coin.id === id))
    .filter(Boolean);

  if (!grouped.length) {
    elements.watchlist.innerHTML = '<div class="empty-state">No assets in your watchlist yet.</div>';
    return;
  }

  elements.watchlist.innerHTML = grouped
    .map(
      (coin) => `
        <div class="watch-item" data-id="${coin.id}">
          <div class="left">
            <span class="coin-icon" style="background: linear-gradient(135deg, ${coin.color || '#5ef2d0'}, #4dd4ff);">${coin.symbol.slice(0, 1).toUpperCase()}</span>
            <div class="item-meta">
              <strong>${coin.name}</strong>
              <small>${coin.symbol.toUpperCase()}</small>
            </div>
          </div>
          <div class="item-meta">
            <strong>${formatCurrency(coin.current_price)}</strong>
            <small class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
              ${coin.price_change_percentage_24h?.toFixed(2) ?? '0.00'}%
            </small>
          </div>
        </div>
      `
    )
    .join('');

  elements.watchlist.querySelectorAll('.watch-item').forEach((item) => {
    item.addEventListener('click', () => {
      state.selectedCoin = item.dataset.id;
      renderTradeOptions();
      renderChart();
    });
  });
};

const renderTradeOptions = () => {
  const options = state.coins
    .map((coin) => `<option value="${coin.id}">${coin.name} (${coin.symbol.toUpperCase()})</option>`)
    .join('');

  elements.tradeCoin.innerHTML = options;
  elements.tradeCoin.value = state.selectedCoin;
};

const renderPortfolio = () => {
  const cash = Number(state.portfolio.cash || 0);
  const holdings = Object.entries(state.portfolio.holdings || {});

  const holdingsValue = holdings.reduce((sum, [id, qty]) => {
    const coin = state.coins.find((item) => item.id === id);
    return sum + (coin ? coin.current_price * Number(qty) : 0);
  }, 0);

  const total = cash + holdingsValue;

  elements.cashBalance.textContent = formatCurrency(cash);
  elements.holdingsValue.textContent = formatCurrency(holdingsValue);
  elements.totalPortfolio.textContent = formatCurrency(total);

  if (!holdings.length) {
    elements.holdingsList.innerHTML = '<div class="empty-state">No open positions yet. Build your next move.</div>';
    return;
  }

  elements.holdingsList.innerHTML = holdings
    .map(([id, qty]) => {
      const coin = state.coins.find((item) => item.id === id);
      if (!coin) return '';
      const value = coin.current_price * Number(qty);
      return `
        <div class="holding-item">
          <div class="left">
            <span class="coin-icon" style="background: linear-gradient(135deg, ${coin.color || '#5ef2d0'}, #4dd4ff);">${coin.symbol.slice(0, 1).toUpperCase()}</span>
            <div class="item-meta">
              <strong>${coin.name}</strong>
              <small>${Number(qty).toFixed(4)} ${coin.symbol.toUpperCase()}</small>
            </div>
          </div>
          <div class="item-meta">
            <strong>${formatCurrency(value)}</strong>
            <small>${formatCurrency(coin.current_price)}/coin</small>
          </div>
        </div>
      `;
    })
    .join('');
};

const updateEstimatedValue = () => {
  const coin = state.coins.find((item) => item.id === elements.tradeCoin.value) || state.coins[0];
  const qty = Number(elements.tradeQty.value || 0);
  if (!coin || qty <= 0) {
    elements.estimatedValue.textContent = '$0.00';
    return;
  }
  elements.estimatedValue.textContent = formatCurrency(coin.current_price * qty);
};

const renderChart = () => {
  const coin = getSelectedCoinData();
  if (!coin) return;

  const priceHistory = coin.sparkline_in_7d?.price || Array.from({ length: 24 }, (_, index) => 100 + index * 2.5);

  elements.chartTitle.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
  elements.chartPrice.textContent = formatCurrency(coin.current_price);

  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const stepX = 420 / (priceHistory.length - 1 || 1);

  const canvas = elements.priceChart;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.beginPath();
  priceHistory.forEach((point, index) => {
    const x = index * stepX;
    const y = height - ((point - minPrice) / (maxPrice - minPrice || 1)) * (height - 20) - 10;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#5ef2d0';
  ctx.lineWidth = 3;
  ctx.stroke();

  const lastPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];
  const delta = ((lastPrice - firstPrice) / firstPrice) * 100;

  elements.chartMetrics.innerHTML = `
    <div class="metric-box">
      <span>Market cap</span>
      <strong>${formatCompact(coin.market_cap)}</strong>
    </div>
    <div class="metric-box">
      <span>24h change</span>
      <strong class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
        ${coin.price_change_percentage_24h?.toFixed(2) ?? '0.00'}%
      </strong>
    </div>
    <div class="metric-box">
      <span>7d move</span>
      <strong class="${delta >= 0 ? 'change-positive' : 'change-negative'}">${delta.toFixed(2)}%</strong>
    </div>
  `;
};

const toggleWatchlist = (coinId) => {
  if (state.watchlist.includes(coinId)) {
    state.watchlist = state.watchlist.filter((id) => id !== coinId);
  } else {
    state.watchlist = [...state.watchlist, coinId];
  }
  setWatchlistStorage();
  renderMarketTable();
  renderWatchlist();
};

const handleTradeSubmit = (event) => {
  event.preventDefault();
  const coin = state.coins.find((item) => item.id === elements.tradeCoin.value);
  const qty = Number(elements.tradeQty.value || 0);

  if (!coin || qty <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }

  const orderValue = coin.current_price * qty;
  const side = elements.tradeSide.value;

  if (side === 'buy') {
    if (orderValue > state.portfolio.cash) {
      alert('Insufficient cash to complete this trade.');
      return;
    }
    state.portfolio.cash -= orderValue;
    state.portfolio.holdings[coin.id] = (state.portfolio.holdings[coin.id] || 0) + qty;
  } else {
    const currentHolding = state.portfolio.holdings[coin.id] || 0;
    if (currentHolding < qty) {
      alert('You do not own enough of this asset to sell.');
      return;
    }
    state.portfolio.cash += orderValue;
    state.portfolio.holdings[coin.id] = currentHolding - qty;
    if (state.portfolio.holdings[coin.id] <= 0) {
      delete state.portfolio.holdings[coin.id];
    }
  }

  setPortfolioStorage();
  renderPortfolio();
  alert(`${side.toUpperCase()} order placed for ${qty} ${coin.symbol.toUpperCase()}.`);
};

const loadMarketData = async () => {
  try {
    const ids = DEFAULT_COINS.join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d&per_page=50&page=1`
    );

    if (!response.ok) throw new Error('Failed to load market data');

    const data = await response.json();
    state.coins = data.map((coin) => ({
      ...coin,
      color: coin.symbol === 'btc' ? '#f8d76a' : coin.symbol === 'eth' ? '#8b5cf6' : '#4dd4ff'
    }));

    if (!state.selectedCoin && state.coins.length) {
      state.selectedCoin = state.coins[0].id;
    }

    ensureDefaultWatchlist();
    renderStats();
    renderMarketTable();
    renderWatchlist();
    renderTradeOptions();
    renderPortfolio();
    renderChart();
  } catch (error) {
    console.error(error);
    state.coins = [
      {
        id: 'bitcoin',
        name: 'Bitcoin',
        symbol: 'btc',
        current_price: 62000,
        price_change_percentage_1h_in_currency: 1.21,
        price_change_percentage_24h: 2.81,
        price_change_percentage_7d_in_currency: 8.52,
        total_volume: 43650000000,
        market_cap: 1220000000000,
        sparkline_in_7d: { price: [54000, 56000, 56500, 57000, 58000, 59200, 61000] },
        color: '#f8d76a'
      }
    ];
    ensureDefaultWatchlist();
    renderStats();
    renderMarketTable();
    renderWatchlist();
    renderTradeOptions();
    renderPortfolio();
    renderChart();
  }
};

elements.searchInput.addEventListener('input', renderMarketTable);
elements.tradeCoin.addEventListener('change', () => {
  state.selectedCoin = elements.tradeCoin.value;
  renderChart();
  updateEstimatedValue();
});
elements.tradeSide.addEventListener('change', updateEstimatedValue);
elements.tradeQty.addEventListener('input', updateEstimatedValue);
elements.tradeForm.addEventListener('submit', handleTradeSubmit);
elements.refreshBtn.addEventListener('click', loadMarketData);

setInterval(() => {
  loadMarketData();
}, 60000);

ensureDefaultWatchlist();
loadMarketData();
