import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, CheckCircle, Clock, Users, 
  Target, TrendingUp, Calendar, AlertCircle, X,
  Heart, FileText
} from 'lucide-react';

type Goal = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  creator: string;
  assignee: string;
  signature: string;
};

type FilterType = '全部' | '进行中' | '已完成';

const STORAGE_KEY = 'family_goals_data';
const ROLES = ['爸爸', '妈妈', '姐姐', '妹妹'];

export default function App() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [filter, setFilter] = useState<FilterType>('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  // Statistics
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.progress >= 100).length;
  const activeGoals = totalGoals - completedGoals;
  const completionRate = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

  // Filtered Goals
  const filteredGoals = goals.filter(g => {
    if (filter === '进行中') return g.progress < 100;
    if (filter === '已完成') return g.progress >= 100;
    return true;
  });

  const handleAddProgress = (id: string) => {
    setGoals(goals.map(g => {
      if (g.id === id) {
        const newProgress = Math.min(g.progress + 10, 100);
        return { ...g, progress: newProgress };
      }
      return g;
    }));
  };

  const handleDelete = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    setIsDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const handleSaveGoal = (goalData: Omit<Goal, 'id'>) => {
    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? { ...goalData, id: g.id } : g));
    } else {
      const newGoal: Goal = {
        ...goalData,
        id: crypto.randomUUID()
      };
      setGoals([...goals, newGoal]);
    }
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setGoalToDelete(id);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-stone-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <Heart className="w-6 h-6 fill-current" />
            <h1 className="text-xl font-bold tracking-tight">家庭目标</h1>
          </div>
          <button 
            onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新建目标</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<Target className="w-6 h-6 text-blue-500" />}
            title="总目标数"
            value={totalGoals.toString()}
            bg="bg-blue-50"
          />
          <StatCard 
            icon={<TrendingUp className="w-6 h-6 text-orange-500" />}
            title="进行中"
            value={activeGoals.toString()}
            bg="bg-orange-50"
          />
          <StatCard 
            icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
            title="完成率"
            value={`${completionRate}%`}
            bg="bg-emerald-50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
          {(['全部', '进行中', '已完成'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                filter === f 
                  ? 'bg-stone-800 text-white' 
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <Target className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-1">未找到目标</h3>
            <p className="text-stone-500">
              {filter === '全部' ? "开始创建一个新的家庭目标吧！" : `当前没有${filter}的目标。`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredGoals.map(goal => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  onAddProgress={() => handleAddProgress(goal.id)}
                  onEdit={() => openEditModal(goal)}
                  onDelete={() => openDeleteModal(goal.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <GoalModal 
            goal={editingGoal} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleSaveGoal} 
          />
        )}
        {isDeleteModalOpen && (
          <DeleteConfirmModal
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={() => goalToDelete && handleDelete(goalToDelete)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, title, value, bg }: { icon: React.ReactNode, title: string, value: string, bg: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
      <div className={`p-4 rounded-xl ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-stone-500">{title}</p>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}

function GoalCard({ goal, onAddProgress, onEdit, onDelete }: { goal: Goal, onAddProgress: () => void, onEdit: () => void, onDelete: () => void }) {
  const isCompleted = goal.progress >= 100;
  
  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(goal.endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isOverdue = diffDays < 0 && !isCompleted;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${
        isCompleted ? 'border-emerald-200' : isOverdue ? 'border-red-200' : 'border-stone-200'
      }`}
    >
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900 mb-1 flex items-center gap-2">
              {goal.name}
              {isCompleted && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            </h3>
            <p className="text-sm text-stone-500 line-clamp-2">{goal.description}</p>
          </div>
          <div className="flex gap-1 ml-4">
            <button onClick={onEdit} className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors cursor-pointer">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Users className="w-4 h-4 text-stone-400" />
            <span>创建人: {goal.creator || '未知'} | 责任人: {goal.assignee || '未知'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <FileText className="w-4 h-4 text-stone-400" />
            <span>承诺签名: {goal.signature || '未签署'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>{goal.startDate} 至 {goal.endDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            {isCompleted ? (
              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 已完成</span>
            ) : isOverdue ? (
              <span className="text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> 已逾期 {Math.abs(diffDays)} 天</span>
            ) : (
              <span className="text-orange-600 flex items-center gap-1"><Clock className="w-4 h-4" /> 剩余 {diffDays} 天</span>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-auto">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-stone-700">进度</span>
            <span className={isCompleted ? 'text-emerald-600' : 'text-stone-700'}>{goal.progress}%</span>
          </div>
          <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
      
      {!isCompleted && (
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
          <button 
            onClick={onAddProgress}
            className="w-full py-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 增加 10% 进度
          </button>
        </div>
      )}
    </motion.div>
  );
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal | null, onClose: () => void, onSave: (g: Omit<Goal, 'id'>) => void }) {
  const [name, setName] = useState(goal?.name || '');
  const [description, setDescription] = useState(goal?.description || '');
  
  // Default dates
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(goal?.startDate || todayStr);
  const [endDate, setEndDate] = useState(goal?.endDate || nextMonthStr);
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [creator, setCreator] = useState(goal?.creator || '爸爸');
  const [assignee, setAssignee] = useState(goal?.assignee || '爸爸');
  const [signature, setSignature] = useState(goal?.signature || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      startDate,
      endDate,
      progress,
      creator,
      assignee,
      signature
    });
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
          <h2 className="text-xl font-bold text-stone-800">{goal ? '编辑目标' : '新建家庭目标'}</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="goal-form" onSubmit={handleSubmit} className="space-y-5">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">创建人</label>
                <select 
                  value={creator} onChange={e => setCreator(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">责任人</label>
                <select 
                  value={assignee} onChange={e => setAssignee(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-sm text-orange-800 mb-3 font-medium">
                承诺书：我明确此任务的责任，并承诺按时按要求完成任务。
              </p>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">签署姓名</label>
                <input 
                  required type="text" value={signature} onChange={e => setSignature(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  placeholder="请输入您的姓名以确认"
                />
              </div>
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

function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">删除目标？</h3>
        <p className="text-stone-500 mb-6">此操作无法撤销。您确定要删除这个家庭目标吗？</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm cursor-pointer">
            删除
          </button>
        </div>
      </motion.div>
    </div>
  );
}
