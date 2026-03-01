import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ArrowUp, ArrowDown, Eye, EyeOff, Save, RotateCcw, Settings } from 'lucide-react';
import { LayoutConfig, LayoutComponentId } from '../types';
import { COMPONENT_NAMES, DEFAULT_LAYOUT } from '../constants';

interface LayoutSettingsModalProps {
  layout: LayoutConfig;
  onSave: (newLayout: LayoutConfig) => void;
  onClose: () => void;
}

export function LayoutSettingsModal({ layout, onSave, onClose }: LayoutSettingsModalProps) {
  const [currentOrder, setCurrentOrder] = useState<LayoutComponentId[]>(layout.order);
  const [hiddenItems, setHiddenItems] = useState<LayoutComponentId[]>(layout.hidden);

  // Sync with props when modal opens
  useEffect(() => {
    setCurrentOrder(layout.order);
    setHiddenItems(layout.hidden);
  }, [layout]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setCurrentOrder(newOrder);
  };

  const toggleVisibility = (id: LayoutComponentId) => {
    if (hiddenItems.includes(id)) {
      setHiddenItems(hiddenItems.filter(item => item !== id));
    } else {
      setHiddenItems([...hiddenItems, id]);
    }
  };

  const handleSave = () => {
    onSave({
      order: currentOrder,
      hidden: hiddenItems
    });
    onClose();
  };

  const handleReset = () => {
    setCurrentOrder(DEFAULT_LAYOUT.order);
    setHiddenItems(DEFAULT_LAYOUT.hidden);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2rem] shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-500" />
            首页布局设置
          </h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-stone-500 mb-4">调整首页模块的显示顺序和可见性</p>
          
          <div className="space-y-3">
            {currentOrder.map((id, index) => (
              <div 
                key={id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  hiddenItems.includes(id) 
                    ? 'bg-stone-50 border-stone-100 opacity-60' 
                    : 'bg-white border-stone-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-400">
                    {index + 1}
                  </div>
                  <span className="font-bold text-stone-700">{COMPONENT_NAMES[id]}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleVisibility(id)}
                    className={`p-2 rounded-lg transition-colors ${
                      hiddenItems.includes(id) ? 'text-stone-400 hover:bg-stone-200' : 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100'
                    }`}
                    title={hiddenItems.includes(id) ? "显示" : "隐藏"}
                  >
                    {hiddenItems.includes(id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  
                  <div className="w-px h-4 bg-stone-200 mx-1" />
                  
                  <button 
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === currentOrder.length - 1}
                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-between gap-3">
          <button 
            onClick={handleReset}
            className="px-4 py-2 rounded-xl font-medium text-stone-500 hover:bg-stone-200 transition-colors flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 rounded-xl font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> 保存布局
          </button>
        </div>
      </motion.div>
    </div>
  );
}
