import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Goal, Priority } from '../types';
import { ROLES, PRIORITIES } from '../constants';
import { getLocalDateString } from '../utils/goalUtils';

interface GoalModalProps {
  goal: Goal | null;
  currentUser: string;
  onClose: () => void;
  onSave: (g: Omit<Goal, 'id'>) => void;
}

export function GoalModal({ goal, currentUser, onClose, onSave }: GoalModalProps) {
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [type, setType] = useState<'personal' | 'family'>(goal?.type || 'personal');
  
  const todayStr = getLocalDateString(new Date());
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = getLocalDateString(nextWeek);

  const [startDate, setStartDate] = useState(goal?.startDate || todayStr);
  const [endDate, setEndDate] = useState(goal?.endDate || nextWeekStr);
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [creator] = useState(goal?.creator || currentUser);
  const [assignees, setAssignees] = useState<string[]>(goal?.assignees || (goal?.assignee ? [goal.assignee] : [currentUser === '管理员' ? '爸爸' : currentUser]));
  const [signature] = useState(goal?.signature || '');
  const [priority, setPriority] = useState<Priority>(goal?.priority || '中');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProgress = progress === 100 && (!goal || !goal.completedAt) ? 99 : progress;
    onSave({
      name,
      description,
      startDate,
      endDate,
      progress: finalProgress,
      creator,
      assignees: assignees.length > 0 ? assignees : ['爸爸'],
      assignee: assignees[0] || '爸爸', // fallback for old data
      signature,
      priority,
      type
    });
  };

  const toggleAssignee = (role: string) => {
    if (assignees.includes(role)) {
      setAssignees(assignees.filter(r => r !== role));
    } else {
      setAssignees([...assignees, role]);
    }
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
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-800">{goal ? '编辑目标' : '新建目标'}</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="goal-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">目标类型</label>
              <div className="flex gap-3">
                {(['personal', 'family'] as const).map(t => (
                  <label key={t} className={`flex-1 flex items-center justify-center py-2 rounded-xl border cursor-pointer transition-colors ${
                    type === t 
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="goalType" 
                      value={t} 
                      checked={type === t} 
                      onChange={() => setType(t)} 
                      className="sr-only" 
                    />
                    <span className="font-medium text-sm">{t === 'personal' ? '个人目标' : '家庭目标'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">目标名称</label>
              <input 
                required type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="例如：存钱去迪士尼"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">描述</label>
              <textarea 
                required value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                placeholder="我们想要实现什么？"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">开始日期</label>
                <input 
                  required type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">结束日期</label>
                <input 
                  required type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">快捷选择时长</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1天', days: 1 },
                  { label: '3天', days: 3 },
                  { label: '1周', days: 7 },
                  { label: '半个月', days: 15 },
                  { label: '1个月', days: 30 }
                ].map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      const start = new Date(startDate);
                      const end = new Date(start);
                      end.setDate(start.getDate() + opt.days);
                      setEndDate(getLocalDateString(end));
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">优先级</label>
              <div className="flex gap-3">
                {PRIORITIES.map(p => (
                  <label key={p} className={`flex-1 flex items-center justify-center py-2 rounded-xl border cursor-pointer transition-colors ${
                    priority === p 
                      ? (p === '高' ? 'bg-red-50 border-red-200 text-red-700' : p === '中' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700')
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="priority" 
                      value={p} 
                      checked={priority === p} 
                      onChange={() => setPriority(p as Priority)} 
                      className="sr-only" 
                    />
                    <span className="font-medium text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">责任人 (即确认人，可多选)</label>
              <div className="flex flex-wrap gap-3">
                {ROLES.map(r => (
                  <label key={r} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                    assignees.includes(r) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-stone-200 text-stone-600'
                  }`}>
                    <input 
                      type="checkbox" 
                      checked={assignees.includes(r)} 
                      onChange={() => toggleAssignee(r)} 
                      className="w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500" 
                    />
                    <span className="font-medium text-sm">{r}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-stone-400 italic">注：责任人负责执行任务，并在完成后负责最终确认。团队目标有额外加分。</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1 flex justify-between">
                <span>当前进度</span>
                <span className="text-orange-600">{progress}%</span>
              </label>
              <input 
                type="range" min="0" max="100" step="10" value={progress} onChange={e => setProgress(parseInt(e.target.value))}
                className="w-full accent-orange-500 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl font-medium text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer">
            取消
          </button>
          <button type="submit" form="goal-form" className="px-5 py-2 rounded-xl font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm cursor-pointer">
            保存目标
          </button>
        </div>
      </motion.div>
    </div>
  );
}
