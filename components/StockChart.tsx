import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { OHLCV, IndicatorConfig } from '../types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface StockChartProps {
  data: OHLCV[];
  indicators: IndicatorConfig;
  timezone: string;
  height: number;
  dense?: boolean;
  chartType: string;
}

export const StockChart: React.FC<StockChartProps> = ({ 
  data, 
  timezone,
  dense,
}) => {
  
  const isUp = useMemo(() => {
      if (data.length < 2) return true;
      return data[data.length - 1].close >= data[0].close;
  }, [data]);

  // Dynamic Color based on performance (Robinhood style)
  const mainColor = isUp ? '#00C805' : '#FF5000'; 
  const gradientId = isUp ? 'colorUp' : 'colorDown';

  const YDomain = useMemo(() => {
      if (data.length === 0) return ['auto', 'auto'];
      const min = Math.min(...data.map(d => d.close));
      const max = Math.max(...data.map(d => d.close));
      const buffer = (max - min) * 0.2; // Generous buffer for the "floating" look
      return [min - buffer, max + buffer];
  }, [data]);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
             <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#00C805" stopOpacity={0.2}/>
               <stop offset="95%" stopColor="#00C805" stopOpacity={0}/>
             </linearGradient>
             <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#FF5000" stopOpacity={0.2}/>
               <stop offset="95%" stopColor="#FF5000" stopOpacity={0}/>
             </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="time" 
            hide
          />
          
          <YAxis 
            domain={YDomain} 
            orientation="right" 
            hide
          />
          
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(27, 27, 29, 0.9)', 
                border: 'none', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: '#fff'
            }}
            itemStyle={{ color: '#fff', fontWeight: 600 }}
            labelStyle={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}
            cursor={{ stroke: '#888', strokeWidth: 1, strokeDasharray: '4 4' }}
            labelFormatter={(label) => {
                try {
                    const date = timezone === 'LOCAL' ? new Date(label) : toZonedTime(label, timezone === 'UTC' ? 'UTC' : timezone);
                    return format(date, 'MMM dd, HH:mm');
                } catch { return ''; }
            }}
            formatter={(value: any) => [value.toFixed(2), 'Price']}
          />

          <Area 
            type="monotone" 
            dataKey="close" 
            stroke={mainColor} 
            fill={`url(#${gradientId})`} 
            strokeWidth={3} 
            isAnimationActive={false}
          />

        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};