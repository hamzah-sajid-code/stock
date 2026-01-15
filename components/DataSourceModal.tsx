import React from 'react';
import { X, Server, Shield, Zap, Database, Activity } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourceModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-panel w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Database className="text-yahoo-purple" size={24} />
            Data Source Architecture
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-sm text-gray-600 dark:text-gray-300">
          
          {/* Section 1: Primary Source */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap size={20} className="text-yellow-500 fill-yellow-500" />
              1. Primary Source: Yahoo Finance
            </h3>
            <p className="mb-3 leading-relaxed">
              The application prioritizes realtime market data directly from Yahoo Finance's public API endpoints.
              It uses a dual-endpoint strategy to ensure the richest data set:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
                <strong className="block text-gray-900 dark:text-white mb-1">Quote API (v7)</strong>
                <span className="text-xs opacity-80">Used for ultra-low latency realtime price updates (Scraping method).</span>
              </li>
              <li className="bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-100 dark:border-gray-700">
                <strong className="block text-gray-900 dark:text-white mb-1">Chart API (v8)</strong>
                <span className="text-xs opacity-80">Used for historical OHLCV candles, volume data, and metadata.</span>
              </li>
            </ul>
          </section>

          {/* Section 2: Access Method */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Server size={20} className="text-blue-500" />
              2. Access Method: "Thunderdome" Racing
            </h3>
            <p className="mb-3 leading-relaxed">
              Direct browser calls to Yahoo Finance are blocked by CORS. To bypass this while maximizing speed, 
              the app employs a <strong>Hyper-Aggressive Parallel Execution</strong> strategy.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 text-xs uppercase tracking-wide">The Algorithm</h4>
              <ol className="list-decimal pl-4 space-y-2 text-blue-800 dark:text-blue-200">
                <li>Every <strong>1000ms</strong>, a tick cycle initiates.</li>
                <li>The app simultaneously launches <strong>6+ requests</strong>: targeting both APIs via multiple CORS proxies (AllOrigins, CorsProxy, CodeTabs).</li>
                <li>The <strong>first single request</strong> to return valid data determines the state.</li>
                <li>Slower or failed requests are immediately aborted to save resources.</li>
              </ol>
            </div>
          </section>

          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-center text-gray-500 dark:text-gray-400">
            <strong>Disclaimer:</strong> This application is a technical demonstration. 
            Data provided by public proxies is not guaranteed to be accurate. 
            Do not base financial decisions on this data.
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-yahoo-purple hover:bg-purple-700 text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
}