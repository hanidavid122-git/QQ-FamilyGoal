import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Profile } from '../types';
import { UserAvatar } from './UserAvatar';
import { Clock, ChevronDown, ChevronUp, History } from 'lucide-react';

interface RecentActivityProps {
  activities: Activity[];
  profiles: Profile[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function RecentActivity({ activities, profiles, isExpanded, onToggle }: RecentActivityProps) {
  if (activities.length === 0) return null;

  const latest = activities[0];
  const displayActivities = isExpanded ? activities : [latest];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return '👋';
      case 'danmaku': return '💬';
      case 'goal_created': return '🎯';
      case 'goal_completed': return '✅';
      default: return '🔔';
    }
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-stone-100 overflow-hidden transition-all duration-300 shadow-sm">
      <div 
        onClick={onToggle}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-stone-500">
          <History className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">最近动态</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-500">
              <UserAvatar role={latest.user} profiles={profiles} className="w-5 h-5 text-[10px]" />
              <span className="text-xs text-stone-600 font-medium truncate max-w-[150px]">
                {latest.user} {latest.content}
              </span>
              <span className="text-[10px] text-stone-400">{formatTime(latest.date)}</span>
            </div>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 pt-2">
              {activities.map((activity, idx) => (
                <motion.div 
                  key={activity.id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 group"
                >
                  <UserAvatar role={activity.user} profiles={profiles} className="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-800">{activity.user}</span>
                      <span className="text-xs text-stone-500">{getActivityIcon(activity.type)} {activity.content}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.date)}
                    </div>
                  </div>
                </motion.div>
              ))}
              {activities.length > 10 && (
                <p className="text-center text-[10px] text-stone-400 pt-2">仅显示最近 50 条动态</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
