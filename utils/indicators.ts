import { OHLCV } from '../types';

export const calculateSMA = (data: OHLCV[], period: number) => {
  return data.map((d, i) => {
    if (i < period - 1) return { ...d, sma: null };
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    return { ...d, sma: sum / period };
  });
};

export const calculateEMA = (data: OHLCV[], period: number) => {
  const k = 2 / (period + 1);
  let ema = data[0].close;
  return data.map((d, i) => {
    if (i === 0) return { ...d, ema: d.close };
    ema = d.close * k + ema * (1 - k);
    return { ...d, ema: i < period ? null : ema };
  });
};

export const calculateBollingerBands = (data: OHLCV[], period: number = 20, multiplier: number = 2) => {
  return data.map((d, i) => {
    if (i < period - 1) return { ...d, bbUpper: null, bbLower: null, bbMiddle: null };
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    const mean = sum / period;
    const variance = slice.reduce((acc, curr) => acc + Math.pow(curr.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
      ...d,
      bbMiddle: mean,
      bbUpper: mean + stdDev * multiplier,
      bbLower: mean - stdDev * multiplier,
    };
  });
};

export const calculateRSI = (data: OHLCV[], period: number = 14) => {
  let gains = 0;
  let losses = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  return data.map((d, i) => {
    if (i <= period) return { ...d, rsi: null };

    const diff = d.close - data[i - 1].close;
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    return { ...d, rsi };
  });
};

// Merge all indicators into the data array
export const augmentDataWithIndicators = (data: OHLCV[]) => {
  let augmented = [...data];
  // We apply these sequentially, modifying the array of objects (or rather creating new ones)
  // For simplicity in this demo, we assume the data is dense enough.
  
  // Need to chain these or do a single pass. For clarity, I'll convert back and forth or just merge properties.
  // Ideally, we'd do a single pass, but for code separation, let's just re-map.
  
  // Helpers return new arrays with property added.
  const withSMA = calculateSMA(augmented, 20); // SMA 20
  const withEMA = calculateEMA(augmented, 50); // EMA 50 for variety
  // Merge back
  augmented = augmented.map((d, i) => ({
      ...d,
      sma: withSMA[i].sma,
      ema: withEMA[i].ema
  }));

  const withBB = calculateBollingerBands(augmented, 20, 2);
  augmented = augmented.map((d, i) => ({
      ...d,
      bbUpper: withBB[i].bbUpper,
      bbLower: withBB[i].bbLower,
      bbMiddle: withBB[i].bbMiddle
  }));

  const withRSI = calculateRSI(augmented, 14);
  augmented = augmented.map((d, i) => ({
      ...d,
      rsi: withRSI[i].rsi
  }));

  return augmented;
}
