# PulseTrade

PulseTrade is a simple crypto trader dashboard designed for monitoring market activity, watching favorite coins, and simulating buy/sell trades.

## Features

- Live market overview for major coins
- Searchable top market table
- Interactive chart for the selected asset
- Watchlist tracking
- Portfolio with cash and holdings
- Buy/sell simulation form
- Local storage persistence for watchlist and portfolio

## Tech stack

- HTML
- CSS
- JavaScript
- CoinGecko public API

## Run locally

1. Open a terminal in this folder.
2. Start a simple web server:

```bash
python3 -m http.server 8000
```

3. Visit:

```text
http://localhost:8000
```

## Notes

This app uses the public CoinGecko API, which may rate-limit requests depending on usage. The app also includes a fallback sample dataset if the API is unavailable.

## Repository

This project is ready to be pushed to your GitHub repository and can be hosted on GitHub Pages with minimal changes.
