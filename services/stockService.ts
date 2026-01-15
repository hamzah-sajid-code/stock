import { OHLCV, StockData, TimeRange } from '../types';
import { augmentDataWithIndicators } from '../utils/indicators';

// --- Interfaces ---

interface DataProvider {
  name: string;
  getHistoricalData(ticker: string, range: TimeRange): Promise<StockData>;
  subscribe(ticker: string, onData: (data: Partial<StockData>) => void): () => void;
}

// --- Hyper-Aggressive Yahoo Provider ---
// "Thunderdome" Strategy: Race EVERY proxy against EVERY endpoint simultaneously.

class HyperYahooProvider implements DataProvider {
  name = 'Yahoo Finance (Hyper-Parallel)';
  
  private POLLING_INTERVAL = 1000; 

  // List of proxies to race
  // We will hit ALL of these at the same time for every update.
  private proxyGenerators = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  private chartBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  private quoteBaseUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
  
  private timers: Record<string, number> = {};
  private subscribers: Record<string, ((data: Partial<StockData>) => void)[]> = {};

  // --- Helpers ---

  // Hard timeout for any single request in the race
  private fetchWithTimeout(url: string, timeout: number): Promise<Response> {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      return fetch(url, { signal: controller.signal })
          .then(res => {
              clearTimeout(id);
              return res;
          })
          .catch(err => {
              clearTimeout(id);
              throw err;
          });
  }

  // Polyfill for Promise.any since it's not available in all TS targets
  private async promiseAny<T>(promises: Promise<T>[]): Promise<T> {
      return new Promise((resolve, reject) => {
          let errors: any[] = [];
          let pending = promises.length;
          if (pending === 0) {
              reject(new Error("No promises passed"));
              return;
          }
          promises.forEach((promise) => {
              Promise.resolve(promise).then(
                  (val) => resolve(val),
                  (err) => {
                      errors.push(err);
                      pending--;
                      if (pending === 0) {
                          reject(new Error("All promises rejected"));
                      }
                  }
              );
          });
      });
  }

  // --- Historical Data ---
  
  async getHistoricalData(ticker: string, range: TimeRange): Promise<StockData> {
    const { interval, rangeParam } = this.mapRangeToYahoo(range);
    const yahooUrl = `${this.chartBaseUrl}${ticker}?range=${rangeParam}&interval=${interval}&includePrePost=true&events=div%7Csplit&_=${Date.now()}`;

    // Race proxies
    const promises = this.proxyGenerators.map(async (gen) => {
        try {
            const res = await this.fetchWithTimeout(gen(yahooUrl), 5000);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const json = await res.json();
            return json;
        } catch (e) {
            throw e;
        }
    });

    try {
        const json = await this.promiseAny(promises);
        const result = json.chart?.result?.[0];

        if (!result) throw new Error('Invalid Data Structure');

        const meta = result.meta;
        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp;

        if (!timestamps || !quotes.close) throw new Error('No Data Available');

        const data: OHLCV[] = timestamps.map((t: number, i: number) => ({
            time: t * 1000,
            open: quotes.open[i] || null,
            high: quotes.high[i] || null,
            low: quotes.low[i] || null,
            close: quotes.close[i] || null,
            volume: quotes.volume[i] || 0
        })).filter((d: OHLCV) => d.close !== null && d.open !== null);

        const augmented = augmentDataWithIndicators(data);
        const last = augmented[augmented.length - 1];
        const prev = augmented.length > 1 ? augmented[augmented.length - 2] : last;

        return {
            ticker: meta.symbol,
            name: meta.symbol, 
            exchange: meta.exchangeName,
            currency: meta.currency,
            data: augmented,
            lastPrice: meta.regularMarketPrice || last.close,
            change: (meta.regularMarketPrice || last.close) - (meta.chartPreviousClose || prev.close),
            changePercent: 0, // Calculated in panel
            marketState: 'REGULAR',
            provenance: {
                source: 'Yahoo Finance API',
                endpoint: 'v8/finance/chart',
                timestamp: Date.now()
            }
        };
    } catch (e: any) {
        console.warn(`[StockService] Data load failed for ${ticker}.`);
        throw new Error(`Failed to load data for ${ticker}. The API might be rate-limited.`);
    }
  }

