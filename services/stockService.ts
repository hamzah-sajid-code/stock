import { OHLCV, StockData, TimeRange } from '../types';
import { augmentDataWithIndicators } from '../utils/indicators';

// --- Interfaces ---

interface DataProvider {
  name: string;
  getHistoricalData(ticker: string, range: TimeRange): Promise<StockData>;
  subscribe(ticker: string, onData: (data: Partial<StockData>) => void): () => void;
}

// --- Infinite-Retry Yahoo Provider with Aggressive Watchdog ---
// Strategy: 
// 1. Parallel Proxy Racing for speed.
// 2. Infinite Retry loops for persistence.
// 3. Watchdog Timer:
//    - 10s No Data -> Restart
//    - 4s Constant Price -> Restart (Aggressive Refresh)

class InfiniteYahooProvider implements DataProvider {
  name = 'Yahoo Finance (4s Watchdog)';
  
  private proxyGenerators = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    // Fallback strategy: Add random parameter to bypass some caches
  ];

  private subscribers: Record<string, ((data: Partial<StockData>) => void)[]> = {};
  
  // Polling State Management
  private activePollers: Record<string, boolean> = {};
  private pollTokens: Record<string, number> = {}; // Generation token to invalidate old loops
  
  // Watchdog Tracking
  private lastUpdate: Record<string, number> = {}; // Last time ANY data was received
  private lastPrice: Record<string, number> = {}; // Last recorded price
  private lastPriceChangeTime: Record<string, number> = {}; // Last time the price actually CHANGED
  
  private watchdogTimer: number;

  constructor() {
      // Start the global watchdog
      // Checks every 1 second
      this.watchdogTimer = window.setInterval(() => this.runWatchdog(), 1000);
  }

  // --- Watchdog Logic ---
  private runWatchdog() {
      const now = Date.now();
      const NO_DATA_THRESHOLD = 10000; // 10 seconds without data is considered dead
      const CONSTANT_PRICE_THRESHOLD = 4000; // 4 seconds of constant price triggers refresh

      for (const ticker in this.activePollers) {
          if (this.activePollers[ticker]) {
               // Check 1: Dead Connection (No data received at all)
               const lastMsg = this.lastUpdate[ticker] || 0;
               if (now - lastMsg > NO_DATA_THRESHOLD) {
                   this.restartTicker(ticker, "Dead Connection (10s)");
                   continue;
               }

               // Check 2: Stagnant Price (Price hasn't moved for 4s)
               // Only applies if we have a price to check
               if (this.lastPrice[ticker] !== undefined) {
                   const lastChange = this.lastPriceChangeTime[ticker] || now;
                   if (now - lastChange > CONSTANT_PRICE_THRESHOLD) {
                       this.restartTicker(ticker, "Stagnant Price (4s)");
                   }
               }
          }
      }
  }

  private restartTicker(ticker: string, reason: string) {
       console.warn(`[Watchdog] 🐕 ${reason} for ${ticker}. Force refreshing...`);
       
       // 1. Invalidate the old loop
       this.pollTokens[ticker] = (this.pollTokens[ticker] || 0) + 1;
       
       // 2. Reset timers to prevent immediate double-restart
       this.lastUpdate[ticker] = Date.now();
       this.lastPriceChangeTime[ticker] = Date.now(); 

       // 3. Start a new loop
       this.pollLoop(ticker, this.pollTokens[ticker]);
  }

  // --- Helpers ---

  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return res;
      } catch (err) {
          clearTimeout(id);
          throw err;
      }
  }

  // Promise.any manual implementation
  private async raceProxies(targetUrl: string, timeout: number): Promise<any> {
      const timestamp = Date.now();
      // Rotate query hosts to avoid DNS blocking
      const host = Math.random() > 0.5 ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
      const finalUrl = targetUrl.replace('query1.finance.yahoo.com', host) + `&_=${timestamp}`;

      const promises = this.proxyGenerators.map(async (gen) => {
          try {
              const url = gen(finalUrl);
              const res = await this.fetchWithTimeout(url, timeout);
              
              if (res.status === 404) throw new Error("NOT_FOUND");
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              
              const text = await res.text();
              try {
                  return JSON.parse(text);
              } catch (e) {
                  throw new Error("Invalid JSON");
              }
          } catch (e) {
              throw e;
          }
      });

      return new Promise((resolve, reject) => {
          let rejectedCount = 0;
          if (promises.length === 0) {
              return reject(new Error("No proxies defined"));
          }
          promises.forEach(p => {
              p.then(resolve).catch(() => {
                  rejectedCount++;
                  if (rejectedCount === promises.length) {
                      reject(new Error("All proxies failed"));
                  }
              });
          });
      });
  }

  // --- Historical Data ---
  
  async getHistoricalData(ticker: string, range: TimeRange): Promise<StockData> {
    const { interval, rangeParam } = this.mapRangeToYahoo(range);
    const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${rangeParam}&interval=${interval}&includePrePost=true&events=div%7Csplit`;
    
    // Infinite Retry Loop for Initial Load
    while (true) {
        try {
            const json = await this.raceProxies(baseUrl, 4000); // 4s timeout
            
            const result = json.chart?.result