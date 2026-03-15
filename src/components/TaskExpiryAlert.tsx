import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { Goal } from '../types';

export function TaskExpiryAlert({ goals, onClose }: { goals: Goal[], onClose: () => void }) {
  const expiringGoals = goals.filter(g => {
    if (g.progress >= 100) return false;
    const today = new Date();
    const start = new Date(g.startDate);
    const end = new Date(g.endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    if (total <= 0) return false;
    const ratio = elapsed / total;
    return ratio >= 0.8 && ratio < 1.1; // 80% consumed but not too far overdue
  });

  if (expiringGoals.length === 0) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-red-500 text-white overflow-hidden relative"
    >
      <div className="flex items-center h-10">
        <div className="flex-shrink-0 px-4 bg-red-600 h-full flex items-center gap-2 z-10">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-bold whitespace-nowrap">紧急提醒</span>
        </div>
        <div className="flex-grow overflow-hidden relative h-full flex items-center">
          <div className="whitespace-nowrap animate-marquee flex items-center gap-8">
            {expiringGoals.map(g => (
              <span key={g.id} className="text-sm font-medium">
                任务「{g.name}」时间已消耗超过 80%，请抓紧时间完成！
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {expiringGoals.map(g => (
              <span key={`${g.id}-dup`} className="text-sm font-medium">
                任务「{g.name}」时间已消耗超过 80%，请抓紧时间完成！
              </span>
            ))}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="flex-shrink-0 px-4 hover:bg-red-600 h-full flex items-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </motion.div>
  );
}