  // --- Live Polling ---

  subscribe(ticker: string, onData: (data: Partial<StockData>) => void): () => void {
    if (!this.subscribers[ticker]) {
        this.subscribers[ticker] = [];
    }
    this.subscribers[ticker].push(onData);

    const updateStrategy = async () => {
        try {
            const quote = await this.raceForPrice(ticker);
            if (quote && this.subscribers[ticker]) {
                this.subscribers[ticker].forEach(cb => cb(quote));
            }
        } catch (e) {
             // Silently fail if update fails, wait for next tick
        }
    };

    // Immediate initial fetch
    updateStrategy();

    if (!this.timers[ticker]) {
        this.timers[ticker] = window.setInterval(updateStrategy, this.POLLING_INTERVAL); 
    }

    return () => {
        if (this.subscribers[ticker]) {
            this.subscribers[ticker] = this.subscribers[ticker].filter(cb => cb !== onData);
        }
        if (this.subscribers[ticker].length === 0 && this.timers[ticker]) {
            clearInterval(this.timers[ticker]);
            delete this.timers[ticker];
        }
    };
  }

  // The "Thunderdome": Launch all proxies against both endpoints simultaneously.
  private async raceForPrice(ticker: string): Promise<Partial<StockData> | null> {
      const now = Date.now();
      const promises: Promise<Partial<StockData>>[] = [];

      // 1. Setup Quote API fetchers
      const fetchQuote = async (proxyGen: (u: string) => string) => {
          const target = `${this.quoteBaseUrl}?symbols=${ticker}&_=${now}`;
          const url = proxyGen(target);
          const res = await this.fetchWithTimeout(url, 2500); // 2.5s strict timeout
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const json = await res.json();
          const result = json.quoteResponse?.result?.[0];
          if (!result) throw new Error('No Quote Result');
          
          return {
              lastPrice: result.regularMarketPrice,
              change: result.regularMarketChange,
              changePercent: result.regularMarketChangePercent,
              marketState: result.marketState === 'REGULAR' ? 'REGULAR' : 'POST',
              provenance: { source: 'Yahoo Quote v7', timestamp: Date.now() }
          } as Partial<StockData>;
      };

      // 2. Setup Chart API fetchers (Backup/Redundancy)
      const fetchChart = async (proxyGen: (u: string) => string) => {
          const target = `${this.chartBaseUrl}${ticker}?range=1d&interval=1d&_=${now}`;
          const url = proxyGen(target);
          const res = await this.fetchWithTimeout(url, 2500);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const json = await res.json();
          const meta = json.chart?.result?.[0]?.meta;
          if (!meta) throw new Error('No Chart Meta');

          return {
              lastPrice: meta.regularMarketPrice,
              change: meta.regularMarketPrice - meta.chartPreviousClose,
              changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
              marketState: 'REGULAR',
              provenance: { source: 'Yahoo Chart v8', timestamp: Date.now() }
          } as Partial<StockData>;
      };

      // 3. Launch Requests
      this.proxyGenerators.forEach(gen => {
          promises.push(fetchQuote(gen));
          promises.push(fetchChart(gen));
      });

      try {
          // 4. Return the absolute fastest valid response
          return await this.promiseAny(promises);
      } catch (aggregateError) {
          // All requests failed
          return null;
      }
  }

  // --- Utils ---

  private mapRangeToYahoo(range: TimeRange): { interval: string, rangeParam: string } {
      switch(range) {
          case '1D': return { interval: '2m', rangeParam: '1d' };
          case '5D': return { interval: '15m', rangeParam: '5d' };
          case '1M': return { interval: '60m', rangeParam: '1mo' };
          case '6M': return { interval: '1d', rangeParam: '6mo' };
          case 'YTD': return { interval: '1d', rangeParam: 'ytd' };
          case '1Y': return { interval: '1d', rangeParam: '1y' };
          case '5Y': return { interval: '1wk', rangeParam: '5y' };
          case 'Max': return { interval: '1mo', rangeParam: 'max' };
          default: return { interval: '5m', rangeParam: '1d' };
      }
  }
}

export const StockService = new HyperYahooProvider();