import { TimezoneConfig } from './types';

export const TIMEZONES: TimezoneConfig[] = [
  { label: 'Local', value: 'LOCAL' },
  { label: 'New York (NYSE)', value: 'America/New_York' },
  { label: 'London (LSE)', value: 'Europe/London' },
  { label: 'Tokyo (TSE)', value: 'Asia/Tokyo' },
  { label: 'UTC', value: 'UTC' },
];

export const DEFAULT_INDICATORS = {
  sma: false,
  ema: false,
  rsi: false,
  macd: false,
  bollinger: false,
  volume: false,
};

export const AVAILABLE_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'META', name: 'Meta Platforms' },
  { ticker: 'NFLX', name: 'Netflix Inc.' },
];