export interface OHLCV {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Provenance {
  source: string; // e.g., 'Finnhub', 'Yahoo Finance'
  endpoint?: string;
  timestamp: number;
  requestId?: string;
}

export interface StockData {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  data: OHLCV[];
  lastPrice: number;
  change: number;
  changePercent: number;
  marketState: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  provenance: Provenance;
}

export type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Max';

export interface IndicatorConfig {
  sma: boolean;
  ema: boolean;
  rsi: boolean;
  macd: boolean;
  bollinger: boolean;
  volume: boolean;
}

export interface StockPanelConfig {
  id: string;
  ticker: string;
  range: TimeRange;
  indicators: IndicatorConfig;
  chartType: 'CANDLE' | 'LINE' | 'AREA';
}

export interface LayoutConfig {
  columns: number; // 1, 2, 3, 4
  dense: boolean;
  fullscreenPanelId: string | null;
}

export interface TimezoneConfig {
  label: string;
  value: string; // IANA timezone string e.g., 'America/New_York'
}
