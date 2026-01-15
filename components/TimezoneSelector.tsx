import React from 'react';
import { TIMEZONES } from '../constants';
import { TimezoneConfig } from '../types';

interface Props {
  currentTimezone: string;
  onChange: (tz: string) => void;
}

export const TimezoneSelector: React.FC<Props> = ({ currentTimezone, onChange }) => {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Timezone:</span>
      <select
        value={currentTimezone}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white dark:bg-dark-panel border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {TIMEZONES.map((tz: TimezoneConfig) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );
};
