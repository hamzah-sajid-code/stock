import React, { useState } from 'react';
import { LayoutConfig, StockPanelConfig } from '../types';
import { StockPanel } from './StockPanel';
import { clsx } from 'clsx';
import { GripVertical } from 'lucide-react';

interface Props {
  panels: StockPanelConfig[];
  layout: LayoutConfig;
  timezone: string;
  onUpdatePanels: (panels: StockPanelConfig[]) => void;
  onUpdateLayout: (layout: LayoutConfig) => void;
}

export const Dashboard: React.FC<Props> = ({
  panels,
  layout,
  timezone,
  onUpdatePanels,
  onUpdateLayout
}) => {
  // Simple Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;
    
    // Simple reorder
    const fromIndex = panels.findIndex(p => p.id === draggedId);
    const toIndex = panels.findIndex(p => p.id === id);
    
    if (fromIndex < 0 || toIndex < 0) return;

    const newPanels = [...panels];
    const [moved] = newPanels.splice(fromIndex, 1);
    newPanels.splice(toIndex, 0, moved);
    onUpdatePanels(newPanels);
  };

  const handleMaximize = (id: string) => {
      onUpdateLayout({
          ...layout,
          fullscreenPanelId: layout.fullscreenPanelId === id ? null : id
      });
  };

  const removePanel = (id: string) => {
      onUpdatePanels(panels.filter(p => p.id !== id));
      if (layout.fullscreenPanelId === id) {
          onUpdateLayout({ ...layout, fullscreenPanelId: null });
      }
  };

  const updatePanelConfig = (id: string, newConfig: Partial<StockPanelConfig>) => {
      onUpdatePanels(panels.map(p => p.id === id ? { ...p, ...newConfig } : p));
  };

  // Grid Config
  const gridCols = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }[layout.columns] || 'grid-cols-3';

  return (
    <div className={clsx(
        "p-4 min-h-screen transition-all", 
        !layout.fullscreenPanelId ? `grid ${gridCols} gap-4` : "block"
    )}>
      {panels.map((panel) => {
          // If in fullscreen mode, only show the maximized panel
          if (layout.fullscreenPanelId && layout.fullscreenPanelId !== panel.id) return null;

          const isMaximized = layout.fullscreenPanelId === panel.id;

          return (
            <div
                key={panel.id}
                draggable={!isMaximized}
                onDragStart={(e) => handleDragStart(e, panel.id)}
                onDragOver={(e) => handleDragOver(e, panel.id)}
                className={clsx(
                    "relative",
                    isMaximized ? "h-screen w-full" : (layout.dense ? "h-48" : "h-96")
                )}
            >
                <StockPanel 
                    config={panel}
                    timezone={timezone}
                    isMaximized={isMaximized}
                    onRemove={() => removePanel(panel.id)}
                    onMaximize={() => handleMaximize(panel.id)}
                    onUpdateConfig={(c) => updatePanelConfig(panel.id, c)}
                    dense={layout.dense}
                />
            </div>
          );
      })}
      
      {panels.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <p>No charts added. Add a ticker to start monitoring.</p>
          </div>
      )}
    </div>
  );
};
