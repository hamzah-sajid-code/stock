import React, { useEffect, useState } from 'react';
import { StockPanelConfig, StockData } from '../types';
import { StockService } from '../services/stockService';
import { StockChart } from './StockChart';
import { X, RefreshCw, Database } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { augmentDataWithIndicators } from '../utils/indicators';

interface Props {
  config: StockPanelConfig;
  timezone: string;
  isMaximized: boolean;
  onRemove: () => void;
  onMaximize: () => void;
  onUpdateConfig: (newConfig: Partial<StockPanelConfig>) => void;
  dense: boolean;
}

export const StockPanel: React.FC<Props> = ({
  config,
  timezone,
  isMaximized,
  onRemove,
  onMaximize,
  onUpdateConfig,
  dense,
}) => {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const stockData = await StockService.getHistoricalData(config.ticker, config.range);
        if (mounted) {
          setData(stockData);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          console.error(err);
          setError(err.message || "Data Unavailable");
          setLoading(false);
        }
      }
    };

    fetchData();

    const unsubscribe = StockService.subscribe(config.ticker, (newData) => {
       if (mounted && newData) {
           setData(prev => {
               if (!prev) return (newData as StockData);
               const updatedDetails = { ...prev, ...newData };
               
               // Update Chart Data (Live Candle Update)
               if (newData.lastPrice !== undefined && prev.data && prev.data.length > 0) {
                   const lastIndex = prev.data.length - 1;
                   const lastCandle = { ...prev.data[lastIndex] };
                   const price = newData.lastPrice;

                   lastCandle.close = price;
                   if (price > lastCandle.high) lastCandle.high = price;
                   if (price < lastCandle.low) lastCandle.low = price;
                   
                   const rawData = [...prev.data];
                   rawData[lastIndex] = lastCandle;
                   updatedDetails.data = augmentDataWithIndicators(rawData);
               }
               return updatedDetails;
           });
       }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [config.ticker, config.range]);

  if (loading) {
      return (
          <div className="flex items-center justify-center h-full bg-white dark:bg-dark-panel rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-dark-panel rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 text-red-500 p-4 text-center">
              <div className="text-lg font-bold mb-2">{config.ticker}</div>
              <div className="text-sm opacity-70 mb-4">{error}</div>
              <button onClick={onRemove} className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded hover:bg-gray-200">
                  Remove
              </button>
          </div>
      );
  }

  if (!data) return null;

  const isUp = data.change >= 0;
  const priceColor = isUp ? 'text-[#00C805]' : 'text-[#FF5000]'; // Robinhood-esque Green/Red

  return (
    <div className={clsx(
        "flex flex-col bg-white dark:bg-dark-panel rounded-2xl shadow-lg overflow-hidden border transition-all duration-300",
        isMaximized ? "fixed inset-4 z-50 shadow-2xl border-gray-300 dark:border-gray-600" : "h-full border-gray-200 dark:border-gray-800 hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-700"
    )}>
      
      {/* Clean Header with BIG Price */}
      <div className="flex justify-between items-start p-6 pb-2">
        <div className="flex flex-col">
            <div className="flex items-baseline space-x-3">
                <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white">{data.ticker}</h2>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{data.exchange}</span>
            </div>
            
            <div className="mt-1 flex items-baseline space-x-3">
                 <span className={clsx("text-6xl font-bold tracking-tighter tabular-nums", priceColor)}>
                    {data.lastPrice.toFixed(2)}
                 </span>
            </div>
            <div className={clsx("flex items-center text-lg font-medium mt-1", priceColor)}>
                 <span>{data.change > 0 ? '+' : ''}{data.change.toFixed(2)}</span>
                 <span className="ml-1">({data.changePercent.toFixed(2)}%)</span>
            </div>
        </div>

        {/* Minimal Controls */}
        <div className="flex flex-col items-end space-y-3">
             <button onClick={onRemove} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-1 transition-colors">
                <X size={24} />
             </button>

             {/* Minimal Pill Range Selector */}
             <div className="flex bg-gray-100 dark:bg-gray-800/50 rounded-lg p-1 space-x-1">
                {['1D', '1W', '1M', '1Y', 'All'].map((label, idx) => {
                    const mappedRange = label === '1W' ? '5D' : label === 'All' ? 'Max' : label;
                    const isActive = config.range === mappedRange;
                    return (
                        <button 
                            key={label}
                            onClick={() => onUpdateConfig({ range: mappedRange as any })}
                            className={clsx(
                                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                isActive 
                                  ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm" 
                                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            {label}
                        </button>
                    )
                })}
             </div>
        </div>
      </div>

      {/* Massive Chart Area */}
      <div className="flex-1 w-full min-h-0 relative -mt-4">
         <StockChart 
           data={data.data || []} 
           indicators={config.indicators} 
           timezone={timezone} 
           height={0} // Handled by flex-1 container
           chartType="AREA"
           dense={dense}
         />
      </div>
      
      {/* Footer Provenance (Very Subtle) */}
      <div className="px-6 py-3 flex justify-between items-center bg-transparent">
          <div className="flex items-center space-x-1 text-[10px] text-gray-300 dark:text-gray-600">
             <Database size={10} />
             <span>{data.provenance?.source || 'Yahoo Finance'}</span>
          </div>
          <button 
             onClick={onMaximize}
             className="text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-gray-500 dark:text-gray-600 transition-colors"
          >
             {isMaximized ? 'Minimize' : 'Expand'}
          </button>
      </div>
    </div>
  );
};