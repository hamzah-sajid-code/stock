import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TimezoneSelector } from './components/TimezoneSelector';
import { StockPanelConfig, LayoutConfig } from './types';
import { DEFAULT_INDICATORS } from './constants';
import { Plus, LayoutGrid, Monitor, Grid, Sun, Moon, Zap, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { DataSourceModal } from './components/DataSourceModal';

function App() {
  // --- State ---
  const [darkMode, setDarkMode] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const [panels, setPanels] = useState<StockPanelConfig[]>([
    { id: '1', ticker: 'AAPL', range: '1D', indicators: DEFAULT_INDICATORS, chartType: 'AREA' },
    { id: '2', ticker: 'TSLA', range: '1D', indicators: DEFAULT_INDICATORS, chartType: 'AREA' },
    { id: '3', ticker: 'NVDA', range: '1D', indicators: DEFAULT_INDICATORS, chartType: 'AREA' },
  ]);
  
  const [layout, setLayout] = useState<LayoutConfig>({
      columns: 3,
      dense: false,
      fullscreenPanelId: null
  });

  const [timezone, setTimezone] = useState<string>('LOCAL');
  const [addTicker, setAddTicker] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Handlers ---
  const addPanel = () => {
    if (!addTicker.trim()) return;
    const newPanel: StockPanelConfig = {
      id: Date.now().toString(),
      ticker: addTicker.toUpperCase(),
      range: '1D',
      indicators: DEFAULT_INDICATORS,
      chartType: 'AREA' 
    };
    setPanels([...panels, newPanel]);
    setAddTicker('');
  };

  const toggleDense = () => {
    setLayout(prev => ({ ...prev, dense: !prev.dense }));
  };

  const changeColumns = (cols: number) => {
    setLayout(prev => ({ ...prev, columns: cols }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors">
      <DataSourceModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
      
      {/* Navbar */}
      <header className="bg-white dark:bg-dark-panel border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold tracking-tight text-yahoo-purple dark:text-purple-400">
                TradeView<span className="text-gray-600 dark:text-gray-300 font-light">Pro</span>
            </h1>
            
            {/* Quick Layout Controls */}
            <div className="hidden md:flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                <button onClick={() => changeColumns(1)} className={clsx("p-1.5 rounded", layout.columns === 1 ? "bg-white dark:bg-gray-700 shadow" : "text-gray-500 hover:text-gray-700")}>
                    <Monitor size={16} />
                </button>
                <button onClick={() => changeColumns(2)} className={clsx("p-1.5 rounded", layout.columns === 2 ? "bg-white dark:bg-gray-700 shadow" : "text-gray-500 hover:text-gray-700")}>
                    <LayoutGrid size={16} />
                </button>
                <button onClick={() => changeColumns(3)} className={clsx("p-1.5 rounded", layout.columns === 3 ? "bg-white dark:bg-gray-700 shadow" : "text-gray-500 hover:text-gray-700")}>
                    <Grid size={16} />
                </button>
                <button onClick={() => changeColumns(4)} className={clsx("p-1.5 rounded", layout.columns === 4 ? "bg-white dark:bg-gray-700 shadow" : "text-gray-500 hover:text-gray-700")}>
                    <span className="text-xs font-bold px-1">4</span>
                </button>
            </div>

            <button 
               onClick={toggleDense}
               className={clsx("text-xs font-medium px-3 py-1.5 rounded-full border", layout.dense ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300" : "border-gray-300 dark:border-gray-600")}
            >
                {layout.dense ? 'Dense View' : 'Normal View'}
            </button>
        </div>

        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <input 
                   type="text"
                   value={addTicker}
                   onChange={(e) => setAddTicker(e.target.value.toUpperCase())}
                   onKeyDown={(e) => { if (e.key === 'Enter') addPanel(); }}
                   placeholder="SYMBOL"
                   className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 w-24 uppercase font-bold text-center placeholder-gray-400"
                />
                <button 
                  onClick={addPanel}
                  className="flex items-center space-x-1 bg-yahoo-purple hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add</span>
                </button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
            
            <TimezoneSelector currentTimezone={timezone} onChange={setTimezone} />
            
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
          {/* Market Status Banner */}
          <div className="bg-gray-200 dark:bg-[#202022] px-4 py-1 flex items-center justify-center space-x-4 text-xs font-mono text-gray-600 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
              <span className="flex items-center text-green-600 dark:text-green-500 font-bold">
                <Zap size={12} className="mr-1 fill-current" /> 
                HYPER-SPEED
              </span>
              <span className="hidden sm:inline"> | Strategy: Multi-Proxy Racing (All-Origins, CorsProxy, CodeTabs)</span>
              <span className="opacity-50">|</span>
              <span className="hidden sm:inline"> Poll: 1000ms</span>
              <button 
                onClick={() => setShowDocs(true)}
                className="flex items-center space-x-1 ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
              >
                 <Info size={12} />
                 <span>Data Specs</span>
              </button>
          </div>

          <Dashboard 
             panels={panels} 
             layout={layout} 
             timezone={timezone} 
             onUpdatePanels={setPanels}
             onUpdateLayout={setLayout}
          />
      </main>
    </div>
  );
}

export default App;